// BiblIA — Edge Function: payment-checkout
// Fase 5.3 — Criação de sessão Stripe Checkout (autenticada via JWT)
// Deno runtime — sem npm packages
// Assinatura: Antigravity AI Engine | Africa/Maputo

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL             = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_SECRET_KEY        = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_PRICE_PREMIUM     = Deno.env.get("STRIPE_PRICE_PREMIUM") ?? "";
const STRIPE_PRICE_MASTER      = Deno.env.get("STRIPE_PRICE_MASTER") ?? "";
const APP_URL                  = Deno.env.get("APP_URL") ?? "https://biblia.vercel.app";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: corsHeaders(),
    });
  }

  // 1. Autenticar utilizador via JWT (Bearer token)
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401,
      headers: corsHeaders(),
    });
  }

  const jwt = authHeader.slice(7);

  // Cliente com chave anon para verificar o JWT
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Token inválido ou expirado" }), {
      status: 401,
      headers: corsHeaders(),
    });
  }

  // 2. Ler tier do body
  let tier: number;
  try {
    const body = await req.json();
    tier = parseInt(body.tier, 10);
    if (![1, 2].includes(tier)) throw new Error("tier inválido");
  } catch {
    return new Response(JSON.stringify({ error: "Body inválido. Esperado: { tier: 1 | 2 }" }), {
      status: 400,
      headers: corsHeaders(),
    });
  }

  // 3. Obter email do utilizador (perfil)
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const customerEmail    = profile?.email ?? user.email ?? "";
  const existingCustomer = profile?.stripe_customer_id ?? null;

  // 4. Mapear tier → Stripe price_id
  const priceId = tier === 2 ? STRIPE_PRICE_MASTER : STRIPE_PRICE_PREMIUM;
  if (!priceId) {
    return new Response(
      JSON.stringify({ error: "Preço Stripe não configurado. Contacte o suporte." }),
      { status: 500, headers: corsHeaders() }
    );
  }

  // 5. Criar sessão Stripe Checkout via REST API
  const stripePayload = new URLSearchParams({
    "mode": "subscription",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    "success_url": `${APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    "cancel_url":  `${APP_URL}/checkout/cancel`,
    "metadata[user_id]": user.id,
    "metadata[tier]": String(tier),
    "subscription_data[metadata][user_id]": user.id,
    "subscription_data[metadata][tier]": String(tier),
  });

  if (customerEmail)    stripePayload.set("customer_email", customerEmail);
  if (existingCustomer) stripePayload.set("customer", existingCustomer);

  let checkoutUrl: string;
  try {
    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: stripePayload.toString(),
    });

    const stripeData = await stripeRes.json();
    if (!stripeRes.ok) {
      console.error("Stripe API error:", stripeData);
      return new Response(
        JSON.stringify({ error: stripeData.error?.message ?? "Erro Stripe" }),
        { status: 500, headers: corsHeaders() }
      );
    }

    checkoutUrl = stripeData.url;
  } catch (err) {
    console.error("Erro ao chamar Stripe:", err);
    return new Response(JSON.stringify({ error: "Erro de rede ao contactar Stripe" }), {
      status: 502,
      headers: corsHeaders(),
    });
  }

  console.log(`[payment-checkout] Sessão criada para user=${user.id} tier=${tier}`);
  return new Response(JSON.stringify({ checkout_url: checkoutUrl }), {
    status: 200,
    headers: corsHeaders(),
  });
});
