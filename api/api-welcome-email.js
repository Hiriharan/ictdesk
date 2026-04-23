export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(200).json({ ok: true, note: 'No Resend key configured' });

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'ICT Desk <noreply@ictdesk.vercel.app>',
        to: email,
        subject: "You're on the ICT Desk waitlist 🚀",
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0c0f;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px">
    <div style="text-align:center;margin-bottom:32px">
      <div style="font-size:12px;letter-spacing:3px;color:#d4a843;text-transform:uppercase;font-family:monospace">ICT DESK</div>
    </div>
    <div style="background:#111318;border:1px solid #2a2f3d;border-radius:8px;padding:32px">
      <h1 style="color:#e8eaf0;font-size:24px;margin:0 0 16px;font-weight:700">You're on the list ✓</h1>
      <p style="color:#8b92a8;font-size:15px;line-height:1.7;margin:0 0 24px">
        Thanks for joining the ICT Desk waitlist. You'll be among the first to know when we launch — along with exclusive early access offers and discounts.
      </p>
      <div style="background:#0a0c0f;border:1px solid #2a2f3d;border-radius:6px;padding:20px;margin-bottom:24px">
        <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#555e75;margin-bottom:12px">What's coming</div>
        <div style="color:#e8eaf0;font-size:14px;line-height:2">
          ✓ Live ICT trading signals with entry, SL & TP<br>
          ✓ AI-powered chart analysis<br>
          ✓ Session timers & kill zone tracker<br>
          ✓ Live news calendar & confluence tools<br>
          ✓ Pro & Max subscription tiers
        </div>
      </div>
      <p style="color:#8b92a8;font-size:13px;line-height:1.7;margin:0">
        We'll reach out soon with your early access invite. In the meantime, follow our progress.
      </p>
    </div>
    <div style="text-align:center;margin-top:24px">
      <p style="color:#555e75;font-size:11px">© 2026 ICT Desk. For educational purposes only.</p>
      <p style="color:#555e75;font-size:11px;margin-top:4px">
        <a href="https://ictdesk.vercel.app" style="color:#d4a843;text-decoration:none">ictdesk.vercel.app</a>
      </p>
    </div>
  </div>
</body>
</html>`
      })
    });

    if (!r.ok) {
      const err = await r.text();
      console.error('Resend error:', err);
      return res.status(200).json({ ok: true, note: 'Email failed but lead saved' });
    }

    return res.status(200).json({ ok: true });
  } catch(e) {
    console.error('Welcome email error:', e);
    return res.status(200).json({ ok: true, note: 'Email failed but lead saved' });
  }
}
