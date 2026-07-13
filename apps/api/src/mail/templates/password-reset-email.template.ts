export function buildPasswordResetEmailHtml(params: {
  firstName: string;
  otp: string;
  expiresMinutes: number;
}) {
  const digits = params.otp.split("");
  const digitBoxes = digits
    .map(
      (digit) => `
        <td style="width:52px;height:64px;text-align:center;vertical-align:middle;
          font-size:32px;font-weight:700;color:#065f46;
          background:linear-gradient(180deg,#ecfdf5 0%,#d1fae5 100%);
          border:2px solid #6ee7b7;border-radius:12px;
          font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;
          box-shadow:0 4px 14px rgba(5,150,105,0.15);">
          ${digit}
        </td>
        <td style="width:8px;"></td>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your Muakhah password</title>
</head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0fdf4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 20px 50px rgba(6,95,70,0.12);border:1px solid #d1fae5;">
          <tr>
            <td style="padding:28px 32px;background:linear-gradient(135deg,#047857 0%,#059669 55%,#10b981 100%);">
              <div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.03em;">
                Mu<span style="color:#bbf7d0;">akhah</span>
              </div>
              <div style="margin-top:8px;font-size:14px;color:#d1fae5;">Connecting hearts through sponsorship</div>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 12px;">
              <h1 style="margin:0 0 12px;font-size:26px;line-height:1.25;color:#064e3b;letter-spacing:-0.02em;">
                Reset your password
              </h1>
              <p style="margin:0;font-size:16px;line-height:1.65;color:#475569;">
                Hi ${escapeHtml(params.firstName)}, use this one-time code to reset your Muakhah account password:
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;">
                <tr>${digitBoxes}</tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;">
                <tr>
                  <td style="padding:16px 18px;font-size:14px;line-height:1.6;color:#64748b;">
                    This code expires in <strong style="color:#047857;">${params.expiresMinutes} minutes</strong>.
                    If you did not request a password reset, you can safely ignore this email.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#94a3b8;text-align:center;">
                Need help? Reply to this email or contact our support team.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#94a3b8;">
              © ${new Date().getFullYear()} Muakhah. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
