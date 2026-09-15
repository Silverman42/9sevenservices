/**
 * Netlify Serverless Function: submit-quote
 * Handles quote requests from the 9Seven Group website.
 * Features:
 * - In-memory sliding-window rate limiting (default 5 req/sec)
 * - Bot honeypot detection
 * - Robust input validation and sanitization
 * - Email dispatch to RECIPIENT_EMAIL (default: support@9sevengroup.com)
 */

// In-memory rate limiting state
const rateLimitCache = new Map();

// Helper to get environment variables across Netlify & standard Node environments
export function getEnv(key, fallback = '') {
  if (typeof Netlify !== 'undefined' && Netlify.env && typeof Netlify.env.get === 'function') {
    const val = Netlify.env.get(key);
    if (val !== undefined && val !== null && val !== '') return val;
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return fallback;
}

/**
 * Check if the request is within the allowed rate limit.
 * Default: 5 requests per 1000ms (1 second).
 */
export function checkRateLimit(ip, options = {}) {
  const windowMs = Number(options.windowMs ?? getEnv('RATE_LIMIT_WINDOW_MS', '1000'));
  const maxRequests = Number(options.maxRequests ?? getEnv('RATE_LIMIT_MAX_REQUESTS', '5'));
  const now = Date.now();

  // Periodically clean cache entries older than 2 * windowMs
  if (rateLimitCache.size > 10000) {
    for (const [key, timestamps] of rateLimitCache.entries()) {
      if (timestamps.length === 0 || now - timestamps[timestamps.length - 1] > windowMs * 2) {
        rateLimitCache.delete(key);
      }
    }
  }

  const timestamps = rateLimitCache.get(ip) || [];
  const recent = timestamps.filter(t => now - t < windowMs);

  if (recent.length >= maxRequests) {
    const oldest = recent[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    rateLimitCache.set(ip, recent);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  recent.push(now);
  rateLimitCache.set(ip, recent);
  return {
    allowed: true,
    remaining: maxRequests - recent.length,
    retryAfterSeconds: 0,
  };
}

// Reset rate limit state (useful for tests)
export function resetRateLimits() {
  rateLimitCache.clear();
}

/**
 * Validate quote form input fields.
 */
export function validateQuoteInput(data) {
  const errors = {};

  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
  const service = typeof data.service === 'string' ? data.service.trim() : '';
  const message = typeof data.message === 'string' ? data.message.trim() : '';

  // Name validation
  if (!name) {
    errors.name = 'Full name is required.';
  } else if (name.length < 2) {
    errors.name = 'Name must be at least 2 characters long.';
  } else if (name.length > 100) {
    errors.name = 'Name must be less than 100 characters.';
  }

  // Email validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!email) {
    errors.email = 'Email address is required.';
  } else if (email.length > 254 || !emailRegex.test(email)) {
    errors.email = 'Please provide a valid email address.';
  }

  // Phone validation (optional)
  if (phone) {
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{5,20}$/;
    if (!phoneRegex.test(phone) || phone.replace(/\D/g, '').length < 7) {
      errors.phone = 'Please provide a valid phone number (at least 7 digits).';
    } else if (phone.length > 25) {
      errors.phone = 'Phone number is too long.';
    }
  }

  // Service validation
  const validServices = [
    'Building & Renovations',
    'Maintenance Services',
    'Mechanical Engineering',
    'Artisan Services',
    'Motor Mechanics',
    'Facilities & Cleaning',
    'Supply & Procurement',
    'Catering & General Services',
    'Other / Not Sure'
  ];
  if (service && !validServices.includes(service) && service.length > 100) {
    errors.service = 'Invalid service selection.';
  }

  // Message validation
  if (!message) {
    errors.message = 'Message is required.';
  } else if (message.length < 10) {
    errors.message = 'Message must be at least 10 characters long.';
  } else if (message.length > 3000) {
    errors.message = 'Message must be 3,000 characters or fewer.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      name,
      email,
      phone: phone || 'Not provided',
      service: service || 'Other / Not Sure',
      message
    }
  };
}

/**
 * Dispatch notification email to the configured recipient.
 */
export async function sendNotificationEmail({ name, email, phone, service, message, clientIp }) {
  const recipient = getEnv('RECIPIENT_EMAIL', 'support@9sevengroup.com');
  const subject = `New Quote Request: ${service} — ${name}`;

  const textBody = `
New Quote Request Received
--------------------------
From: ${name} <${email}>
Phone: ${phone}
Service: ${service}
Client IP: ${clientIp || 'Unknown'}
Submitted At: ${new Date().toISOString()}

Message:
${message}
--------------------------
Sent via 9Seven Group Website
`.trim();

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Quote Request</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f5f1; margin: 0; padding: 24px; color: #1f2122;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e0ded8;">
    <tr>
      <td style="background-color: #17181a; padding: 24px 32px; color: #ffffff;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">9SEVEN GROUP</h2>
        <p style="margin: 6px 0 0; font-size: 14px; color: #d84339; font-weight: 600;">New Quote Request</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 14px;">
          <tr>
            <td width="30%" style="color: #6d7175; font-weight: 600;">Client Name:</td>
            <td style="color: #1f2122; font-weight: 600;">${escapeHtml(name)}</td>
          </tr>
          <tr>
            <td style="color: #6d7175; font-weight: 600;">Email:</td>
            <td><a href="mailto:${escapeHtml(email)}" style="color: #c41e2e; text-decoration: none;">${escapeHtml(email)}</a></td>
          </tr>
          <tr>
            <td style="color: #6d7175; font-weight: 600;">Phone:</td>
            <td style="color: #1f2122;">${escapeHtml(phone)}</td>
          </tr>
          <tr>
            <td style="color: #6d7175; font-weight: 600;">Service:</td>
            <td style="color: #1f2122;"><strong>${escapeHtml(service)}</strong></td>
          </tr>
          <tr>
            <td style="color: #6d7175; font-weight: 600;">IP Address:</td>
            <td style="color: #6d7175;">${escapeHtml(clientIp || 'Unknown')}</td>
          </tr>
        </table>
        <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #eee;">
          <h4 style="margin: 0 0 10px; font-size: 14px; color: #17181a;">Project Scope & Details:</h4>
          <div style="background: #faf9f6; padding: 16px; border-radius: 8px; border: 1px solid #ebe9e1; font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: #2d3032;">${escapeHtml(message)}</div>
        </div>
      </td>
    </tr>
    <tr>
      <td style="background-color: #faf9f6; padding: 16px 32px; border-top: 1px solid #e0ded8; font-size: 12px; color: #73787e; text-align: center;">
        Direct reply to: <a href="mailto:${escapeHtml(email)}" style="color: #c41e2e;">${escapeHtml(email)}</a> · 9Seven Group (Pty) Ltd
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  // 1. Resend API
  const resendApiKey = getEnv('RESEND_API_KEY');
  if (resendApiKey) {
    const fromAddress = getEnv('RESEND_FROM') || getEnv('SMTP_FROM') || '9Seven Group <onboarding@resend.dev>';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [recipient],
        reply_to: email,
        subject,
        text: textBody,
        html: htmlBody
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[submit-quote] Resend API error:', errText);
      throw new Error(`Failed to send email via Resend: ${res.statusText}`);
    }
    return { provider: 'resend', success: true };
  }

  // 2. Web3Forms relay fallback (if access key available)
  const web3formsKey = getEnv('WEB3FORMS_ACCESS_KEY');
  if (web3formsKey) {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        access_key: web3formsKey,
        subject,
        from_name: name,
        replyto: email,
        to: recipient,
        name,
        email,
        phone,
        service,
        message
      })
    });
    const result = await res.json();
    if (!result.success) {
      console.error('[submit-quote] Web3Forms relay error:', result);
      throw new Error(result.message || 'Failed to send via Web3Forms');
    }
    return { provider: 'web3forms', success: true };
  }

  // 3. Fallback / development simulation
  console.log(`[submit-quote] Email notification dispatched to ${recipient}:`);
  console.log(`Subject: ${subject}`);
  console.log(`Payload:\n${textBody}`);
  return { provider: 'console_mock', recipient, success: true };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Extract Client IP from HTTP headers or Netlify Context.
 */
export function extractClientIp(req, context = {}) {
  if (context?.ip) return context.ip;
  const headerKeys = [
    'x-nf-client-connection-ip',
    'client-ip',
    'x-forwarded-for',
    'x-real-ip'
  ];
  for (const key of headerKeys) {
    const val = req.headers?.get?.(key);
    if (val) {
      return val.split(',')[0].trim();
    }
  }
  return '127.0.0.1';
}

/**
 * Netlify Function Default Export
 */
export default async function handler(req, context) {
  // 1. Method restriction (only POST allowed)
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method Not Allowed' }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Allow': 'POST'
        }
      }
    );
  }

  // 2. Rate Limiting: 5 requests per second
  const clientIp = extractClientIp(req, context);
  const rateLimit = checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Too many requests. Please wait a moment and try again.'
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  // 3. Parse incoming body (supports JSON, FormData, or URL-encoded)
  let body = {};
  const contentType = req.headers?.get?.('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries());
    } else {
      try {
        body = await req.json();
      } catch {
        const text = await req.text();
        const params = new URLSearchParams(text);
        body = Object.fromEntries(params.entries());
      }
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid request body format.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // 4. Honeypot check (botcheck)
  if (body.botcheck) {
    // Return success to confuse bots without sending any email
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Thanks — your request has been sent. We’ll be in touch shortly.'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // 5. Input validation
  const validation = validateQuoteInput(body);
  if (!validation.isValid) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Please correct the errors in the form.',
        errors: validation.errors
      }),
      {
        status: 422,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // 6. Send email notification
  try {
    await sendNotificationEmail({
      ...validation.sanitized,
      clientIp
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Thanks — your request has been sent. We’ll be in touch shortly.'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (err) {
    console.error('[submit-quote] Failed to process email dispatch:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unable to deliver your quote request at this moment. Please email us directly at support@9sevengroup.com.'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export const config = {
  path: '/api/submit-quote'
};
