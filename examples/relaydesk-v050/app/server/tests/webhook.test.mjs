import test from 'node:test';
import assert from 'node:assert/strict';
import { signWebhookPayload, verifyWebhookSignature, dispatchWebhook } from '../src/webhook.mjs';

test('signWebhookPayload produces correct sha256 hex signature', () => {
  const secret = 'test-secret-key-123';
  const payload = { event: 'request.completed', requestId: 'REQ-101' };

  const sig = signWebhookPayload(payload, secret);
  assert.ok(sig.startsWith('sha256='));
  assert.ok(verifyWebhookSignature(payload, sig, secret));
  assert.equal(verifyWebhookSignature(payload, sig, 'wrong-secret'), false);
});

test('dispatchWebhook includes required X-RelayDesk-Signature header', async () => {
  let capturedHeaders = null;
  let capturedBody = null;

  const mockFetch = async (url, options) => {
    capturedHeaders = options.headers;
    capturedBody = options.body;
    return { ok: true, status: 200 };
  };

  const secret = 'webhook-hmac-secret';
  const payload = { event: 'request.completed', requestId: 'REQ-104' };

  const result = await dispatchWebhook('http://mock.webhook.local/receiver', payload, secret, mockFetch);
  assert.equal(result.ok, true);
  assert.ok(capturedHeaders['X-RelayDesk-Signature'].startsWith('sha256='));
  assert.equal(capturedHeaders['X-RelayDesk-Event'], 'request.completed');
});
