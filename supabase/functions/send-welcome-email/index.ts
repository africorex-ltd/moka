import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM = Deno.env.get('EMAIL_FROM') ?? 'Moka <welcome@moka.africorex.com>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, email } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'email required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const firstName = (name ?? '').split(' ')[0] || 'Farmer'

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Welcome to Moka</title>
</head>
<body style="margin:0;padding:0;background:#F4F7F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7F0;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#2D5016;border-radius:20px 20px 0 0;padding:40px 48px;text-align:center;">
              <div style="font-size:42px;font-weight:900;color:white;letter-spacing:-1px;">Moka</div>
              <div style="font-size:15px;color:#8FBA78;margin-top:6px;">Smart Farm Companion</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:white;padding:48px;border-radius:0 0 20px 20px;">
              <h1 style="font-size:26px;font-weight:700;color:#1A3009;margin:0 0 8px;">
                Welcome, ${firstName}! 🌿
              </h1>
              <p style="font-size:16px;color:#4A5540;line-height:1.7;margin:0 0 32px;">
                You're now part of the Moka family. We're excited to help you manage
                your farm smarter — from tracking milk production to managing your herd
                and staying on top of your finances.
              </p>

              <!-- Feature cards -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="padding:4px;">
                    <div style="background:#F4F7F0;border-radius:14px;padding:20px;">
                      <div style="font-size:22px;margin-bottom:8px;">🐄</div>
                      <div style="font-weight:700;color:#1A3009;font-size:15px;margin-bottom:4px;">Herd Management</div>
                      <div style="color:#4A5540;font-size:13px;line-height:1.5;">Track every cow — health, breeding, production, calves.</div>
                    </div>
                  </td>
                </tr>
                <tr><td style="height:10px;"></td></tr>
                <tr>
                  <td style="padding:4px;">
                    <div style="background:#F4F7F0;border-radius:14px;padding:20px;">
                      <div style="font-size:22px;margin-bottom:8px;">🥛</div>
                      <div style="font-weight:700;color:#1A3009;font-size:15px;margin-bottom:4px;">Milk Records</div>
                      <div style="color:#4A5540;font-size:13px;line-height:1.5;">Log daily production and see trends with beautiful charts.</div>
                    </div>
                  </td>
                </tr>
                <tr><td style="height:10px;"></td></tr>
                <tr>
                  <td style="padding:4px;">
                    <div style="background:#F4F7F0;border-radius:14px;padding:20px;">
                      <div style="font-size:22px;margin-bottom:8px;">📊</div>
                      <div style="font-weight:700;color:#1A3009;font-size:15px;margin-bottom:4px;">P&L Reports</div>
                      <div style="color:#4A5540;font-size:13px;line-height:1.5;">Know exactly where your farm stands financially, every month.</div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:40px;">
                <tr>
                  <td align="center">
                    <a href="moka://onboarding" style="display:inline-block;background:#2D5016;color:white;font-weight:700;font-size:16px;text-decoration:none;padding:16px 40px;border-radius:14px;">
                      Get Started →
                    </a>
                  </td>
                </tr>
              </table>

              <hr style="border:none;border-top:1px solid #E5E7EB;margin-bottom:28px;">

              <p style="font-size:13px;color:#9CA3AF;line-height:1.6;margin:0;">
                If you have any questions, reply to this email and we'll help you out.
                <br>The Moka team — built by farmers, for farmers.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px;text-align:center;">
              <p style="font-size:12px;color:#9CA3AF;margin:0;">
                © ${new Date().getFullYear()} Africorex Ltd · Nairobi, Kenya
                <br>You received this email because you created a Moka account.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: `Welcome to Moka, ${firstName}! 🌿`,
        html,
      }),
    })

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
