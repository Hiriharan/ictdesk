import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { subject, body, recipients } = req.body || {};
  if (!subject || !body) return res.status(400).json({ error: 'Subject and body required' });

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!RESEND_API_KEY) return res.status(500).json({ error: 'Resend not configured' });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let emails = [];

  try {
    if (recipients === 'all') {
      // All email leads
      const { data: leads } = await supabase.from('email_leads').select('email').eq('subscribed', true);
      emails = (leads || []).map(l => l.email);
    } else if (recipients === 'free' || recipients === 'pro' || recipients === 'max') {
      // App users by tier
      const { data: profiles } = await supabase.from('profiles').select('email').eq('tier', recipients);
      emails = (profiles || []).map(p => p.email).filter(Boolean);
    }

    if (!emails.length) return res.status(200).json({ ok: true, count: 0 });

    // Send in batches of 50
    let sent = 0;
    for (const email of emails.slice(0, 500)) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'ICT Desk <noreply@ictdesk.vercel.app>',
            to: email,
            subject,
            html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0c0f;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px">
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:12px;letter-spacing:3px;color:#d4a843;text-transform:uppercase;font-family:monospace">ICT DESK</div>
    </div>
    <div style="background:#111318;border:1px solid #2a2f3d;border-radius:8px;padding:32px">
      <div style="color:#e8eaf0;font-size:15px;line-height:1.8;white-space:pre-wrap">${body}</div>
      <div style="margin-top:24px;padding-top:20px;border-top:1px solid #2a2f3d;text-align:center">
        <a href="https://ictdesk.vercel.app" style="display:inline-block;background:#7a5c1e;border:1px solid #d4a843;color:#f0c060;padding:10px 24px;border-radius:4px;text-decoration:none;font-size:13px;letter-spacing:1px;text-transform:uppercase">Open ICT Desk</a>
      </div>
    </div>
    <div style="text-align:center;margin-top:24px">
      <p style="color:#555e75;font-size:11px">© 2026 ICT Desk · <a href="https://ictdesk.vercel.app" style="color:#d4a843;text-decoration:none">ictdesk.vercel.app</a></p>
      <p style="color:#555e75;font-size:11px">For educational purposes only.</p>
    </div>
  </div>
</body>
</html>`
          })
        });
        sent++;
      } catch(e) { console.error('Email failed for', email, e); }
    }

    return res.status(200).json({ ok: true, count: sent });
  } catch(e) {
    console.error('Promo email error:', e);
    return res.status(500).json({ error: e.message });
  }
}
