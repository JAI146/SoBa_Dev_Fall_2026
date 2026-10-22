import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminPermission,
  hasAdminPermission,
  AuditAction,
  AuditActorType,
  badgeSchema,
  earnedBadgesResponseSchema,
  type BadgeInput,
  type BadgeUpdate,
} from '@purposemint/contracts';
import { DataSource, type EntityManager } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { BadgeDefinition } from '../entities/badge-definition.entity';
import { BadgeAward } from '../entities/badge-award.entity';
import { CustomRole } from '../entities/custom-role.entity';
import type { AuthPrincipal } from '../auth/auth-principal';
import { BadgeEvaluationService } from './badge-evaluation.service';

@Injectable()
export class BadgesService {
  constructor(
    private readonly db: DataSource,
    private readonly audit: AuditService,
    private readonly evaluation: BadgeEvaluationService,
  ) {}

  async list(principal: AuthPrincipal) {
    const definitions = await this.db
      .getRepository(BadgeDefinition)
      .find({ order: { createdAt: 'DESC', id: 'ASC' } });
    const counts = await this.db
      .getRepository(BadgeAward)
      .createQueryBuilder('award')
      .select('award.badgeId', 'badgeId')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('award.badgeId')
      .getRawMany<{ badgeId: string; count: number }>();
    const byBadge = new Map(counts.map((row) => [row.badgeId, row.count]));
    const customRole = principal.customRoleId
      ? await this.db
          .getRepository(CustomRole)
          .findOneBy({ id: principal.customRoleId })
      : null;
    const canManage = hasAdminPermission(
      customRole ? null : principal.adminRole,
      AdminPermission.USER_MANAGEMENT_EDIT,
      customRole?.permissions,
    );
    await this.audit.record({
      action: AuditAction.ADMIN_BADGES_LISTED,
      actorUserId: principal.userId,
      actorType: AuditActorType.ADMIN,
    });
    return {
      items: definitions.map((badge) =>
        this.serialize(badge, byBadge.get(badge.id) ?? 0),
      ),
      canManage,
    };
  }

  async awards(actorUserId: string) {
    const rows = await this.db
      .getRepository(BadgeAward)
      .createQueryBuilder('award')
      .withDeleted()
      .innerJoin('award.badge', 'badge')
      .innerJoin('award.user', 'user')
      .select('award.id', 'id')
      .addSelect('award.badgeId', 'badgeId')
      .addSelect('badge.name', 'badgeName')
      .addSelect('badge.iconEmoji', 'iconEmoji')
      .addSelect('award.userId', 'userId')
      .addSelect('user.email', 'userEmail')
      .addSelect(
        "COALESCE(NULLIF(user.display_name, ''), concat_ws(' ', user.first_name, user.last_name))",
        'userName',
      )
      .addSelect('award.unlockedAt', 'unlockedAt')
      .orderBy('award.unlockedAt', 'DESC')
      .addOrderBy('award.id', 'ASC')
      .getRawMany<{
        id: string;
        badgeId: string;
        badgeName: string;
        iconEmoji: string;
        userId: string;
        userName: string;
        userEmail: string;
        unlockedAt: Date;
      }>();
    await this.audit.record({
      action: AuditAction.ADMIN_BADGE_AWARDS_LISTED,
      actorUserId,
      actorType: AuditActorType.ADMIN,
    });
    return {
      items: rows.map((row) => ({
        ...row,
        unlockedAt: row.unlockedAt.toISOString(),
      })),
    };
  }

  create(input: BadgeInput, actorUserId: string) {
    return this.db.transaction(async (manager) => {
      const badge = await manager.save(
        BadgeDefinition,
        manager.create(BadgeDefinition, input),
      );
      await this.audit.recordTransactional(manager, {
        action: AuditAction.ADMIN_BADGE_CREATED,
        actorUserId,
        entityType: 'badge_definition',
        entityId: badge.id,
        metadata: { definition: input },
      });
      await this.evaluation.awardForBadge(badge, manager);
      return this.serialize(
        badge,
        await manager.count(BadgeAward, { where: { badgeId: badge.id } }),
      );
    });
  }

  update(id: string, input: BadgeUpdate, actorUserId: string) {
    return this.db.transaction(async (manager) => {
      const badge = await this.lockEditable(manager, id);
      const { version, ...definition } = input;
      if (badge.version !== version)
        throw new ConflictException(
          'This badge changed. Reload before editing.',
        );
      const before = this.serialize(badge, 0);
      Object.assign(badge, definition);
      const saved = await manager.save(BadgeDefinition, badge);
      await this.audit.recordTransactional(manager, {
        action: AuditAction.ADMIN_BADGE_UPDATED,
        actorUserId,
        entityType: 'badge_definition',
        entityId: id,
        metadata: { before, after: this.serialize(saved, 0) },
      });
      await this.evaluation.awardForBadge(saved, manager);
      return this.serialize(
        saved,
        await manager.count(BadgeAward, { where: { badgeId: saved.id } }),
      );
    });
  }

  remove(id: string, actorUserId: string) {
    return this.db.transaction(async (manager) => {
      const badge = await this.lockEditable(manager, id);
      await this.audit.recordTransactional(manager, {
        action: AuditAction.ADMIN_BADGE_DELETED,
        actorUserId,
        entityType: 'badge_definition',
        entityId: id,
        metadata: { definition: this.serialize(badge, 0) },
      });
      await manager.remove(BadgeDefinition, badge);
      return { deleted: true };
    });
  }

  private async lockEditable(manager: EntityManager, id: string) {
    const badge = await manager.findOne(BadgeDefinition, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!badge) throw new NotFoundException('Badge not found.');
    if (await manager.exists(BadgeAward, { where: { badgeId: id } }))
      throw new ConflictException(
        'This badge has been earned and cannot be edited or deleted.',
      );
    return badge;
  }

  async earned(userId: string) {
    await this.evaluation.evaluateUser(userId);
    const awards = await this.db.getRepository(BadgeAward).find({
      where: { userId },
      relations: { badge: true },
      order: { unlockedAt: 'DESC', id: 'ASC' },
    });
    return earnedBadgesResponseSchema.parse({
      items: awards.map((award) => ({
        ...award.badge,
        unlockedAt: award.unlockedAt.toISOString(),
      })),
    });
  }

  private serialize(badge: BadgeDefinition, awardCount: number) {
    return badgeSchema.parse({
      ...badge,
      awardCount,
      createdAt: badge.createdAt.toISOString(),
      updatedAt: badge.updatedAt.toISOString(),
    });
  }
}
