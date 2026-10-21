/** All interpolated values are escaped. No remote images, tracking, or private content. */
export function escapeEmailHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]!,
  );
}

export function customerAppUrl(raw: string, production = false): string | null {
  try {
    const url = new URL(raw);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (
      url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && local && !production)
    )
      return null;
    if (url.username || url.password || url.search || url.hash) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** The caller supplies text, never HTML. Custom staff content is escaped as text. */
export function formattedNotificationEmail(
  subject: string,
  text: string,
): string {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(
      (paragraph) =>
        `<p style="font-size:16px;line-height:1.7;margin:0 0 18px;white-space:pre-wrap;">${escapeEmailHtml(paragraph)}</p>`,
    )
    .join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeEmailHtml(subject)}</title></head>
<body style="margin:0;background:#f5f7f8;font-family:Arial,sans-serif;color:#111827;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;">
<tr><td style="padding:28px;color:#047857;font-size:24px;font-weight:bold;">PurposeMint</td></tr>
<tr><td style="padding:0 28px 28px;"><h1 style="font-size:26px;line-height:1.4;margin:0 0 24px;">${escapeEmailHtml(subject)}</h1>${paragraphs}</td></tr></table>
</td></tr></table></body></html>`;
}

export function reengagementEmail(
  name: string | null | undefined,
  appUrl: string | null,
) {
  const greeting = name?.trim().slice(0, 100) || 'there';
  const subject = 'Your next small step with PurposeMint';
  const paragraphs = [
    `Hi ${greeting},`,
    'It has been a few days since your last visit. Whenever you are ready, PurposeMint is here to help you take your next small step.',
    'Check in on your goals, review your progress, or return to a habit that matters to you. There is no pressure to catch up or make a contribution.',
    'You can manage optional reminders and quiet hours in Notification Management in your PurposeMint app.',
  ];
  const text = `${paragraphs.join('\n\n')}\n\n${appUrl ? 'Open PurposeMint: ' + appUrl : 'Open your PurposeMint app whenever you are ready.'}\n\nThe PurposeMint team`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;background:#f5f7f8;font-family:Arial,sans-serif;color:#111827;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;">
<tr><td style="padding:28px 28px 18px;color:#047857;font-size:24px;font-weight:bold;">PurposeMint</td></tr>
<tr><td style="padding:0 28px 28px;"><h1 style="font-size:26px;line-height:1.3;margin:0 0 20px;">A small step, at your pace.</h1>
${paragraphs
  .slice(0, 3)
  .map(
    (paragraph) =>
      `<p style="font-size:16px;line-height:1.7;margin:0 0 18px;">${escapeEmailHtml(paragraph)}</p>`,
  )
  .join('')}
<p style="margin:28px 0;">${appUrl ? `<a href="${escapeEmailHtml(appUrl)}" style="display:inline-block;padding:14px 22px;background:#059669;color:#fff;text-decoration:none;border-radius:9px;font-size:16px;font-weight:bold;">Open PurposeMint</a>` : '<strong style="color:#047857;font-size:16px;">Open your PurposeMint app whenever you are ready.</strong>'}</p>
<p style="font-size:13px;line-height:1.6;color:#6b7280;">${escapeEmailHtml(paragraphs[3])}</p>
<p style="font-size:14px;color:#4b5563;">The PurposeMint team</p></td></tr></table>
<p style="max-width:560px;font-size:12px;line-height:1.6;color:#6b7280;">This is an optional check-in, not a payment request.</p>
</td></tr></table></body></html>`;
  return { subject, text, html };
}
