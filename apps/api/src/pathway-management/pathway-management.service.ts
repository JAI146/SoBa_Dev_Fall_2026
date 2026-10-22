import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminPermission,
  AuditAction,
  AuditActorType,
  hasAdminPermission,
  PathwayApplicationStatus,
  Tier,
  pathwayManagementResponseSchema,
  pathwayCatalogInputSchema,
  partnerCatalogInputSchema,
  type PartnerCatalogInput,
  type PartnerCatalogUpdate,
  type PathwayCatalogUpdate,
} from '@purposemint/contracts';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import type { AuthPrincipal } from '../auth/auth-principal';
import { CustomRole } from '../entities/custom-role.entity';
import { Pathway } from '../entities/pathway.entity';
import { Partner } from '../entities/partner.entity';
import { PathwayApplication } from '../entities/pathway-application.entity';
import { PathwayApplicationPartner } from '../entities/pathway-application-partner.entity';
import { ChecklistTemplate } from '../entities/checklist-template.entity';

@Injectable()
export class PathwayManagementService {
  constructor(
    private readonly db: DataSource,
    private readonly audit: AuditService,
  ) {}

  async list(principal: AuthPrincipal) {
    const data = await this.db.transaction(
      'REPEATABLE READ',
      async (manager) => {
        const pathways = await manager.find(Pathway, {
          order: { sortOrder: 'ASC', key: 'ASC' },
        });
        const partners = await manager.find(Partner, {
          order: { sortOrder: 'ASC', name: 'ASC', id: 'ASC' },
        });
        const templates = await manager.find(ChecklistTemplate);
        const applications = await manager.find(PathwayApplication, {
          relations: {
            user: true,
            pathway: true,
            applicationPartners: { partner: true },
            checklistItems: true,
          },
          order: { createdAt: 'DESC', id: 'ASC' },
        });
        const customRole = principal.customRoleId
          ? await manager.findOneBy(CustomRole, { id: principal.customRoleId })
          : null;
        return {
          canManage: hasAdminPermission(
            customRole ? null : principal.adminRole,
            AdminPermission.PATHWAY_APPLICATIONS_EDIT,
            customRole?.permissions,
          ),
          pathways: pathways.map((pathway) => ({
            ...pathway,
            applicationCount: applications.filter(
              (app) => app.pathwayKey === pathway.key,
            ).length,
            checklistTemplateCount: templates.filter(
              (template) => template.pathwayKey === pathway.key,
            ).length,
          })),
          partners: partners.map((partner) => ({
            ...partner,
            applicationCount: applications.filter((app) =>
              app.applicationPartners?.some(
                (link) => link.partnerId === partner.id,
              ),
            ).length,
          })),
          applications: applications.flatMap((app) => {
            if (!app.user || !app.pathway) return [];
            const items = app.checklistItems ?? [];
            const complete = items.filter((item) => item.isComplete).length;
            const ready =
              app.status === PathwayApplicationStatus.SUBMITTED &&
              items.length > 0 &&
              complete === items.length;
            const readyAt = ready
              ? items.reduce<Date | null>(
                  (latest, item) =>
                    item.completedAt && (!latest || item.completedAt > latest)
                      ? item.completedAt
                      : latest,
                  null,
                )
              : null;
            return [
              {
                id: app.id,
                applicant: {
                  id: app.user.id,
                  name:
                    app.user.displayName ||
                    `${app.user.firstName} ${app.user.lastName}`,
                  email: app.user.email,
                  timeZone: app.user.timeZone,
                },
                pathway: {
                  key: app.pathway.key,
                  title: app.pathway.title,
                  minimumAmount: app.pathway.minimumAmount,
                },
                attestedAmount: app.attestedAmount,
                verificationMethod: app.verificationMethod,
                status: app.status,
                submittedAt: app.submittedAt?.toISOString() ?? null,
                createdAt: app.createdAt.toISOString(),
                selectedPartners: (app.applicationPartners ?? []).flatMap(
                  (link) =>
                    link.partner
                      ? [{ id: link.partner.id, name: link.partner.name }]
                      : [],
                ),
                checklistProgress: { completed: complete, total: items.length },
                tier: app.user.tier,
                membershipEligible: app.user.tier === Tier.ELEVATE,
                savingsEligible:
                  app.attestedAmount !== null &&
                  app.attestedAmount >= app.pathway.minimumAmount,
                attestationAccepted: app.attestationAcceptedAt !== null,
                checklistReady: ready,
                checklistReadyAt: readyAt?.toISOString() ?? null,
              },
            ];
          }),
        };
      },
    );
    await this.audit.record({
      action: AuditAction.ADMIN_PATHWAY_CATALOG_VIEWED,
      actorUserId: principal.userId,
      actorType: AuditActorType.ADMIN,
    });
    // Entity relation fields are intentionally omitted from the public response.
    return pathwayManagementResponseSchema.parse({
      ...data,
      pathways: data.pathways.map(
        ({
          applicationCount,
          checklistTemplateCount,
          key,
          version,
          ...pathway
        }) => ({
          ...pathwayCatalogInputSchema.strip().parse(pathway),
          key,
          version,
          applicationCount,
          checklistTemplateCount,
        }),
      ),
      partners: data.partners.map(
        ({ id, version, applicationCount, ...partner }) => ({
          ...partnerCatalogInputSchema.strip().parse(partner),
          id,
          version,
          applicationCount,
        }),
      ),
    });
  }

  async updatePathway(
    key: string,
    input: PathwayCatalogUpdate,
    actorId: string,
  ) {
    return this.db.transaction(async (manager) => {
      const pathway = await manager.findOne(Pathway, {
        where: { key },
        lock: { mode: 'pessimistic_write' },
      });
      if (!pathway) throw new NotFoundException('Pathway not found.');
      if (pathway.version !== input.version)
        throw new ConflictException(
          'This pathway changed. Reload before saving.',
        );
      const before = { ...pathway };
      const { version, ...fields } = input;
      Object.assign(pathway, fields, { version: version + 1 });
      await manager.save(pathway);
      await this.audit.recordTransactional(manager, {
        action: AuditAction.ADMIN_PATHWAY_CATALOG_UPDATED,
        actorUserId: actorId,
        entityType: 'pathway',
        metadata: { pathwayKey: key, before, after: { ...pathway } },
      });
      return { key, version: pathway.version };
    });
  }

  async createPartner(input: PartnerCatalogInput, actorId: string) {
    return this.db.transaction(async (manager) => {
      const pathway = await manager.findOne(Pathway, {
        where: { key: input.pathwayKey },
        lock: { mode: 'pessimistic_write' },
      });
      if (!pathway) throw new NotFoundException('Pathway not found.');
      if (!pathway.isActive)
        throw new BadRequestException(
          'Choose an active pathway for a new partner.',
        );
      const partner = await manager.save(
        Partner,
        manager.create(Partner, input),
      );
      await this.audit.recordTransactional(manager, {
        action: AuditAction.ADMIN_PARTNER_CREATED,
        actorUserId: actorId,
        entityType: 'partner',
        entityId: partner.id,
        metadata: { after: { ...partner } },
      });
      return { id: partner.id, version: partner.version };
    });
  }

  async updatePartner(
    id: string,
    input: PartnerCatalogUpdate,
    actorId: string,
  ) {
    return this.db.transaction(async (manager) => {
      // Lock the target pathway first, matching customer selection's catalog lock order.
      const pathway = await manager.findOne(Pathway, {
        where: { key: input.pathwayKey },
        lock: { mode: 'pessimistic_write' },
      });
      if (!pathway) throw new NotFoundException('Pathway not found.');
      const partner = await manager.findOne(Partner, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!partner) throw new NotFoundException('Partner not found.');
      if (partner.version !== input.version)
        throw new ConflictException(
          'This partner changed. Reload before saving.',
        );
      if (partner.pathwayKey !== input.pathwayKey) {
        if (!pathway.isActive)
          throw new BadRequestException('Choose an active pathway.');
        if (await manager.countBy(PathwayApplicationPartner, { partnerId: id }))
          throw new ConflictException(
            'This partner is selected on applications. Its associated pathway must be preserved.',
          );
      }
      const before = { ...partner };
      const { version, ...fields } = input;
      Object.assign(partner, fields, { version: version + 1 });
      await manager.save(partner);
      await this.audit.recordTransactional(manager, {
        action: AuditAction.ADMIN_PARTNER_UPDATED,
        actorUserId: actorId,
        entityType: 'partner',
        entityId: id,
        metadata: { before, after: { ...partner } },
      });
      return { id, version: partner.version };
    });
  }
}
