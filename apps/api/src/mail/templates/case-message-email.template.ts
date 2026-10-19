interface CaseMessageParams {
  firstName: string;
  caseNumber: number;
  subject: string;
  body: string;
}

export function buildCaseMessageEmailHtml(params: CaseMessageParams): string {
  const paragraphs = params.body
    .split(/\n{2,}/)
    .map(
      (block) =>
        '<p style="color:#475569;line-height:1.6;margin:0 0 14px">' +
        escapeHtml(block).replace(/\n/g, '<br>') +
        '</p>',
    )
    .join('');
  return (
    '<!doctype html><html lang="en"><body style="margin:0;background:#f0fdf4;' +
    'font-family:Segoe UI,Tahoma,sans-serif"><table role="presentation" width="100%" ' +
    'cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">' +
    '<table role="presentation" width="100%" style="max-width:560px;background:#fff;' +
    'border-radius:18px;border:1px solid #d1fae5"><tr><td style="padding:24px 30px;' +
    'background:#047857;color:#fff;border-radius:18px 18px 0 0;font-size:25px;' +
    'font-weight:800">PurposeMint</td></tr><tr><td style="padding:32px 30px">' +
    '<h1 style="margin:0 0 12px;color:#064e3b;font-size:22px">' +
    escapeHtml(params.subject) +
    '</h1><p style="color:#475569;line-height:1.6;margin:0 0 14px">Hi ' +
    escapeHtml(params.firstName) +
    ',</p>' +
    paragraphs +
    '<p style="color:#64748b;font-size:13px;margin-top:24px">Reference: case #' +
    String(params.caseNumber) +
    '. The PurposeMint team</p></td></tr></table></td></tr></table></body></html>'
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
