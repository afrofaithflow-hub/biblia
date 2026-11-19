// BiblIA — Edge Function: payment-webhook
// Fase 5.2 — Webhook seguro do Stripe (HMAC SHA-256 via Web Crypto API)
// Deno runtime — sem npm packages
// Assinatura: Antigravity AI Engine | Africa/Maputo

import { createClient } from "npm:@supabase/supabase-js@2";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ─── Verificação da assinatura Stripe (HMAC SHA-256) ─────────────────────────
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  try {
    const parts = sigHeader.split(",");
    let timestamp = "";
    const signatures: string[] = [];

    for (const part of parts) {
      if (part.startsWith("t=")) timestamp = part.slice(2);
      if (part.startsWith("v1=")) signatures.push(part.slice(3));
    }

    if (!timestamp || signatures.length === 0) return false;

    // Tolera até 5 minutos de desfasamento de relógio
    const tsNum = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - tsNum) > 300) {
      console.error("Stripe webhook: timestamp fora da janela de 5 minutos");
      return false;
    }

    const signedPayload = `${timestamp}.${payload}`;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(signedPayload));
    const computed = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return signatures.some((sig) => sig === computed);
  } catch (err) {
    console.error("verifyStripeSignature error:", err);
    return false;
  }
}

// ─── Mapeamento Stripe price_id → tier ───────────────────────────────────────
function tierFromPriceId(priceId: string): number {
  const premiumPrice = Deno.env.get("STRIPE_PRICE_PREMIUM") ?? "";
  const masterPrice  = Deno.env.get("STRIPE_PRICE_MASTER")  ?? "";
  if (priceId === premiumPrice) return 1;
  if (priceId === masterPrice)  return 2;
  return 1; // fallback
}

// ─── Handler principal ────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sigHeader = req.headers.get("stripe-signature") ?? "";
  const rawBody   = await req.text();

  // 1. Verificar assinatura
  const valid = await verifyStripeSignature(rawBody, sigHeader, STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    console.error("Assinatura Stripe inválida");
    return new Response(JSON.stringify({ error: "Assinatura inválida" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const eventId   = event.id as string;
  const eventType = event.type as string;
  const eventObj  = event.data as { object: Record<string, unknown> };
  const obj       = eventObj?.object ?? {};

  console.log(`[payment-webhook] Evento recebido: ${eventType} (${eventId})`);

  // 2. Cliente Supabase com service_role (nunca exposto ao cliente)
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // 3. Idempotência — verificar se já processámos este evento
  const { data: existing, error: lookupErr } = await admin
    .from("payment_webhook_events")
    .select("id")
    .eq("stripe_event_id", eventId)
    .maybeSingle();

  if (lookupErr) {
    console.error("Erro ao verificar idempotência:", lookupErr);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (existing) {
    console.log(`[payment-webhook] Evento duplicado ignorado: ${eventId}`);
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 4. Registar evento antes de processar
  const { error: insertErr } = await admin
    .from("payment_webhook_events")
    .insert({
      stripe_event_id: eventId,
      event_type: eventType,
      payload: event,
      processed: false,
    });

  if (insertErr) {
    console.error("Erro ao registar evento:", insertErr);
    // Continuar mesmo assim — melhor processar do que perder
  }

  // 5. Processar evento
  try {
    await handleStripeEvent(admin, eventType, obj);

    // Marcar como processado
    await admin
      .from("payment_webhook_events")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("stripe_event_id", eventId);

    console.log(`[payment-webhook] Evento processado com sucesso: ${eventType}`);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`[payment-webhook] Erro ao processar ${eventType}:`, err);
    return new Response(JSON.stringify({ error: "Erro ao processar evento" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// ─── Despachador de eventos ───────────────────────────────────────────────────
async function handleStripeEvent(
  admin: ReturnType<typeof createClient>,
  eventType: string,
  obj: Record<string, unknown>
) {
  switch (eventType) {
    // ── Checkout concluído ────────────────────────────────────────────────────
    case "checkout.session.completed": {
      const userId      = (obj.metadata as Record<string, string>)?.user_id;
      const tier        = parseInt((obj.metadata as Record<string, string>)?.tier ?? "1", 10);
      const customerId  = obj.customer as string;
      const subId       = obj.subscription as string;
      const periodEnd   = obj.current_period_end as number | undefined;

      if (!userId) {
        console.error("checkout.session.completed: user_id em falta nos metadados");
        return;
      }

      const { error } = await admin.rpc("apply_subscription_event", {
        p_user_id:              userId,
        p_plan_tier:            tier,
        p_status:               "active",
        p_stripe_customer_id:   customerId ?? null,
        p_stripe_subscription_id: subId ?? null,
        p_cancel_at_period_end: false,
        p_current_period_end:   periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null,
      });
      if (error) throw error;
      break;
    }

    // ── Pagamento de fatura bem-sucedido ─────────────────────────────────────
    case "invoice.payment_succeeded": {
      const subId     = obj.subscription as string;
      const lines     = (obj as Record<string, unknown>).lines as { data: Array<{ price: { id: string }; period: { end: number } }> };
      const lineItem  = lines?.data?.[0];
      const priceId   = lineItem?.price?.id ?? "";
      const periodEnd = lineItem?.period?.end;
      const tier      = tierFromPriceId(priceId);

      // Localizar utilizador pelo stripe_subscription_id
      const { data: sub } = await admin
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", subId)
        .maybeSingle();

      if (!sub?.user_id) {
        console.warn("invoice.payment_succeeded: subscrição não encontrada para", subId);
        return;
      }

      const { error } = await admin.rpc("apply_subscription_event", {
        p_user_id:                sub.user_id,
        p_plan_tier:              tier,
        p_status:                 "active",
        p_stripe_customer_id:     null,
        p_stripe_subscription_id: subId,
        p_cancel_at_period_end:   false,
        p_current_period_end:     periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null,
      });
      if (error) throw error;
      break;
    }

    // ── Pagamento de fatura falhado ───────────────────────────────────────────
    case "invoice.payment_failed": {
      const subId = obj.subscription as string;

      const { data: sub } = await admin
        .from("subscriptions")
        .select("user_id, plan_tier")
        .eq("stripe_subscription_id", subId)
        .maybeSingle();

      if (!sub?.user_id) {
        console.warn("invoice.payment_failed: subscrição não encontrada para", subId);
        return;
      }

      const { error } = await admin.rpc("apply_subscription_event", {
        p_user_id:                sub.user_id,
        p_plan_tier:              sub.plan_tier ?? 0,
        p_status:                 "past_due",
        p_stripe_customer_id:     null,
        p_stripe_subscription_id: subId,
        p_cancel_at_period_end:   false,
        p_current_period_end:     null,
      });
      if (error) throw error;
      break;
    }

    // ── Subscrição atualizada (cancelamento agendado) ─────────────────────────
    case "customer.subscription.updated": {
      const cancelAtPeriodEnd = obj.cancel_at_period_end as boolean;
      if (!cancelAtPeriodEnd) {
        // Atualização sem cancelamento — ignorar por agora
        break;
      }
      const subId     = obj.id as string;
      const periodEnd = obj.current_period_end as number;

      const { data: sub } = await admin
        .from("subscriptions")
        .select("user_id, plan_tier")
        .eq("stripe_subscription_id", subId)
        .maybeSingle();

      if (!sub?.user_id) {
        console.warn("customer.subscription.updated: subscrição não encontrada para", subId);
        return;
      }

      const { error } = await admin.rpc("apply_subscription_event", {
        p_user_id:                sub.user_id,
        p_plan_tier:              sub.plan_tier ?? 0,
        p_status:                 "cancelled",
        p_stripe_customer_id:     null,
        p_stripe_subscription_id: subId,
        p_cancel_at_period_end:   true,
        p_current_period_end:     periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null,
      });
      if (error) throw error;
      break;
    }

    // ── Subscrição terminada / expirada ───────────────────────────────────────
    case "customer.subscription.deleted": {
      const subId = obj.id as string;

      const { data: sub } = await admin
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", subId)
        .maybeSingle();

      if (!sub?.user_id) {
        console.warn("customer.subscription.deleted: subscrição não encontrada para", subId);
        return;
      }

      const { error } = await admin.rpc("apply_subscription_event", {
        p_user_id:                sub.user_id,
        p_plan_tier:              0,
        p_status:                 "expired",
        p_stripe_customer_id:     null,
        p_stripe_subscription_id: subId,
        p_cancel_at_period_end:   false,
        p_current_period_end:     null,
      });
      if (error) throw error;
      break;
    }

    default:
      console.log(`[payment-webhook] Evento ignorado: ${eventType}`);
  }
}
