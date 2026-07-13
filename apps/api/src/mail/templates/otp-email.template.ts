export function buildOtpEmailHtml(params: {
  firstName: string;
  otp: string;
  expiresMinutes: number;
}) {
  return emailLayout(
    'Verify your email',
    'Hi ' +
      escapeHtml(params.firstName) +
      ', use this one-time code to complete your PurposeMint registration.',
    params.otp,
    params.expiresMinutes,
  );
}

function emailLayout(
  title: string,
  message: string,
  otp: string,
  expiresMinutes: number,
) {
  return (
    '<!doctype html><html lang="en"><body style="margin:0;background:#f0fdf4;' +
    'font-family:Segoe UI,Tahoma,sans-serif"><table role="presentation" width="100%" ' +
    'cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">' +
    '<table role="presentation" width="100%" style="max-width:560px;background:#fff;' +
    'border-radius:18px;border:1px solid #d1fae5"><tr><td style="padding:24px 30px;' +
    'background:#047857;color:#fff;border-radius:18px 18px 0 0;font-size:25px;' +
    'font-weight:800">PurposeMint</td></tr><tr><td style="padding:32px 30px">' +
    '<h1 style="margin:0 0 12px;color:#064e3b;font-size:24px">' +
    title +
    '</h1><p style="color:#475569;line-height:1.6">' +
    message +
    '</p><div style="margin:28px 0;padding:16px;text-align:center;border-radius:12px;' +
    'background:#ecfdf5;color:#065f46;font-size:32px;font-weight:800;letter-spacing:10px">' +
    escapeHtml(otp) +
    '</div><p style="color:#64748b;font-size:14px">This code expires in ' +
    String(expiresMinutes) +
    ' minutes.</p></td></tr></table></td></tr></table></body></html>'
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
