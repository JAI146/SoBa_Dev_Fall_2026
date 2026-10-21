import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AuditAction, AuditActorType, UserType } from '@purposemint/contracts';
import { dataSourceOptions } from '../src/database/data-source';
import { User } from '../src/entities/user.entity';
import { AuditEvent } from '../src/entities/audit-event.entity';
import { AuditService } from '../src/audit/audit.service';

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (process.env.NODE_ENV !== 'development' ||
      !['localhost', '127.0.0.1', 'db'].includes(url.hostname) ||
      url.pathname !== '/purposemint') {
    throw new Error('Only the local development database may be seeded.');
  }
  const db = new DataSource(dataSourceOptions);
  await db.initialize();
  try {
    await db.transaction(async (manager) => {
      const iris = await manager.findOneByOrFail(User, {
        email: 'iris@purposemint.local', userType: UserType.ADMIN,
      });
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['iris-audit-demo-v1']);
      const repository = manager.getRepository(AuditEvent);
      const service = new AuditService(repository);
      const actions = [
        AuditAction.ADMIN_OVERVIEW_VIEWED,
        AuditAction.ADMIN_USERS_LISTED,
        AuditAction.ADMIN_BADGES_LISTED,
        AuditAction.ADMIN_BADGE_AWARDS_LISTED,
        AuditAction.ADMIN_PATHWAY_CATALOG_VIEWED,
      ];
      let created = 0;
      for (const action of actions) {
        const existing = await repository.createQueryBuilder('event')
          .where('event.actorUserId = :id', { id: iris.id })
          .andWhere('event.action = :action', { action })
          .andWhere("event.metadata ->> 'demoBatch' = :batch", { batch: 'iris-audit-demo-v1' })
          .getCount();
        if (existing) continue;
        await service.recordTransactional(manager, {
          actorUserId: iris.id, actorType: AuditActorType.ADMIN, action,
          metadata: {
            demoBatch: 'iris-audit-demo-v1', synthetic: true,
            note: 'Local test data for hierarchy animation. Not an action performed by Iris.',
          },
        });
        created++;
      }
      console.log(`Created ${created} labeled test actions for Iris Patel; ${actions.length - created} already existed.`);
    });
  } finally {
    await db.destroy();
  }
}
void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
