import { createHmac } from 'node:crypto';

export function signWebhookPayload(payload, secret) {
  const jsonString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const hmac = createHmac('sha256', secret);
  hmac.update(jsonString);
  return `sha256=${hmac.digest('hex')}`;
}

export function verifyWebhookSignature(payload, signatureHeader, secret) {
  const expected = signWebhookPayload(payload, secret);
  return expected === signatureHeader;
}

export async function dispatchWebhook(url, payload, secret, fetchFn = fetch) {
  const body = JSON.stringify(payload);
  const signature = signWebhookPayload(body, secret);

  const res = await fetchFn(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RelayDesk-Signature': signature,
      'X-RelayDesk-Event': payload.event || 'request.updated'
    },
    body
  });

  return { ok: res.ok, status: res.status };
}
