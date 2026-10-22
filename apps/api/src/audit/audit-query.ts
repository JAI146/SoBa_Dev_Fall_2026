import { BadRequestException } from '@nestjs/common';
import { auditQuerySchema } from '@purposemint/contracts';
import type { SelectQueryBuilder } from 'typeorm';
import { AuditEvent } from '../entities/audit-event.entity';

export function filteredAuditQuery(
  qb: SelectQueryBuilder<AuditEvent>,
  raw: unknown,
) {
  const parsed = auditQuerySchema.safeParse(raw);
  if (!parsed.success) throw new BadRequestException('Invalid audit filters.');
  const query = parsed.data;
  for (const key of ['action', 'outcome', 'actorUserId', 'entityId'] as const) {
    if (query[key])
      qb.andWhere(`CAST(event.${key} AS text) = :${key}`, {
        [key]: query[key],
      });
  }
  for (const [key, operator] of [
    ['from', '>='],
    ['to', '<='],
  ] as const) {
    const value = query[key];
    if (!value) continue;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value
    )
      throw new BadRequestException('Invalid calendar date.');
    qb.andWhere(`event.createdAt ${operator} :${key}`, {
      [key]: `${value}T${key === 'from' ? '00:00:00.000' : '23:59:59.999'}Z`,
    });
  }
  if (query.from && query.to && query.from > query.to)
    throw new BadRequestException('Start date must precede end date.');
  return query;
}
