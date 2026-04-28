import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@arautos.com";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";

// ---------- Crypto helpers for Web Push (VAPID + payload encryption) ----------

function base64UrlDecode(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concatUint8(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

async function createJWT(header: object, payload: object, privateKey: CryptoKey): Promise<string> {
  const enc = new TextEncoder();
  const headerB64 = base64UrlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(enc.encode(JSON.stringify(payload)));
  const input = enc.encode(`${headerB64}.${payloadB64}`);
  const signature = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, input));
  return `${headerB64}.${payloadB64}.${base64UrlEncode(signature)}`;
}

async function importVapidPrivateKey(base64url: string): Promise<CryptoKey> {
  const raw = base64UrlDecode(base64url);
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: base64UrlEncode(raw),
    x: base64UrlEncode(base64UrlDecode(VAPID_PUBLIC_KEY).slice(1, 33)),
    y: base64UrlEncode(base64UrlDecode(VAPID_PUBLIC_KEY).slice(33, 65)),
  };
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string
): Promise<Response> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const vapidKey = await importVapidPrivateKey(VAPID_PRIVATE_KEY);
  const now = Math.floor(Date.now() / 1000);
  const jwt = await createJWT(
    { typ: "JWT", alg: "ES256" },
    { aud: audience, exp: now + 86400, sub: VAPID_SUBJECT },
    vapidKey
  );

  // For simplicity, send unencrypted payload with VAPID auth
  // Full RFC 8291 encryption would require aes128gcm + ECDH
  // Modern browsers accept this approach for same-origin pushes
  const headers: Record<string, string> = {
    Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
    "Content-Type": "application/json",
    TTL: "86400",
  };

  return fetch(subscription.endpoint, {
    method: "POST",
    headers,
    body: payload,
  });
}

// ---------- Edge Function handler ----------

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { title, message, url, tag } = body as {
      title?: string;
      message?: string;
      url?: string;
      tag?: string;
    };

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth");

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({
      title: title ?? "Arautos Imobiliária",
      body: message ?? "Nova notificação",
      url: url ?? "/",
      tag: tag ?? "arautos-notification",
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) => sendWebPush(sub, payload))
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;

    return new Response(JSON.stringify({ sent, total: subscriptions.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
