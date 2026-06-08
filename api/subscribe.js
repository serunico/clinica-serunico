/**
 * Ser Único — Brevo Form Submission Handler
 * Vercel Serverless Function: /api/subscribe
 *
 * Environment variables (Vercel → Project → Settings → Environment Variables):
 *   BREVO_API_KEY   — Brevo → Settings → API Keys
 *   BREVO_LIST_ID   — numeric ID of your "Leads Ser Único" list
 *   CLINIC_EMAIL    — geral@ser-unico.com
 */

module.exports = async function handler(req, res) {
  // Allow CORS from your own domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const data = req.body || {};
  const email = data.email || data.EMAIL;

  if (!email) return res.status(400).json({ error: 'Email required' });

  const apiKey  = process.env.BREVO_API_KEY;
  const listId  = parseInt(process.env.BREVO_LIST_ID || '1', 10);
  const clinicEmail = process.env.CLINIC_EMAIL || 'geral@ser-unico.com';

  if (!apiKey) {
    console.error('BREVO_API_KEY not set in environment variables');
    return res.status(200).json({ ok: true, warning: 'API key not configured' });
  }

  // Build attributes — only include fields that have values
  const attributes = {};
  const fields = {
    FIRSTNAME:   data.FIRSTNAME,
    TELEFONE:    data.TELEFONE,
    CHILD_AGE:   data.CHILD_AGE,
    CONCERN:     data.CONCERN,
    QUIZ_BUCKET: data.QUIZ_BUCKET,
    QUIZ_SCORE:  data.QUIZ_SCORE,
    SOURCE:      data.SOURCE,
    INTEREST:    data.INTEREST,
  };
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      attributes[k] = k === 'QUIZ_SCORE' ? Number(v) : String(v);
    }
  });

  // ── 1. Add or update contact in Brevo ──────────────────────────
  try {
    const r = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email,
        attributes,
        listIds: [listId],
        updateEnabled: true,
      }),
    });

    const body = await r.text();
    console.log('Brevo contact response:', r.status, body);
  } catch (err) {
    console.error('Brevo contact error:', err.message);
  }

  // ── 2. Send internal alert for priority leads ───────────────────
  const source = attributes.SOURCE || '';
  const bucket = attributes.QUIZ_BUCKET || '';
  const isPriority =
    source === 'Contact Form' ||
    source === 'Pricing Modal' ||
    (source === 'Quiz' && (bucket === 'high' || bucket === 'urgent'));

  if (isPriority) {
    const label =
      bucket === 'urgent'        ? '🚨 URGENTE' :
      bucket === 'high'          ? '⚠️ PRIORITÁRIO' :
      source === 'Pricing Modal' ? '💜 PEDIDO VALORES' :
                                   '📩 CONTACTO';

    const text =
      `${label} — Novo lead do website\n\n` +
      `Nome: ${attributes.FIRSTNAME || 'não fornecido'}\n` +
      `Email: ${email}\n` +
      `Telefone: ${attributes.TELEFONE || 'não fornecido'}\n` +
      `Origem: ${source}\n` +
      (bucket ? `Resultado quiz: ${bucket}\n` : '') +
      (data.message ? `\nMensagem:\n${data.message}\n` : '') +
      `\nAÇÃO: Contactar nas próximas 24 horas.`;

    try {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Ser Único Website', email: clinicEmail },
          to: [{ email: clinicEmail }],
          subject: `${label} — ${attributes.FIRSTNAME || email} (${source})`,
          textContent: text,
        }),
      });
    } catch (err) {
      console.error('Notification email error:', err.message);
    }
  }

  return res.status(200).json({ ok: true });
};
