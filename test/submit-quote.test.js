import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import handler, {
  validateQuoteInput,
  checkRateLimit,
  resetRateLimits,
  getEnv,
  extractClientIp
} from '../netlify/functions/submit-quote.js';

describe('Submit Quote - Validation Logic', () => {
  test('validates correct form submission data', () => {
    const data = {
      name: 'Thato Nhlapo',
      email: 'thato@example.com',
      phone: '065 940 3451',
      service: 'Building & Renovations',
      message: 'Need complete renovation of commercial warehouse office.'
    };
    const result = validateQuoteInput(data);
    assert.equal(result.isValid, true);
    assert.equal(result.sanitized.name, 'Thato Nhlapo');
    assert.equal(result.sanitized.email, 'thato@example.com');
    assert.equal(result.sanitized.phone, '065 940 3451');
    assert.equal(result.sanitized.service, 'Building & Renovations');
  });

  test('fails if name is missing or too short', () => {
    const r1 = validateQuoteInput({ name: '  ', email: 'test@example.com', message: 'Hello world here is my message' });
    assert.equal(r1.isValid, false);
    assert.ok(r1.errors.name);

    const r2 = validateQuoteInput({ name: 'A', email: 'test@example.com', message: 'Hello world here is my message' });
    assert.equal(r2.isValid, false);
    assert.ok(r2.errors.name);
  });

  test('fails if email is invalid or missing', () => {
    const r1 = validateQuoteInput({ name: 'Valid Name', email: 'notanemail', message: 'Need maintenance service for plant' });
    assert.equal(r1.isValid, false);
    assert.ok(r1.errors.email);

    const r2 = validateQuoteInput({ name: 'Valid Name', email: '', message: 'Need maintenance service for plant' });
    assert.equal(r2.isValid, false);
    assert.ok(r2.errors.email);
  });

  test('validates optional phone number when present', () => {
    const r1 = validateQuoteInput({
      name: 'Valid Name',
      email: 'ok@example.com',
      phone: '123', // too short
      message: 'Need maintenance service for plant'
    });
    assert.equal(r1.isValid, false);
    assert.ok(r1.errors.phone);

    const r2 = validateQuoteInput({
      name: 'Valid Name',
      email: 'ok@example.com',
      phone: '+27 65 940 3451',
      message: 'Need maintenance service for plant'
    });
    assert.equal(r2.isValid, true);
  });

  test('fails if message is too short or missing', () => {
    const r1 = validateQuoteInput({ name: 'Valid Name', email: 'test@example.com', message: 'too short' });
    assert.equal(r1.isValid, false);
    assert.ok(r1.errors.message);

    const r2 = validateQuoteInput({ name: 'Valid Name', email: 'test@example.com', message: '' });
    assert.equal(r2.isValid, false);
    assert.ok(r2.errors.message);
  });
});

describe('Submit Quote - Rate Limiting (5 req / sec)', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  test('allows up to 5 requests per second per IP and blocks the 6th', () => {
    const ip = '192.168.1.50';
    const options = { windowMs: 1000, maxRequests: 5 };

    // First 5 requests must be allowed
    for (let i = 1; i <= 5; i++) {
      const res = checkRateLimit(ip, options);
      assert.equal(res.allowed, true, `Request ${i} should be allowed`);
      assert.equal(res.remaining, 5 - i);
    }

    // 6th request must be rejected
    const blocked = checkRateLimit(ip, options);
    assert.equal(blocked.allowed, false, '6th request must be blocked');
    assert.equal(blocked.remaining, 0);
    assert.ok(blocked.retryAfterSeconds >= 1);

    // Another IP should still be allowed
    const otherIp = '10.0.0.1';
    const otherRes = checkRateLimit(otherIp, options);
    assert.equal(otherRes.allowed, true, 'Different IP should be allowed');
  });
});

describe('Submit Quote - Handler API Flow', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  test('rejects non-POST methods with 405 Method Not Allowed', async () => {
    const req = new Request('http://localhost/api/submit-quote', {
      method: 'GET'
    });
    const res = await handler(req, {});
    assert.equal(res.status, 405);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  test('returns 422 if validation fails', async () => {
    const req = new Request('http://localhost/api/submit-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', email: 'bad', message: '' })
    });
    const res = await handler(req, { ip: '127.0.0.9' });
    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.errors.name);
    assert.ok(body.errors.email);
    assert.ok(body.errors.message);
  });

  test('handles honeypot botcheck silently without sending email', async () => {
    const req = new Request('http://localhost/api/submit-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botcheck: 'true',
        name: 'Spam Bot',
        email: 'bot@spam.com',
        message: 'Buy our spam products now!'
      })
    });
    const res = await handler(req, { ip: '127.0.0.10' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
  });

  test('successfully processes valid form submission and uses default support@9sevengroup.com', async () => {
    const req = new Request('http://localhost/api/submit-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Client Test',
        email: 'client@test.com',
        phone: '011 555 1234',
        service: 'Maintenance Services',
        message: 'Looking for a regular maintenance contract for our office facility.'
      })
    });
    const res = await handler(req, { ip: '127.0.0.11' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
  });

  test('enforces rate limiting at handler level (5 requests pass, 6th returns 429)', async () => {
    const clientIp = '203.0.113.199';
    const payload = {
      name: 'Burst Tester',
      email: 'burst@test.com',
      service: 'Artisan Services',
      message: 'Quick burst testing message for rate limit.'
    };

    // Requests 1 to 5
    for (let i = 1; i <= 5; i++) {
      const req = new Request('http://localhost/api/submit-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-nf-client-connection-ip': clientIp
        },
        body: JSON.stringify(payload)
      });
      const res = await handler(req, { ip: clientIp });
      assert.equal(res.status, 200, `Request ${i} should return 200`);
    }

    // Request 6 must return 429
    const burstReq = new Request('http://localhost/api/submit-quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-nf-client-connection-ip': clientIp
      },
      body: JSON.stringify(payload)
    });
    const blockedRes = await handler(burstReq, { ip: clientIp });
    assert.equal(blockedRes.status, 429);
    assert.equal(blockedRes.headers.get('Retry-After'), '1');
    const blockedBody = await blockedRes.json();
    assert.equal(blockedBody.success, false);
    assert.ok(blockedBody.error.includes('Too many requests'));
  });
});
