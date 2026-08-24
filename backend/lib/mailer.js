const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;
const FROM_NAME = 'MahaAarogya Sangam';

async function sendMail(to, subject, html) {
  if (!SENDGRID_API_KEY || !FROM_EMAIL) {
    console.log(`\n[DEV MODE - no SENDGRID_API_KEY configured] Email to ${to}: "${subject}"\n`);
    return;
  }

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`SendGrid API error (${res.status}): ${body}`);
  }
}

export async function sendWelcomeEmail(to, name) {
  await sendMail(
    to,
    'Welcome to MahaAarogya Sangam',
    `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color:#0f5132; margin-bottom: 4px;">Welcome, ${name}!</h2>
        <p style="color:#334155;">Your account has been created and verified via your phone number.</p>
        <p style="color:#64748b; font-size: 13px;">You can now sign in anytime using your phone number and a one-time code sent by SMS.</p>
        <p style="color:#94a3b8; font-size: 11px; margin-top: 24px;">MahaAarogya Sangam — Digital Public Health Platform</p>
      </div>
    `
  );
}
