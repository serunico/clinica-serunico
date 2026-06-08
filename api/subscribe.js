/**
 * Ser Único — Brevo Form Submission Handler
 * Vercel Serverless Function: /api/subscribe
 *
 * Receives form data from the website, adds the contact to Brevo,
 * and sends internal notifications for priority leads.
 *
 * Environment variables to set in Vercel (Project → Settings → Environment Variables):
 *   BREVO_API_KEY   — found in Brevo → Settings → API Keys
 *   BREVO_LIST_ID   — the numeric ID of your "Leads Ser Único" list
 *   CLINIC_EMAIL    — geral@ser-unico.com (receives internal alerts)
 */

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse body
  const data = req.body;
  const email = data.email || data.EMAIL;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const listId = parseInt(process.env.BREVO_LIST_ID || '1');
  const clinicEmail = process.env.CLINIC_EMAIL || 'geral@ser-unico.com';

  if (!apiKey) {
    console.error('BREVO_API_KEY not set');
    // Still return 200 so UX doesn't break
    return res.status(200).json({ ok: true, warning: 'API key not configured' });
  }

  // Build contact attributes (only include non-empty values)
  const attributes = {};
  const fieldMap = {
    FIRSTNAME: data.FIRSTNAME || data.name,
    TELEFONE:  data.TELEFONE  || data.phone,
    CHILD_AGE: data.CHILD_AGE || data.child_age,
    CONCERN:   data.CONCERN   || data.concern,
    QUIZ_BUCKET: data.QUIZ_BUCKET || data.quiz_bucket,
    QUIZ_SCORE:  data.QUIZ_SCORE  || data.quiz_score,
    SOURCE:    data.SOURCE    || data.source,
    INTEREST:  data.INTEREST  || data.interest,
  };
  Object.entries(fieldMap).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      attributes[key] = key === 'QUIZ_SCORE' ? Number(val) : String(val);
    }
  });

  // ──────────────────────────────────────────────────────────────
  // Step 1: Create or update contact in Brevo
  // ──────────────────────────────────────────────────────────────
  try {
    const contactRes = await fetch('https://api.brevo.com/v3/contacts', {
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
        updateEnabled: true, // update if contact already exists
      }),
    });

    // 201 = created, 204 = updated, both are success
    if (!contactRes.ok && contactRes.status !== 204) {
      const err = await contactRes.json().catch(() => ({}));
      console.error('Brevo contact error:', contactRes.status, err);
    }
  } catch (err) {
    console.error('Brevo contact fetch failed:', err);
  }

  // ──────────────────────────────────────────────────────────────
  // Step 2: Internal notification for priority cases
  // Send an alert email to the clinic for:
  //   - High/Urgent diagnostic quiz results
  //   - Contact form submissions (always notify)
  //   - Pricing modal requests (warm leads)
  // ──────────────────────────────────────────────────────────────
  const source  = attributes.SOURCE || '';
  const bucket  = attributes.QUIZ_BUCKET || '';
  const isPriority = (
    source === 'Contact Form' ||
    source === 'Pricing Modal' ||
    (source === 'Quiz' && (bucket === 'high' || bucket === 'urgent'))
  );

  if (isPriority) {
    const urgencyLabel = bucket === 'urgent' ? '🚨 URGENTE' :
                         bucket === 'high'   ? '⚠️ PRIORITÁRIO' :
                         source === 'Pricing Modal' ? '💜 PEDIDO VALORES' :
                         '📩 CONTACTO';

    const messageBody = data.message || data.MESSAGE || '';
    const interest    = attributes.INTEREST || '';
    const phone       = attributes.TELEFONE || 'não fornecido';
    const name        = attributes.FIRSTNAME || email;

    const textContent =
      `${urgencyLabel} — Novo lead do website\n\n` +
      `Nome: ${name}\n` +
      `Email: ${email}\n` +
      `Telefone: ${phone}\n` +
      `Origem: ${source}\n` +
      (bucket  ? `Resultado quiz: ${bucket}\n` : '') +
      (interest ? `Interesse: ${interest}\n` : '') +
      (messageBody ? `\nMensagem:\n${messageBody}\n` : '') +
      `\n────────────────────────────────\n` +
      (bucket === 'urgent' || bucket === 'high'
        ? 'AÇÃO: Ligar nas próximas 24 horas.\n'
        : source === 'Pricing Modal'
        ? 'AÇÃO: Enviar tabela de valores por email se ainda não foi enviada automaticamente.\n'
        : 'AÇÃO: Responder por email ou ligar.\n');

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
          to:     [{ email: clinicEmail, name: 'Equipa Ser Único' }],
          subject: `${urgencyLabel} — ${name} (${source})`,
          textContent,
        }),
      });
    } catch (err) {
      console.error('Notification email failed:', err);
    }
  }

  // Always return 200 so the website UX never breaks even if Brevo has an issue
  return res.status(200).json({ ok: true });
}
