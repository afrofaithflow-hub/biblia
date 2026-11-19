// BiblIA — Edge Function: payment-portal
// Fase 5.3 — Portal de gestão de assinatura Stripe (autenticado via JWT)
// Deno runtime — sem npm packages
// Assinatura: Antigravity AI Engine | Africa/Maputo

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL             = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_SECRET_KEY        = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
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

  // 1. Autenticar utilizador via JWT
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401,
      headers: corsHeaders(),
    });
  }

  const jwt = authHeader.slice(7);
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

  // 2. Obter stripe_customer_id do perfil
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    return new Response(
      JSON.stringify({ error: "Nenhuma subscrição ativa encontrada. Subscreva primeiro." }),
      { status: 404, headers: corsHeaders() }
    );
  }

  // 3. Criar sessão do Stripe Customer Portal
  let portalUrl: string;
  try {
    const stripeRes = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "customer": customerId,
        "return_url": `${APP_URL}/perfil`,
      }).toString(),
    });

    const stripeData = await stripeRes.json();
    if (!stripeRes.ok) {
      console.error("Stripe Portal API error:", stripeData);
      return new Response(
        JSON.stringify({ error: stripeData.error?.message ?? "Erro Stripe" }),
        { status: 500, headers: corsHeaders() }
      );
    }

    portalUrl = stripeData.url;
  } catch (err) {
    console.error("Erro ao chamar Stripe Portal:", err);
    return new Response(JSON.stringify({ error: "Erro de rede ao contactar Stripe" }), {
      status: 502,
      headers: corsHeaders(),
    });
  }

  console.log(`[payment-portal] Sessão portal criada para user=${user.id}`);
  return new Response(JSON.stringify({ portal_url: portalUrl }), {
    status: 200,
    headers: corsHeaders(),
  });
});
