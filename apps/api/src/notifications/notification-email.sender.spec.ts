import * as nodemailer from 'nodemailer';
import { NotificationEmailSender } from './notification-email.sender';
import { SmtpConfigService } from '../mail/smtp-config.service';
jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
describe('notification SMTP adapter', () => {
  function fixture(port = 587) {
    const config = {
      smtpEnabled: true,
      smtpServer: 'smtp.test',
      smtpPort: port,
      smtpEmailUser: 'apikey',
      smtpEmailPassword: 'test-only',
      fromEmail: 'sender@purposemint.org',
      smtpBcc: 'do-not-copy@purposemint.org',
    };
    const sendMail = jest
        .fn()
        .mockResolvedValue({ accepted: ['customer@purposemint.org'] }),
      close = jest.fn();
    jest
      .mocked(nodemailer.createTransport)
      .mockReturnValue({ sendMail, close } as unknown as ReturnType<
        typeof nodemailer.createTransport
      >);
    const sender = new NotificationEmailSender({
      getConfig: () => Promise.resolve(config),
    } as unknown as SmtpConfigService);
    return { config, sender, sendMail, close };
  }
  beforeEach(() => jest.clearAllMocks());
  it('uses encrypted plain text and excludes shared BCC', async () => {
    const f = fixture();
    await f.sender.send('customer@purposemint.org', 'Hello', 'Private message');
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ secure: false, requireTLS: true }),
    );
    const call = f.sendMail.mock.calls[0] as unknown[],
      mail = call[0] as Record<string, unknown>;
    expect(mail.text).toBe('Private message');
    expect(mail.bcc).toBeUndefined();
    expect(mail.html).toBeUndefined();
    expect(mail.disableFileAccess).toBe(true);
    expect(mail.disableUrlAccess).toBe(true);
    expect(f.close).toHaveBeenCalled();
  });
  it('uses implicit TLS on port 465', async () => {
    const f = fixture(465);
    await f.sender.send('customer@purposemint.org', 'Hello', 'Body');
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ secure: true }),
    );
  });
  it('includes trusted template HTML alongside plain text', async () => {
    const f = fixture();
    await f.sender.send(
      'customer@purposemint.org',
      'Check in',
      'Plain fallback',
      '<p>Trusted template</p>',
    );
    expect(f.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: '<p>Trusted template</p>',
        text: 'Plain fallback',
      }),
    );
  });
  it('marks a definitive temporary SMTP rejection as safe to retry', async () => {
    const f = fixture();
    f.sendMail.mockRejectedValue({ code: 'EENVELOPE', responseCode: 451 });
    await expect(
      f.sender.send('customer@purposemint.org', 'Hello', 'Body'),
    ).rejects.toMatchObject({ uncertain: false, retryable: true });
  });
  it('does not retry permanent SMTP rejections automatically', async () => {
    const f = fixture();
    f.sendMail.mockRejectedValue({ code: 'EENVELOPE', responseCode: 550 });
    await expect(
      f.sender.send('customer@purposemint.org', 'Hello', 'Body'),
    ).rejects.toMatchObject({ uncertain: false, retryable: false });
  });
  it('does not count an unaccepted recipient as sent', async () => {
    const f = fixture();
    f.sendMail.mockResolvedValue({ accepted: [] });
    await expect(
      f.sender.send('customer@purposemint.org', 'Hello', 'Body'),
    ).rejects.toMatchObject({ uncertain: false });
  });
  it('sanitizes provider credential errors', async () => {
    const f = fixture();
    f.sendMail.mockRejectedValue({
      code: 'EAUTH',
      message: 'secret-provider-debug',
    });
    await expect(
      f.sender.send('customer@purposemint.org', 'Hello', 'Body'),
    ).rejects.toMatchObject({
      uncertain: false,
      message:
        'SMTP rejected the email. Check sender configuration and recipient.',
    });
  });
  it('keeps timeouts uncertain to prevent duplicate delivery', async () => {
    const f = fixture();
    f.sendMail.mockRejectedValue({ code: 'ETIMEDOUT' });
    await expect(
      f.sender.send('customer@purposemint.org', 'Hello', 'Body'),
    ).rejects.toMatchObject({ uncertain: true });
  });
  it('does not send when disabled', async () => {
    const f = fixture();
    f.config.smtpEnabled = false;
    expect(await f.sender.ready()).toBe(false);
    await expect(
      f.sender.send('customer@purposemint.org', 'Hello', 'Body'),
    ).rejects.toThrow();
    expect(f.sendMail).not.toHaveBeenCalled();
  });
});
