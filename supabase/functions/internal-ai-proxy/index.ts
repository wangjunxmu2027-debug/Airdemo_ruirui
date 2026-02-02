import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

const encoder = new TextEncoder();

const generateNonce = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);

const normalizeData = (data: Record<string, unknown> | null) => {
  if (!data || typeof data !== "object") return [];
  return Object.keys(data)
    .sort()
    .filter((k) => (data as Record<string, unknown>)[k] !== undefined)
    .map((k) => [k, (data as Record<string, unknown>)[k]]);
};

const signWithHmac = async (secret: string, message: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const coerceBody = (body: unknown) => {
  if (!body || typeof body !== "object") return { body, bodyData: null };
  if (body instanceof ArrayBuffer) return { body, bodyData: null };
  if (body instanceof Uint8Array) return { body, bodyData: null };
  if (typeof FormData !== "undefined" && body instanceof FormData) return { body, bodyData: null };
  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) return { body, bodyData: null };
  const json = JSON.stringify(body);
  return { body: json, bodyData: body as Record<string, unknown> };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Not Found", { status: 404, headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get("CODC_SECRET_KEY") ?? "";
    const proxyUrl = Deno.env.get("CODC_PROXY_URL") ?? "";

    if (!secret || !proxyUrl) {
      return new Response(JSON.stringify({ error: "Missing proxy configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    if (!body?.user) {
      return new Response(JSON.stringify({ error: "Missing user content" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nonce = generateNonce();
    const timestamp = Date.now().toString();
    const { body: requestBody, bodyData } = coerceBody(body);
    const dataToSign = bodyData;
    const dataSorted = normalizeData((dataToSign as Record<string, unknown>) || {});
    const message = nonce + timestamp + JSON.stringify(dataSorted);
    const signature = await signWithHmac(secret, message);

    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    headers.set("Codoc-Nonce", nonce);
    headers.set("Codoc-Timestamp", timestamp);
    headers.set("Codoc-Signature", signature);
    headers.set("Codoc-Env", "Shortcut");

    const proxyResponse = await fetch(proxyUrl, {
      method: "POST",
      headers,
      body: requestBody as BodyInit,
    });

    const text = await proxyResponse.text();
    return new Response(text, {
      status: proxyResponse.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
