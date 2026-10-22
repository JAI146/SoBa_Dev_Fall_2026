import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import {
  AdminRole,
  AuditActorType,
  AuditOutcome,
  UserType,
  UserStatus,
} from '@purposemint/contracts';
import { dataSourceOptions } from '../src/database/data-source';
import { User } from '../src/entities/user.entity';
import { AuditEvent } from '../src/entities/audit-event.entity';
import { CustomRole } from '../src/entities/custom-role.entity';
import { AuditHierarchyController } from '../src/audit/audit-hierarchy.controller';
import { hierarchyHighlights, hierarchyWarningRoutes } from '@purposemint/contracts';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';
import { AdminPermission } from '@purposemint/contracts';

async function main() {
  if (dataSourceOptions.type !== 'postgres')
    throw new Error('PostgreSQL required.');
  const url = new URL(process.env.DATABASE_URL!);
  if (
    process.env.NODE_ENV === 'production' ||
    !['localhost', '127.0.0.1', 'db'].includes(url.hostname)
  )
    throw new Error('Local database only.');
  const name = `audit_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new DataSource({ type: 'postgres', url: url.toString() });
  await admin.initialize();
  let db: DataSource | undefined;
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
    url.pathname = `/${name}`;
    db = new DataSource({
      ...dataSourceOptions,
      url: url.toString(),
      logging: false,
    });
    await db.initialize();
    await db.runMigrations();
    const users = db.getRepository(User);
    const root = await users.save({
      email: 'root@test.local',
      passwordHash: 'test-only',
      firstName: 'Root',
      lastName: 'One',
      userType: UserType.ADMIN,
      adminRole: AdminRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    });
    const manager = await users.save({
      email: 'manager@test.local',
      passwordHash: 'test-only',
      firstName: 'Manager',
      lastName: 'One',
      userType: UserType.ADMIN,
      adminRole: AdminRole.MANAGER,
      reportsToUserId: root.id,
      status: UserStatus.ACTIVE,
    });
    const child = await users.save({
      email: 'child@test.local',
      passwordHash: 'test-only',
      firstName: 'Child',
      lastName: 'One',
      userType: UserType.ADMIN,
      adminRole: AdminRole.EDITOR,
      reportsToUserId: manager.id,
      status: UserStatus.ACTIVE,
    });
    const customer = await users.save({
      email: 'customer@test.local',
      passwordHash: 'test-only',
      firstName: 'Customer',
      lastName: 'One',
      userType: UserType.CUSTOMER,
    });
    await assert.rejects(
      users.update(manager.id, { reportsToUserId: manager.id }),
    );
    await assert.rejects(
      users.update(manager.id, { reportsToUserId: child.id }),
    );
    await assert.rejects(
      users.update(root.id, { reportsToUserId: manager.id }),
    );
    await assert.rejects(
      users.update(child.id, { reportsToUserId: customer.id }),
    );
    await assert.rejects(
      users.update(customer.id, { reportsToUserId: root.id }),
    );
    await assert.rejects(
      users.update(manager.id, { userType: UserType.CUSTOMER }),
    );
    assert.equal(
      (await users.findOneByOrFail({ id: manager.id })).reportsToUserId,
      root.id,
    );
    await users.update(child.id, { adminRole: AdminRole.SUPER_ADMIN });
    assert.equal(
      (await users.findOneByOrFail({ id: child.id })).reportsToUserId,
      null,
    );
    await users.update(child.id, {
      adminRole: AdminRole.EDITOR,
      reportsToUserId: manager.id,
    });
    const events = db.getRepository(AuditEvent);
    await events.save(
      Array.from({ length: 40 }, () => ({
        actorUserId: child.id,
        actorType: AuditActorType.ADMIN,
        action: 'admin.user_viewed',
        outcome: AuditOutcome.SUCCESS,
        createdAt: new Date('2026-10-19T12:00:00Z'),
      })),
    );
    await events.save({
      actorUserId: manager.id,
      actorType: AuditActorType.ADMIN,
      action: 'admin.user_viewed',
      outcome: AuditOutcome.SUCCESS,
      createdAt: new Date('2026-10-18T12:00:00Z'),
    });
    const controller = new AuditHierarchyController(
      users,
      events,
      db.getRepository(CustomRole),
    );
    const guard = new PermissionsGuard(
      new Reflector(),
      db.getRepository(CustomRole),
    );
    for (const [role, allowed] of [
      [AdminRole.SUPER_ADMIN, true],
      [AdminRole.MANAGER, true],
      [AdminRole.AUDITOR, true],
      [AdminRole.EDITOR, false],
      [AdminRole.SUPPORT, false],
    ] as const) {
      const context = {
        getClass: () => AuditHierarchyController,
        getHandler: () => AuditHierarchyController.prototype.hierarchy,
        switchToHttp: () => ({
          getRequest: () => ({ user: { adminRole: role, customRoleId: null } }),
        }),
      } as unknown as ExecutionContext;
      if (allowed) assert.equal(await guard.canActivate(context), true);
      else await assert.rejects(guard.canActivate(context));
    }
    const custom = await db.getRepository(CustomRole).save({
      name: 'Audit custom test',
      description: 'Test only',
      permissions: [AdminPermission.AUDIT_LOGS_VIEW],
    });
    const customContext = {
      getClass: () => AuditHierarchyController,
      getHandler: () => AuditHierarchyController.prototype.hierarchy,
      switchToHttp: () => ({
        getRequest: () => ({
          user: { adminRole: null, customRoleId: custom.id },
        }),
      }),
    } as unknown as ExecutionContext;
    assert.equal(await guard.canActivate(customContext), true);
    await db.getRepository(CustomRole).update(custom.id, { permissions: [] });
    await assert.rejects(guard.canActivate(customContext));
    const filtered = await controller.hierarchy({
      action: 'admin.user_viewed',
      from: '2026-10-19',
      to: '2026-10-19',
    });
    assert.equal(
      filtered.users.find((user) => user.id === child.id)?.matchCount,
      40,
    );
    assert.equal(
      filtered.users.find((user) => user.id === manager.id)?.matchCount,
      0,
    );
    const highlights = hierarchyHighlights(filtered.users, true, '');
    assert.ok(highlights.detected.has(child.id));
    assert.ok(highlights.ancestors.has(manager.id));
    assert.ok(highlights.ancestors.has(root.id));
    const warningRoutes = hierarchyWarningRoutes(filtered.users, highlights.detected);
    assert.deepEqual(warningRoutes.get(child.id), [{ origin: child.id, step: 0, hops: 2 }]);
    assert.deepEqual(warningRoutes.get(manager.id), [{ origin: child.id, step: 1, hops: 2 }]);
    assert.equal(warningRoutes.has(root.id), false);
    assert.equal(hierarchyWarningRoutes(filtered.users, new Set([root.id])).size, 0);
    assert.equal(hierarchyWarningRoutes(filtered.users, new Set()).size, 0);
    const sharedRoutes = hierarchyWarningRoutes(filtered.users, new Set([child.id, manager.id]));
    assert.equal(sharedRoutes.get(manager.id)?.length, 2);
    assert.equal(hierarchyWarningRoutes(filtered.users.map((user) => ({ ...user, reportsToUserId: null })), new Set([child.id])).size, 0);
    const all = await controller.hierarchy({ action: 'admin.user_viewed' });
    const both = hierarchyHighlights(all.users, true, '');
    assert.ok(both.detected.has(manager.id) && both.ancestors.has(manager.id));
    assert.equal(hierarchyHighlights(all.users, false, '').detected.size, 0);
    assert.equal(
      hierarchyHighlights(all.users, true, 'Nobody').detected.size,
      0,
    );
    assert.ok(!filtered.users.some((user) => user.id === customer.id));
    assert.ok(!JSON.stringify(filtered).includes('passwordHash'));
    const addedManager = await users.save({
      email: 'new-manager@test.local',
      passwordHash: 'test-only',
      firstName: 'New Manager With A Longer Name',
      lastName: 'Two',
      userType: UserType.ADMIN,
      adminRole: AdminRole.MANAGER,
      status: UserStatus.ACTIVE,
    });
    const afterAddition = await controller.hierarchy({});
    assert.equal(afterAddition.users.length, all.users.length + 1);
    assert.equal(
      afterAddition.users.find((user) => user.id === addedManager.id)?.reportsToUserId,
      null,
    );
    await users.update(addedManager.id, { reportsToUserId: root.id });
    assert.equal(
      (await controller.hierarchy({})).users.find((user) => user.id === addedManager.id)?.reportsToUserId,
      root.id,
    );
    await users.softDelete(addedManager.id);
    assert.ok(!(await controller.hierarchy({})).users.some((user) => user.id === addedManager.id));
    assert.equal(
      (
        await controller.hierarchy({ action: 'admin.badge_created' })
      ).users.every((user) => user.matchCount === 0),
      true,
    );
    console.log(
      'Audit hierarchy integration passed: reporting constraints, complete filtered counts, customer exclusion, and safe response.',
    );
  } finally {
    if (db?.isInitialized) await db.destroy();
    await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin.destroy();
  }
}
void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
