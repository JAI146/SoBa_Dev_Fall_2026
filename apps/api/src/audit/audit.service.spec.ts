import { AuditService } from './audit.service';
import { Repository } from 'typeorm';
import { AuditEvent } from '../entities/audit-event.entity';

describe('audit metadata sanitization', () => {
  const service = new AuditService({} as Repository<AuditEvent>);
  it('removes nested credentials, including array entries, without mutating input', () => {
    const input = {
      before: { password: 'private', status: 'active' },
      rows: [{ accessToken: 'private', amount: 10 }],
      authorization: 'private',
    };
    expect(service.sanitize(input)).toEqual({
      before: { status: 'active' },
      rows: [{ amount: 10 }],
    });
    expect(input.before.password).toBe('private');
  });
  it('preserves empty metadata and safe before/after fields', () => {
    expect(
      service.sanitize({ changedAt: new Date('2026-10-15T00:00:00Z') }),
    ).toEqual({ changedAt: '2026-10-15T00:00:00.000Z' });
    expect(service.sanitize(null)).toBeNull();
    expect(service.sanitize({})).toBeNull();
    expect(
      service.sanitize({ before: { active: true }, after: { active: false } }),
    ).toEqual({ before: { active: true }, after: { active: false } });
  });
});
