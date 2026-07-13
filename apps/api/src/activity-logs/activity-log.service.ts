import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type {
  ActivityActionValue,
  ActivityLogListItem,
  ActivityLogQueryInput,
} from "@muakhah/contracts";
import { In, Repository, Brackets } from "typeorm";
import { ActivityLog } from "../entities/activity-log.entity";
import { User } from "../entities/user.entity";

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly logRepo: Repository<ActivityLog>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async log(params: {
    actorUserId: string;
    actorAdminRole?: string | null;
    action: ActivityActionValue | string;
    entityType: string;
    entityId?: string | null;
    summary: string;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    const entry = this.logRepo.create({
      actorUserId: params.actorUserId,
      actorAdminRole: params.actorAdminRole ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      summary: params.summary,
      metadata: params.metadata ?? null,
    });
    await this.logRepo.save(entry);
  }

  async listForAdmin(
    query: ActivityLogQueryInput,
  ): Promise<{ logs: ActivityLogListItem[]; total: number }> {
    const qb = this.logRepo
      .createQueryBuilder("log")
      .orderBy("log.created_at", "DESC")
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.action) {
      qb.andWhere("log.action = :action", { action: query.action });
    }
    if (query.entityType) {
      qb.andWhere("log.entity_type = :entityType", {
        entityType: query.entityType,
      });
    }
    if (query.actorUserId) {
      qb.andWhere("log.actor_user_id = :actorUserId", {
        actorUserId: query.actorUserId,
      });
    }
    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      qb.leftJoin(User, "actor", "actor.id = log.actor_user_id");
      qb.andWhere(
        new Brackets((where) => {
          where
            .where("log.summary ILIKE :term", { term })
            .orWhere("actor.email ILIKE :term", { term })
            .orWhere("actor.firstName ILIKE :term", { term })
            .orWhere("actor.lastName ILIKE :term", { term });
        }),
      );
    }

    const [rows, total] = await qb.getManyAndCount();
    const actorIds = [...new Set(rows.map((row) => row.actorUserId))];
    const actors =
      actorIds.length > 0
        ? await this.userRepo.find({ where: { id: In(actorIds) } })
        : [];
    const actorMap = new Map(actors.map((actor) => [actor.id, actor]));

    return {
      logs: rows.map((row) => {
        const actor = actorMap.get(row.actorUserId);
        return {
          id: row.id,
          actorUserId: row.actorUserId,
          actorName: actor
            ? `${actor.firstName} ${actor.lastName}`.trim()
            : "Unknown",
          actorEmail: actor?.email ?? "",
          actorAdminRole:
            (row.actorAdminRole as ActivityLogListItem["actorAdminRole"]) ??
            null,
          action: row.action,
          entityType: row.entityType,
          entityId: row.entityId,
          summary: row.summary,
          metadata: row.metadata,
          createdAt: row.createdAt.toISOString(),
        };
      }),
      total,
    };
  }
}
