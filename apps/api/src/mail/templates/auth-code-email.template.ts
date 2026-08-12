interface CodeEmailParams {
  firstName: string;
  otp: string;
  expiresMinutes: number;
}

export function buildVerificationEmailHtml(params: CodeEmailParams): string {
  return codeEmailLayout({
    ...params,
    title: "Let's confirm your email",
    intro: 'Here’s the code that finishes setting up your PurposeMint account.',
    closing:
      "Didn't sign up? You can ignore this — nothing happens without the code.",
  });
}

export function buildPasswordResetEmailHtml(params: CodeEmailParams): string {
  return codeEmailLayout({
    ...params,
    title: 'Your password reset code',
    intro: 'Here’s the code for setting a new PurposeMint password.',
    closing:
      "Didn't ask for this? You can ignore this email — your password stays exactly as it is.",
  });
}

function codeEmailLayout(params: CodeEmailParams & {
  title: string;
  intro: string;
  closing: string;
}): string {
  return (
    '<!doctype html><html lang="en"><body style="margin:0;background:#f0fdf4;' +
    'font-family:Segoe UI,Tahoma,sans-serif"><table role="presentation" width="100%" ' +
    'cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">' +
    '<table role="presentation" width="100%" style="max-width:560px;background:#fff;' +
    'border-radius:18px;border:1px solid #d1fae5"><tr><td style="padding:24px 30px;' +
    'background:#047857;color:#fff;border-radius:18px 18px 0 0;font-size:25px;' +
    'font-weight:800">PurposeMint</td></tr><tr><td style="padding:32px 30px">' +
    '<h1 style="margin:0 0 12px;color:#064e3b;font-size:24px">' +
    escapeHtml(params.title) +
    '</h1><p style="color:#475569;line-height:1.6">Hi ' +
    escapeHtml(params.firstName) +
    ', ' +
    escapeHtml(params.intro) +
    '</p><div style="margin:28px 0;padding:16px;text-align:center;border-radius:12px;' +
    'background:#ecfdf5;color:#065f46;font-size:32px;font-weight:800;letter-spacing:10px">' +
    escapeHtml(params.otp) +
    '</div><p style="color:#64748b;font-size:14px">This code works for the next ' +
    String(params.expiresMinutes) +
    ' minutes. If it runs out, just ask for another.</p>' +
    '<p style="color:#64748b;font-size:14px">' +
    escapeHtml(params.closing) +
    '</p></td></tr></table></td></tr></table></body></html>'
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
