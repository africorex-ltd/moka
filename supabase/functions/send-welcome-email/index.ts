import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = 'Moka Farm Management <noreply@moka.africorex.com>'

const MARKET_LABELS: Record<string, string> = {
  kcc:      'KCC / Dairy Co-operative',
  private:  'Private Buyers',
  retail:   'Direct to Consumers',
  multiple: 'Multiple Channels',
}

const MARKET_TIPS: Record<string, string[]> = {
  kcc:      ['Log daily milk deliveries to track your co-op submissions', 'Use the Milk Dispatch module for delivery records', 'Generate monthly milk delivery statements'],
  private:  ['Record every sale with buyer name and M-Pesa reference', 'Set individual prices per buyer in the Sales module', 'Generate professional receipts for your buyers'],
  retail:   ['Track home deliveries and farm-gate sales separately', 'Manage your customer list and delivery routes', 'Monitor daily cash collections'],
  multiple: ['Use Sales Channels to track revenue by buyer type', 'Compare performance across your different markets', 'Generate consolidated monthly reports'],
}

function emailHtml(name: string, farmName: string, email: string, milkMarket: string): string {
  const greeting = name.split(' ')[0]
  const tips = MARKET_TIPS[milkMarket] ?? MARKET_TIPS.private

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to Moka</title>
</head>
<body style="margin:0;padding:0;background:#F4F7F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7F0;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr>
    <td style="background:#2D5016;border-radius:16px 16px 0 0;padding:40px 40px 32px;text-align:center;">
      <!-- Moka Logo SVG -->
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
        <tr>
          <td style="background:#2D5016;border-radius:16px;padding:8px;">
            <svg width="56" height="56" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
              <rect width="1024" height="1024" fill="#2D5016" rx="180"/>
              <path fill="white" d="M 185,850 L 185,250 L 295,250 L 512,575 L 729,250 L 839,250 L 839,850 L 729,850 L 729,410 L 555,688 L 469,688 L 295,410 L 295,850 Z"/>
              <ellipse cx="476" cy="130" rx="44" ry="88" fill="#8FBA78" transform="rotate(-22, 476, 130)"/>
              <ellipse cx="548" cy="130" rx="44" ry="88" fill="#8FBA78" transform="rotate(22, 548, 130)"/>
              <rect x="508" y="188" width="8" height="65" rx="4" fill="#6DAA4A"/>
            </svg>
          </td>
        </tr>
      </table>
      <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:900;letter-spacing:-0.5px;">Welcome to Moka</h1>
      <p style="margin:8px 0 0;color:#8FBA78;font-size:14px;">Smart Farm Management for Kenya's Dairy Farmers</p>
    </td>
  </tr>

  <!-- Main content -->
  <tr>
    <td style="background:#ffffff;padding:40px;">

      <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1a2e0a;">Hello ${greeting}! 👋</p>
      <p style="margin:0 0 24px;font-size:15px;color:#4B6B30;line-height:1.6;">
        <strong>${farmName}</strong> is now registered on Moka. Your farm management dashboard is ready —
        let's get you set up.
      </p>

      <!-- Farm info box -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7F0;border-radius:12px;margin-bottom:28px;">
        <tr>
          <td style="padding:20px 24px;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#6DAA4A;text-transform:uppercase;letter-spacing:1px;">Your Farm Details</p>
            <p style="margin:0 0 6px;font-size:16px;font-weight:800;color:#1a2e0a;">${farmName}</p>
            <p style="margin:0;font-size:13px;color:#4B6B30;">
              Milk Market: <strong>${MARKET_LABELS[milkMarket] ?? milkMarket}</strong><br>
              Account: ${email}
            </p>
          </td>
        </tr>
      </table>

      <!-- Tips for their market -->
      <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:#1a2e0a;">
        💡 Getting started with ${MARKET_LABELS[milkMarket] ?? 'your market'}:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        ${tips.map((tip, i) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #F4F7F0;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:28px;vertical-align:top;padding-top:2px;">
                  <span style="display:inline-block;width:20px;height:20px;background:#2D5016;border-radius:50%;text-align:center;line-height:20px;font-size:10px;font-weight:800;color:#fff;">${i + 1}</span>
                </td>
                <td style="font-size:13px;color:#4B6B30;line-height:1.5;">${tip}</td>
              </tr>
            </table>
          </td>
        </tr>`).join('')}
      </table>

      <!-- Feature highlights -->
      <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:#1a2e0a;">What you can do with Moka:</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
        ${[
          ['🐄', 'Herd Management', 'Track every cow — health, breeding, calving, weight'],
          ['🥛', 'Milk Records', 'Log morning, midday & evening production per cow'],
          ['💰', 'Sales & Revenue', 'Record sales, generate P&L reports'],
          ['💊', 'Health Log', 'Vaccinations, treatments, vet visits with reminders'],
          ['📱', 'Mobile + Web', 'Use the app offline, sync when you have internet'],
        ].map(([icon, title, desc]) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #F4F7F0;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:36px;font-size:20px;vertical-align:middle;">${icon}</td>
                <td>
                  <span style="font-size:13px;font-weight:700;color:#1a2e0a;">${title}</span><br>
                  <span style="font-size:12px;color:#6B8A5A;">${desc}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>`).join('')}
      </table>

      <!-- CTA Button -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr>
          <td align="center">
            <a href="https://moka.africorex.com/dashboard"
               style="display:inline-block;background:#2D5016;color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;padding:16px 40px;border-radius:12px;letter-spacing:0.2px;">
              Open My Farm Dashboard →
            </a>
          </td>
        </tr>
      </table>

      <!-- Next steps -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8E7;border-radius:12px;margin-bottom:24px;">
        <tr>
          <td style="padding:18px 22px;">
            <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#92400E;">⚡ First things to do:</p>
            <p style="margin:0;font-size:12px;color:#78350F;line-height:1.8;">
              1. Complete your farm profile and upload your logo<br>
              2. Add your cows in the Herd section<br>
              3. Log your first milk record<br>
              4. Download the Moka mobile app for offline use
            </p>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:13px;color:#6B8A5A;line-height:1.6;">
        Need help? Reply to this email or contact us at
        <a href="mailto:support@africorex.com" style="color:#2D5016;font-weight:600;">support@africorex.com</a>
      </p>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#F4F7F0;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;border-top:1px solid #E2EDD6;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#2D5016;">Moka — Smart Farm Management</p>
      <p style="margin:0;font-size:11px;color:#6B8A5A;">
        Africorex Ltd · Kenya<br>
        <a href="https://moka.africorex.com" style="color:#4B6B30;">moka.africorex.com</a>
      </p>
      <p style="margin:12px 0 0;font-size:10px;color:#9BB87A;">
        You received this because you signed up for Moka. This is a one-time welcome email.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

serve(async (req) => {
  // Allow CORS for browser calls
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    const body = await req.json()
    const { full_name, farm_name, email, milk_market } = body

    if (!email) {
      return new Response(JSON.stringify({ error: 'email is required' }), { status: 400 })
    }

    if (!RESEND_API_KEY) {
      console.log('RESEND_API_KEY not set — skipping welcome email for', email)
      return new Response(JSON.stringify({ skipped: true, reason: 'RESEND_API_KEY not configured' }), { status: 200 })
    }

    const html = emailHtml(full_name ?? email, farm_name ?? 'My Farm', email, milk_market ?? 'private')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: `Welcome to Moka, ${farm_name ?? 'farmer'}! 🐄 Your farm dashboard is ready.`,
        html,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Resend error:', data)
      return new Response(JSON.stringify({ error: data }), { status: 500 })
    }

    return new Response(JSON.stringify({ sent: true, id: data.id }), { status: 200 })

  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
