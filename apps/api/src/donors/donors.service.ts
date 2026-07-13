import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { DonorListQuery } from "@muakhah/contracts";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import {
  User,
  UserStatusEnum,
  UserTypeEnum,
} from "../entities/user.entity";
import {
  CoverageStatusEnum,
  Family,
} from "../entities/family.entity";
import {
  Sponsorship,
  SponsorshipStatusEnum,
} from "../entities/sponsorship.entity";
import { ChatRoom } from "../entities/chat-room.entity";
import { ChatMessage } from "../entities/chat-message.entity";
import { TransferProof } from "../entities/transfer-proof.entity";
import { SponsorTicket } from "../entities/sponsor-ticket.entity";
import { SponsorTicketMessage } from "../entities/sponsor-ticket-message.entity";

function isDonorUser(user: User): boolean {
  return (
    user.userType === UserTypeEnum.VISITOR ||
    user.userType === UserTypeEnum.SPONSOR
  );
}

@Injectable()
export class DonorsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async listForAdmin(filters: DonorListQuery = {}) {
    const qb = this.userRepo
      .createQueryBuilder("user")
      .where("user.userType IN (:...types)", {
        types: [UserTypeEnum.VISITOR, UserTypeEnum.SPONSOR],
      })
      .orderBy("user.createdAt", "DESC");

    if (filters.search?.trim()) {
      const q = `%${filters.search.trim().toLowerCase()}%`;
      qb.andWhere(
        "(LOWER(user.email) LIKE :q OR LOWER(user.firstName) LIKE :q OR LOWER(user.lastName) LIKE :q)",
        { q },
      );
    }

    if (filters.status) {
      qb.andWhere("user.status = :status", { status: filters.status });
    }

    if (filters.userType) {
      qb.andWhere("user.userType = :userType", {
        userType: filters.userType,
      });
    }

    const donors = await qb.getMany();
    return donors.map((donor) => this.toListItem(donor));
  }

  async findByIdForAdmin(id: string) {
    const donor = await this.loadDonorOrThrow(id);
    return this.toDetail(donor);
  }

  async setRestrictedForAdmin(id: string, restricted: boolean) {
    const donor = await this.loadDonorOrThrow(id);
    donor.status = restricted
      ? UserStatusEnum.SUSPENDED
      : UserStatusEnum.ACTIVE;
    const saved = await this.userRepo.save(donor);
    return this.toDetail(saved);
  }

  async deleteForAdmin(id: string) {
    const donor = await this.loadDonorOrThrow(id);

    await this.dataSource.transaction(async (manager) => {
      const sponsorships = await manager.find(Sponsorship, {
        where: { donorUserId: donor.id },
        select: { id: true, familyId: true },
      });
      const sponsorshipIds = sponsorships.map((item) => item.id);
      const familyIds = [
        ...new Set(sponsorships.map((item) => item.familyId)),
      ];

      const rooms = await manager.find(ChatRoom, {
        where: { donorUserId: donor.id },
        select: { id: true },
      });
      const roomIds = rooms.map((item) => item.id);

      const tickets = await manager.find(SponsorTicket, {
        where: { donorUserId: donor.id },
        select: { id: true },
      });
      const ticketIds = tickets.map((item) => item.id);

      if (roomIds.length > 0) {
        await manager.delete(ChatMessage, { roomId: In(roomIds) });
      }
      await manager.delete(ChatMessage, { senderUserId: donor.id });

      if (ticketIds.length > 0) {
        await manager.delete(SponsorTicketMessage, {
          ticketId: In(ticketIds),
        });
      }
      await manager.delete(SponsorTicketMessage, {
        senderUserId: donor.id,
      });

      if (sponsorshipIds.length > 0) {
        await manager.delete(TransferProof, {
          sponsorshipId: In(sponsorshipIds),
        });
      }
      await manager.delete(TransferProof, { donorUserId: donor.id });
      await manager.update(
        TransferProof,
        { reviewedBy: donor.id },
        { reviewedBy: null },
      );

      await manager.delete(SponsorTicket, { donorUserId: donor.id });
      await manager.delete(ChatRoom, { donorUserId: donor.id });
      await manager.delete(Sponsorship, { donorUserId: donor.id });

      for (const familyId of familyIds) {
        await this.recalculateFamilyCoverage(manager, familyId);
      }

      await manager.delete(User, { id: donor.id });
    });

    return { success: true };
  }

  private async recalculateFamilyCoverage(
    manager: EntityManager,
    familyId: string,
  ) {
    const family = await manager.findOne(Family, {
      where: { id: familyId },
      lock: { mode: "pessimistic_write" },
    });
    if (!family) {
      return;
    }

    const result = await manager
      .createQueryBuilder(Sponsorship, "sponsorship")
      .select("COALESCE(SUM(sponsorship.monthly_amount), 0)", "total")
      .where("sponsorship.family_id = :familyId", { familyId })
      .andWhere("sponsorship.status = :status", {
        status: SponsorshipStatusEnum.ACTIVE,
      })
      .getRawOne<{ total: string }>();

    const monthlyRequired = Number(family.monthlyRequiredAmount);
    const newCovered = Number(result?.total ?? 0);
    const newRemaining = Math.max(0, monthlyRequired - newCovered);

    family.monthlyCoveredAmount = newCovered.toFixed(2);
    family.monthlyRemainingAmount = newRemaining.toFixed(2);
    family.coverageStatus =
      newCovered <= 0
        ? CoverageStatusEnum.NOT_COVERED
        : newCovered >= monthlyRequired
          ? CoverageStatusEnum.FULLY_COVERED
          : CoverageStatusEnum.PARTIALLY_COVERED;

    await manager.save(family);
  }

  private async loadDonorOrThrow(id: string) {
    const donor = await this.userRepo.findOne({ where: { id } });
    if (!donor || !isDonorUser(donor)) {
      throw new NotFoundException("Donor not found");
    }
    return donor;
  }

  private toListItem(donor: User) {
    return {
      id: donor.id,
      email: donor.email,
      firstName: donor.firstName,
      lastName: donor.lastName,
      fullName: `${donor.firstName} ${donor.lastName}`.trim(),
      profileImageUrl: donor.profileImageUrl,
      country: donor.country,
      state: donor.state,
      city: donor.city,
      userType: donor.userType,
      status: donor.status,
      accountRestricted: donor.status === UserStatusEnum.SUSPENDED,
      createdAt: donor.createdAt.toISOString(),
    };
  }

  private toDetail(donor: User) {
    return {
      ...this.toListItem(donor),
      updatedAt: donor.updatedAt.toISOString(),
      policyAgreements: donor.policyAgreements ?? {},
    };
  }
}
