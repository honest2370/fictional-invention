// supabase/functions/_shared/webhookDispatch.ts
// Fires registered seller webhooks for a given event. Called from
// ashtech-webhook once an order is confirmed. Failures are logged to
// webhook_deliveries but never block the caller — a slow/broken
// third-party endpoint must not delay crediting the seller or unlocking
// the buyer's purchase.

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function dispatchWebhooks(
  admin: any,
  storeId: string,
  event: string,
  payload: Record<string, unknown>,
) {
  const { data: webhooks } = await admin.from("webhooks").select("*").eq("store_id", storeId).eq("is_active", true);
  if (!webhooks || webhooks.length === 0) return;

  const relevant = webhooks.filter((w: any) => Array.isArray(w.events) && w.events.includes(event));
  for (const webhook of relevant) {
    dispatchOne(admin, webhook, event, payload).catch((e) => console.error("webhook dispatch failed", e));
  }
}

async function dispatchOne(admin: any, webhook: any, event: string, payload: Record<string, unknown>) {
  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
  const signature = await hmacSha256Hex(webhook.secret, body);

  let statusCode: number | null = null;
  let responseBody = "";
  let succeeded = false;

  try {
    const res = await fetch(webhook.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Sellizi-Signature": signature, "X-Sellizi-Event": event },
      body,
      signal: AbortSignal.timeout(8000),
    });
    statusCode = res.status;
    responseBody = (await res.text()).slice(0, 2000);
    succeeded = res.ok;
  } catch (e: any) {
    responseBody = String(e?.message || e).slice(0, 2000);
  }

  await admin.from("webhook_deliveries").insert({
    webhook_id: webhook.id, event, payload, status_code: statusCode, response_body: responseBody, succeeded,
  }).catch(() => {});
}
