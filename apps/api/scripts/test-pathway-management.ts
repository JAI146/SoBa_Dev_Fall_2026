import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import {
  AdminPermission,
  AdminRole,
  AuditAction,
  ChecklistCategory,
  Tier,
  UserType,
  UserStatus,
  partnerCatalogInputSchema,
  partnerCatalogUpdateSchema,
  pathwayCatalogUpdateSchema,
} from '@purposemint/contracts';
import { dataSourceOptions } from '../src/database/data-source';
import { SEEDED_PATHWAYS } from '../src/database/pathways-seed-data';
import { AuditService } from '../src/audit/audit.service';
import { AuditEvent } from '../src/entities/audit-event.entity';
import { User } from '../src/entities/user.entity';
import { Pathway } from '../src/entities/pathway.entity';
import { Partner } from '../src/entities/partner.entity';
import { CustomRole } from '../src/entities/custom-role.entity';
import { PathwayApplication } from '../src/entities/pathway-application.entity';
import { PathwayChecklistItem } from '../src/entities/pathway-checklist-item.entity';
import { ChecklistTemplate } from '../src/entities/checklist-template.entity';
import { PathwayManagementService } from '../src/pathway-management/pathway-management.service';
import { PathwayManagementController } from '../src/pathway-management/pathway-management.controller';
import { PathwaysService } from '../src/pathways/pathways.service';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';
import type { AuthPrincipal } from '../src/auth/auth-principal';

async function main() {
  if (
    dataSourceOptions.type !== 'postgres' ||
    process.env.NODE_ENV === 'production'
  )
    throw new Error('Local PostgreSQL only.');
  const url = new URL(process.env.DATABASE_URL!);
  if (!['localhost', '127.0.0.1', 'db'].includes(url.hostname))
    throw new Error('Local database only.');
  const name = `purposemint_pathways_test_${randomUUID().replaceAll('-', '')}`;
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
    const staff = await db
      .getRepository(User)
      .save({
        email: 'pathway-admin@purposemint.local',
        firstName: 'Admin',
        lastName: 'Test',
        passwordHash: 'test-only',
        userType: UserType.ADMIN,
        adminRole: AdminRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
      });
    const customer = await db
      .getRepository(User)
      .save({
        email: 'pathway-user@purposemint.local',
        firstName: 'Customer',
        lastName: 'Test',
        passwordHash: 'test-only',
        tier: Tier.ELEVATE,
        status: UserStatus.ACTIVE,
      });
    const basic = await db
      .getRepository(User)
      .save({
        email: 'basic-user@purposemint.local',
        firstName: 'Basic',
        lastName: 'Test',
        passwordHash: 'test-only',
        status: UserStatus.ACTIVE,
      });
    const principal = {
      userId: staff.id,
      userType: UserType.ADMIN,
      adminRole: AdminRole.SUPER_ADMIN,
      customRoleId: null,
    } as AuthPrincipal;
    const audit = new AuditService(db.getRepository(AuditEvent));
    const management = new PathwayManagementService(db, audit);
    const customerService = new PathwaysService(
      db.getRepository(Pathway),
      db.getRepository(Partner),
      db.getRepository(PathwayApplication),
      db.getRepository(PathwayChecklistItem),
    );
    await db.getRepository(Pathway).save(SEEDED_PATHWAYS.slice(0, 2));
    const first = await db
      .getRepository(Pathway)
      .findOneByOrFail({ key: SEEDED_PATHWAYS[0].key });
    const second = await db
      .getRepository(Pathway)
      .findOneByOrFail({ key: SEEDED_PATHWAYS[1].key });
    await db
      .getRepository(ChecklistTemplate)
      .save({
        pathwayKey: first.key,
        category: ChecklistCategory.FINANCIAL_REVIEW,
        title: 'Ready documents',
        description: 'Prepare existing intake records',
        sortOrder: 0,
      });
    const partnerInput = {
      name: 'Test partner',
      partnerType: 'Community organization',
      description: 'Local test partner',
      locationLabel: 'Test city',
      capabilityTags: ['intake'],
      pathwayKey: first.key,
      isActive: true,
      sortOrder: 0,
    };
    const createdPartner = await management.createPartner(
      partnerInput,
      staff.id,
    );
    const partner = await db
      .getRepository(Partner)
      .findOneByOrFail({ id: createdPartner.id });
    await assert.rejects(customerService.list(basic.id));
    const draft = await customerService.createOrResume(customer.id, {
      pathwayKey: first.key,
    });
    await assert.rejects(
      customerService.verify(customer.id, draft.id, {
        attestedAmount: first.minimumAmount - 1,
        attestationAccepted: true,
      }),
    );
    await customerService.verify(customer.id, draft.id, {
      attestedAmount: first.minimumAmount,
      attestationAccepted: true,
    });
    await customerService.selectPartners(customer.id, draft.id, {
      partnerIds: [partner.id],
    });
    await assert.rejects(
      management.updatePartner(
        partner.id,
        partnerCatalogUpdateSchema
          .strip()
          .parse({ ...partner, pathwayKey: second.key }),
        staff.id,
      ),
      /associated pathway/,
    );
    await management.updatePartner(
      partner.id,
      partnerCatalogUpdateSchema.strip().parse({ ...partner, isActive: false }),
      staff.id,
    );
    await assert.rejects(
      customerService.submit(customer.id, draft.id),
      /inactive/,
    );
    await assert.rejects(
      customerService.selectPartners(customer.id, draft.id, {
        partnerIds: [partner.id],
      }),
    );
    assert.equal(
      (await customerService.get(customer.id, draft.id)).partners.length,
      1,
      'Inactive partner history is retained.',
    );
    await management.updatePartner(
      partner.id,
      partnerCatalogUpdateSchema
        .strip()
        .parse({ ...partner, version: 2, isActive: true }),
      staff.id,
    );
    await assert.rejects(
      management.updatePartner(
        partner.id,
        partnerCatalogUpdateSchema.strip().parse(partner),
        staff.id,
      ),
      /changed/,
    );
    await customerService.submit(customer.id, draft.id);
    let result = await management.list(principal);
    assert.equal(result.canManage, true);
    assert.equal(result.applications[0].membershipEligible, true);
    assert.equal(result.applications[0].savingsEligible, true);
    assert.equal(result.applications[0].checklistReady, false);
    assert.equal(result.partners[0].applicationCount, 1);
    const item = await db
      .getRepository(PathwayChecklistItem)
      .findOneByOrFail({ applicationId: draft.id });
    await customerService.updateChecklist(customer.id, item.id, {
      isComplete: true,
    });
    result = await management.list(principal);
    assert.equal(result.applications[0].checklistReady, true);
    assert.ok(result.applications[0].checklistReadyAt);
    await customerService.updateChecklist(customer.id, item.id, {
      isComplete: false,
    });
    assert.equal(
      (await management.list(principal)).applications[0].checklistReadyAt,
      null,
    );
    const updated = await management.updatePathway(
      first.key,
      pathwayCatalogUpdateSchema
        .strip()
        .parse({ ...first, title: 'Edited pathway', isActive: false }),
      staff.id,
    );
    assert.equal(updated.version, 2);
    assert.equal(
      (await customerService.list(customer.id)).pathways.some(
        (pathway) => pathway.key === first.key,
      ),
      false,
    );
    await assert.rejects(
      customerService.createOrResume(customer.id, { pathwayKey: first.key }),
    );
    assert.equal(
      (await customerService.get(customer.id, draft.id)).status,
      'submitted',
      'Inactive pathway applications remain accessible.',
    );
    await assert.rejects(
      management.createPartner(partnerInput, staff.id),
      /active pathway/,
    );
    await assert.rejects(
      management.updatePathway(
        first.key,
        pathwayCatalogUpdateSchema.strip().parse(first),
        staff.id,
      ),
      /changed/,
    );
    const changed = await db
      .getRepository(Pathway)
      .findOneByOrFail({ key: first.key });
    await db
      .getRepository(Pathway)
      .createQueryBuilder()
      .insert()
      .values(SEEDED_PATHWAYS)
      .orIgnore()
      .execute();
    assert.equal(
      (await db.getRepository(Pathway).findOneByOrFail({ key: first.key }))
        .title,
      changed.title,
      'Startup catalog seeding preserves edits.',
    );
    assert.equal(
      partnerCatalogInputSchema.safeParse({
        ...partnerInput,
        capabilityTags: ['duplicate', 'duplicate'],
      }).success,
      false,
    );
    assert.equal(
      pathwayCatalogUpdateSchema
        .strip()
        .safeParse({ ...first, minimumAmount: 1.001 }).success,
      false,
    );
    assert.equal(
      pathwayCatalogUpdateSchema
        .strip()
        .safeParse({ ...first, sourceUrl: 'javascript:alert(1)' }).success,
      false,
    );

    const guard = new PermissionsGuard(
      new Reflector(),
      db.getRepository(CustomRole),
    );
    const context = (handler: 'list' | 'updatePathway', user: AuthPrincipal) =>
      ({
        getClass: () => PathwayManagementController,
        getHandler: () => PathwayManagementController.prototype[handler],
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
      }) as unknown as ExecutionContext;
    for (const role of Object.values(AdminRole)) {
      const actor = { ...principal, adminRole: role };
      const canView = [
        AdminRole.SUPER_ADMIN,
        AdminRole.MANAGER,
        AdminRole.AUDITOR,
      ].includes(role as typeof AdminRole.SUPER_ADMIN);
      if (canView) {
        assert.equal(await guard.canActivate(context('list', actor)), true);
        assert.equal(
          (await management.list(actor)).canManage,
          role === AdminRole.SUPER_ADMIN,
        );
      } else await assert.rejects(guard.canActivate(context('list', actor)));
      if (role === AdminRole.SUPER_ADMIN)
        assert.equal(
          await guard.canActivate(context('updatePathway', actor)),
          true,
        );
      else
        await assert.rejects(
          guard.canActivate(context('updatePathway', actor)),
        );
    }
    const custom = await db
      .getRepository(CustomRole)
      .save({
        name: 'Pathway coordinator',
        description: 'Test-only',
        permissions: [
          AdminPermission.FINANCIAL_DATA_VIEW,
          AdminPermission.PATHWAY_APPLICATIONS_EDIT,
        ],
      });
    const coordinator = {
      ...principal,
      adminRole: AdminRole.MANAGER,
      customRoleId: custom.id,
    };
    assert.equal(
      await guard.canActivate(context('updatePathway', coordinator)),
      true,
    );
    assert.equal((await management.list(coordinator)).canManage, true);
    await db
      .getRepository(CustomRole)
      .update(custom.id, {
        permissions: [AdminPermission.FINANCIAL_DATA_VIEW],
      });
    await assert.rejects(
      guard.canActivate(context('updatePathway', coordinator)),
    );
    assert.equal((await management.list(coordinator)).canManage, false);
    assert.equal(
      await db
        .getRepository(AuditEvent)
        .countBy({ action: AuditAction.ADMIN_PATHWAY_CATALOG_UPDATED }),
      1,
    );
    console.log(
      'PASS: catalog edits, stale edit rejection, partner history, deactivation, eligibility, checklist readiness, retained applications, seed preservation, audit writes, all default-role guards, and dynamic custom-role permissions.',
    );
  } finally {
    if (db?.isInitialized) await db.destroy();
    await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
    await admin.destroy();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
