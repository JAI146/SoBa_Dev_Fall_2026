import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type {
  CreateSubAdminInput,
  SubAdminListItem,
  UpdateSubAdminInput,
} from "@muakhah/contracts";
import { ActivityAction } from "@muakhah/contracts";
import * as bcrypt from "bcrypt";
import { Repository } from "typeorm";
import { ActivityLogService } from "../activity-logs/activity-log.service";
import {
  AdminRoleEnum,
  User,
  UserStatusEnum,
  UserTypeEnum,
} from "../entities/user.entity";

@Injectable()
export class SubAdminsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async list(): Promise<{ subAdmins: SubAdminListItem[] }> {
    const users = await this.userRepo.find({
      where: {
        userType: UserTypeEnum.ADMIN,
      },
      order: { createdAt: "DESC" },
    });

    return {
      subAdmins: users
        .filter((user) => user.adminRole !== AdminRoleEnum.SUPER_ADMIN)
        .map((user) => this.toListItem(user)),
    };
  }

  async create(
    actorUserId: string,
    actorAdminRole: AdminRoleEnum | null,
    input: CreateSubAdminInput,
  ): Promise<{ subAdmin: SubAdminListItem }> {
    const email = input.email.toLowerCase();
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException("Email is already registered");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.userRepo.save(
      this.userRepo.create({
        email,
        passwordHash,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        userType: UserTypeEnum.ADMIN,
        adminRole: input.adminRole as AdminRoleEnum,
        status: UserStatusEnum.ACTIVE,
        profileImageUrl: null,
      }),
    );

    await this.activityLogService.log({
      actorUserId,
      actorAdminRole,
      action: ActivityAction.SUB_ADMIN_CREATED,
      entityType: "user",
      entityId: user.id,
      summary: `Sub-admin created: ${user.email} (${input.adminRole})`,
      metadata: { adminRole: input.adminRole, email: user.email },
    });

    return { subAdmin: this.toListItem(user) };
  }

  async update(
    id: string,
    actorUserId: string,
    actorAdminRole: AdminRoleEnum | null,
    input: UpdateSubAdminInput,
  ): Promise<{ subAdmin: SubAdminListItem }> {
    const user = await this.findSubAdmin(id);
    const previous = {
      adminRole: user.adminRole,
      status: user.status,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    if (input.firstName !== undefined) user.firstName = input.firstName.trim();
    if (input.lastName !== undefined) user.lastName = input.lastName.trim();
    if (input.adminRole !== undefined) {
      user.adminRole = input.adminRole as AdminRoleEnum;
    }
    if (input.status !== undefined) {
      user.status = input.status as UserStatusEnum;
    }

    const saved = await this.userRepo.save(user);

    await this.activityLogService.log({
      actorUserId,
      actorAdminRole,
      action: ActivityAction.SUB_ADMIN_UPDATED,
      entityType: "user",
      entityId: saved.id,
      summary: `Sub-admin updated: ${saved.email}`,
      metadata: { previous, next: input },
    });

    return { subAdmin: this.toListItem(saved) };
  }

  private async findSubAdmin(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (
      !user ||
      user.userType !== UserTypeEnum.ADMIN ||
      user.adminRole === AdminRoleEnum.SUPER_ADMIN ||
      !user.adminRole
    ) {
      throw new NotFoundException("Sub-admin not found");
    }
    return user;
  }

  private toListItem(user: User): SubAdminListItem {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      adminRole: user.adminRole!,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
