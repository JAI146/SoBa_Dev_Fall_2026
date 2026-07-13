import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type {
  CancelSponsorshipInput,
  CompleteSponsorshipInput,
  CreateSponsorshipInput,
  DisputeSponsorshipInput,
  DonorDashboardOverview,
  PauseSponsorshipInput,
  ReviewSponsorshipInput,
  SetSponsorshipStatusInput,
  SponsorshipListItem,
  StopSponsorshipInput,
  UpdateSponsorshipInput,
} from "@muakhah/contracts";
import {
  ActivityAction,
  durationPresetToFields,
  fieldsToDurationPreset,
} from "@muakhah/contracts";
import { randomUUID } from "crypto";
import { DataSource, EntityManager, Repository } from "typeorm";
import { ActivityLogService } from "../activity-logs/activity-log.service";
import {
  CoverageStatusEnum,
  Family,
} from "../entities/family.entity";
import {
  Sponsorship,
  SponsorshipStatusEnum,
  SponsorshipTypeEnum,
} from "../entities/sponsorship.entity";
import { User, UserTypeEnum } from "../entities/user.entity";
import type { UploadedImageFile } from "../common/types/uploaded-file.type";
import { S3Service } from "../storage/s3.service";
import { ChatService } from "../chat/chat.service";
import { TransferProofsService } from "../transfer-proofs/transfer-proofs.service";

@Injectable()
export class SponsorshipsService implements OnModuleInit {
  constructor(
    @InjectRepository(Sponsorship)
    private readonly sponsorshipRepo: Repository<Sponsorship>,
    @InjectRepository(Family)
    private readonly familyRepo: Repository<Family>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly s3Service: S3Service,
    private readonly chatService: ChatService,
    private readonly activityLogService: ActivityLogService,
    private readonly transferProofsService: TransferProofsService,
  ) {}

  async onModuleInit() {
    await this.syncAllFamilyCoverage();
  }

  async syncAllFamilyCoverage(): Promise<void> {
    const families = await this.familyRepo.find({ select: { id: true } });
    for (const family of families) {
      await this.dataSource.transaction(async (manager) => {
        await this.recalculateFamilyCoverage(manager, family.id);
      });
    }
  }

  async createForDonor(
    donorUserId: string,
    input: CreateSponsorshipInput,
  ): Promise<{ sponsorship: SponsorshipListItem }> {
    const family = await this.familyRepo.findOne({
      where: { publicCode: input.familyPublicCode },
    });
    if (!family) {
      throw new NotFoundException("Family not found");
    }

    if (family.profileStatus !== "published") {
      throw new BadRequestException(
        "This family is not available for sponsorship",
      );
    }

    const monthlyRequired = Number(family.monthlyRequiredAmount);
    if (monthlyRequired <= 0) {
      throw new BadRequestException(
        "This family does not have a monthly required amount set",
      );
    }

    const monthlyAmount = this.resolveMonthlyAmount(
      input.type,
      input.amount,
      monthlyRequired,
    );

    const familyMethods = family.receivingMethods ?? [];
    if (familyMethods.length === 0) {
      throw new BadRequestException(
        "This family has no receiving methods configured",
      );
    }

    const selectedReceivingMethod = this.resolveSelectedReceivingMethod(
      familyMethods,
      input.selectedReceivingMethodIndex,
    );

    const { durationMonths, isOngoing } = durationPresetToFields(
      input.durationPreset,
    );

    const sponsorshipId = randomUUID();

    const sponsorship = await this.dataSource.transaction(async (manager) => {
      const donor = await manager.findOne(User, { where: { id: donorUserId } });
      if (!donor) {
        throw new NotFoundException("Donor not found");
      }

      if (donor.userType === UserTypeEnum.VISITOR) {
        donor.userType = UserTypeEnum.SPONSOR;
        await manager.save(donor);
      }

      const entity = manager.create(Sponsorship, {
        id: sponsorshipId,
        familyId: family.id,
        donorUserId,
        type:
          input.type === "full"
            ? SponsorshipTypeEnum.FULL
            : SponsorshipTypeEnum.PARTIAL,
        monthlyAmount: monthlyAmount.toFixed(2),
        durationMonths,
        isOngoing,
        notes: input.notes?.trim() || null,
        selectedReceivingMethodIndex: input.selectedReceivingMethodIndex,
        selectedReceivingMethods: [selectedReceivingMethod],
        initialMessage: input.initialMessage?.trim() || null,
        initialMessageDelivered: false,
        pledgeAcceptedAt: new Date(),
        receiptUrl: null,
        status: SponsorshipStatusEnum.REQUESTED,
        needsClarification: false,
        adminNotes: null,
        reviewedBy: null,
        reviewedAt: null,
        activatedAt: null,
        completedAt: null,
      });

      const saved = await manager.save(entity);
      const withRelations = await manager.findOne(Sponsorship, {
        where: { id: saved.id },
        relations: { family: true, donorUser: true },
      });
      if (!withRelations) {
        throw new Error("Failed to load created sponsorship");
      }
      return withRelations;
    });

    await this.activityLogService.log({
      actorUserId: donorUserId,
      action: ActivityAction.SPONSORSHIP_CREATED,
      entityType: "sponsorship",
      entityId: sponsorship.id,
      summary: `Sponsorship requested for family ${sponsorship.family?.publicCode ?? family.publicCode}`,
      metadata: { status: sponsorship.status, monthlyAmount: sponsorship.monthlyAmount },
    });

    return { sponsorship: await this.toListItemWithCount(sponsorship) };
  }

  async listForDonor(donorUserId: string): Promise<{ sponsorships: SponsorshipListItem[] }> {
    await this.syncCompletedSponsorships();
    const items = await this.sponsorshipRepo.find({
      where: { donorUserId },
      relations: { family: true, donorUser: true },
      order: { createdAt: "DESC" },
    });
    return { sponsorships: await this.toListItems(items) };
  }

  async findOneForDonor(
    donorUserId: string,
    sponsorshipId: string,
  ): Promise<{ sponsorship: SponsorshipListItem }> {
    await this.syncCompletedSponsorships();
    const sponsorship = await this.sponsorshipRepo.findOne({
      where: { id: sponsorshipId, donorUserId },
      relations: { family: true, donorUser: true },
    });

    if (!sponsorship) {
      throw new NotFoundException("Sponsorship request not found");
    }

    return { sponsorship: await this.toListItemWithCount(sponsorship) };
  }

  async getDashboardForDonor(
    donorUserId: string,
  ): Promise<{ overview: DonorDashboardOverview }> {
    await this.syncCompletedSponsorships();

    const sponsorships = await this.sponsorshipRepo.find({
      where: { donorUserId },
      select: { familyId: true, status: true, type: true },
    });

    const sponsoredStatuses = new Set([
      SponsorshipStatusEnum.ACTIVE,
      SponsorshipStatusEnum.PAUSED,
      SponsorshipStatusEnum.COMPLETED,
      SponsorshipStatusEnum.STOPPED,
      SponsorshipStatusEnum.DISPUTED,
    ]);

    const familiesSponsored = new Set(
      sponsorships
        .filter((item) => sponsoredStatuses.has(item.status))
        .map((item) => item.familyId),
    ).size;

    const activeSponsorships = sponsorships.filter(
      (item) => item.status === SponsorshipStatusEnum.ACTIVE,
    ).length;

    const partialSponsorships = sponsorships.filter(
      (item) =>
        item.status === SponsorshipStatusEnum.ACTIVE &&
        item.type === SponsorshipTypeEnum.PARTIAL,
    ).length;

    const completedSponsorships = sponsorships.filter(
      (item) => item.status === SponsorshipStatusEnum.COMPLETED,
    ).length;

    const messageStats =
      await this.chatService.getMessageStatsForDonor(donorUserId);

    return {
      overview: {
        familiesSponsored,
        activeSponsorships,
        partialSponsorships,
        completedSponsorships,
        messagesPendingModeration: messageStats.messagesPendingModeration,
        approvedMessages: messageStats.approvedMessages,
        adminNotices: 0,
      },
    };
  }

  async getDashboardForFamilyUser(familyUserId: string) {
    await this.syncCompletedSponsorships();
    const family = await this.findFamilyForUser(familyUserId);

    const activeSponsorships = await this.sponsorshipRepo.find({
      where: {
        familyId: family.id,
        status: SponsorshipStatusEnum.ACTIVE,
      },
      select: { donorUserId: true },
    });

    const uniqueDonorIds = new Set(
      activeSponsorships.map((item) => item.donorUserId),
    );

    return {
      overview: {
        publicCode: family.publicCode,
        monthlyRequiredAmount: Number(family.monthlyRequiredAmount),
        monthlyCoveredAmount: Number(family.monthlyCoveredAmount),
        monthlyRemainingAmount: Number(family.monthlyRemainingAmount),
        totalDonors: uniqueDonorIds.size,
        coverageStatus: family.coverageStatus,
      },
    };
  }

  async listForFamilyUser(
    familyUserId: string,
  ): Promise<{ sponsorships: SponsorshipListItem[] }> {
    await this.syncCompletedSponsorships();
    const family = await this.findFamilyForUser(familyUserId);

    const items = await this.sponsorshipRepo.find({
      where: { familyId: family.id },
      relations: { family: true, donorUser: true },
      order: { createdAt: "DESC" },
    });

    return { sponsorships: await this.toListItems(items) };
  }

  async findOneForFamilyUser(
    familyUserId: string,
    sponsorshipId: string,
  ): Promise<{ sponsorship: SponsorshipListItem }> {
    await this.syncCompletedSponsorships();
    const family = await this.findFamilyForUser(familyUserId);

    const sponsorship = await this.sponsorshipRepo.findOne({
      where: { id: sponsorshipId, familyId: family.id },
      relations: { family: true, donorUser: true },
    });

    if (!sponsorship) {
      throw new NotFoundException("Sponsorship request not found");
    }

    return { sponsorship: await this.toListItemWithCount(sponsorship) };
  }

  async updateForDonor(
    donorUserId: string,
    sponsorshipId: string,
    input: UpdateSponsorshipInput,
  ): Promise<{ sponsorship: SponsorshipListItem }> {
    const sponsorship = await this.sponsorshipRepo.findOne({
      where: { id: sponsorshipId, donorUserId },
      relations: { family: true },
    });

    if (!sponsorship) {
      throw new NotFoundException("Sponsorship request not found");
    }

    if (
      sponsorship.status !== SponsorshipStatusEnum.REQUESTED ||
      !sponsorship.needsClarification
    ) {
      throw new BadRequestException(
        "Only sponsorship requests needing clarification can be updated",
      );
    }

    const family = sponsorship.family
      ?? (await this.familyRepo.findOne({ where: { id: sponsorship.familyId } }));

    if (!family) {
      throw new NotFoundException("Family not found");
    }

    const monthlyRequired = Number(family.monthlyRequiredAmount);
    if (monthlyRequired <= 0) {
      throw new BadRequestException(
        "This family does not have a monthly required amount set",
      );
    }

    const monthlyAmount = this.resolveMonthlyAmount(
      input.type,
      input.amount,
      monthlyRequired,
    );

    const { durationMonths, isOngoing } = durationPresetToFields(
      input.durationPreset,
    );

    if (input.selectedReceivingMethodIndex !== undefined) {
      const familyMethods = family.receivingMethods ?? [];
      const selectedReceivingMethod = this.resolveSelectedReceivingMethod(
        familyMethods,
        input.selectedReceivingMethodIndex,
      );
      sponsorship.selectedReceivingMethodIndex = input.selectedReceivingMethodIndex;
      sponsorship.selectedReceivingMethods = [selectedReceivingMethod];
    }

    sponsorship.type =
      input.type === "full"
        ? SponsorshipTypeEnum.FULL
        : SponsorshipTypeEnum.PARTIAL;
    sponsorship.monthlyAmount = monthlyAmount.toFixed(2);
    sponsorship.durationMonths = durationMonths;
    sponsorship.isOngoing = isOngoing;
    sponsorship.notes = input.notes?.trim() || null;
    if (input.initialMessage !== undefined) {
      sponsorship.initialMessage = input.initialMessage?.trim() || null;
    }
    sponsorship.needsClarification = false;
    sponsorship.reviewedBy = null;
    sponsorship.reviewedAt = null;

    const saved = await this.sponsorshipRepo.save(sponsorship);

    const withRelations = await this.sponsorshipRepo.findOne({
      where: { id: saved.id },
      relations: { family: true, donorUser: true },
    });

    if (!withRelations) {
      throw new Error("Failed to load updated sponsorship");
    }

    return { sponsorship: await this.toListItemWithCount(withRelations) };
  }

  async listForAdmin(filters?: {
    status?: string;
    search?: string;
  }): Promise<{ sponsorships: SponsorshipListItem[] }> {
    await this.syncCompletedSponsorships();
    const qb = this.sponsorshipRepo
      .createQueryBuilder("sponsorship")
      .leftJoinAndSelect("sponsorship.family", "family")
      .leftJoinAndSelect("sponsorship.donorUser", "donorUser")
      .orderBy("sponsorship.createdAt", "DESC");

    if (filters?.status) {
      if (filters.status === "need_clarification") {
        qb.andWhere("sponsorship.status = :requested", {
          requested: SponsorshipStatusEnum.REQUESTED,
        }).andWhere("sponsorship.needsClarification = true");
      } else {
        qb.andWhere("sponsorship.status = :status", { status: filters.status });
      }
    }

    if (filters?.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      qb.andWhere(
        "(family.publicCode ILIKE :term OR donorUser.email ILIKE :term OR donorUser.firstName ILIKE :term OR donorUser.lastName ILIKE :term)",
        { term },
      );
    }

    const items = await qb.getMany();
    return { sponsorships: await this.toListItems(items) };
  }

  async reviewForAdmin(
    sponsorshipId: string,
    adminUserId: string,
    input: ReviewSponsorshipInput,
  ): Promise<{ sponsorship: SponsorshipListItem }> {
    const updated = await this.dataSource.transaction(async (manager) => {
      const sponsorship = await manager.findOne(Sponsorship, {
        where: { id: sponsorshipId },
        lock: { mode: "pessimistic_write" },
      });

      if (!sponsorship) {
        throw new NotFoundException("Sponsorship request not found");
      }

      if (sponsorship.status !== SponsorshipStatusEnum.REQUESTED) {
        throw new BadRequestException(
          "Only requested sponsorships can be reviewed",
        );
      }

      sponsorship.adminNotes = input.adminNotes?.trim() || null;
      sponsorship.reviewedBy = adminUserId;
      sponsorship.reviewedAt = new Date();

      if (input.status === "active") {
        sponsorship.status = SponsorshipStatusEnum.ACTIVE;
        sponsorship.needsClarification = false;
        sponsorship.activatedAt = new Date();
      } else if (input.status === "cancelled") {
        sponsorship.status = SponsorshipStatusEnum.CANCELLED;
        sponsorship.needsClarification = false;
      } else {
        sponsorship.needsClarification = true;
      }

      const saved = await manager.save(sponsorship);
      if (saved.status === SponsorshipStatusEnum.ACTIVE) {
        await this.recalculateFamilyCoverage(manager, saved.familyId);
      }
      return saved;
    });

    const withRelations = await this.sponsorshipRepo.findOne({
      where: { id: updated.id },
      relations: { family: true, donorUser: true },
    });

    if (!withRelations) {
      throw new Error("Failed to load reviewed sponsorship");
    }

    if (withRelations.status === SponsorshipStatusEnum.ACTIVE) {
      const room = await this.chatService.ensureRoomForApprovedSponsorship(
        withRelations.familyId,
        withRelations.donorUserId,
        withRelations.id,
      );
      await this.chatService.deliverInitialSponsorshipMessage(
        withRelations,
        room.id,
        adminUserId,
      );
    }

    await this.activityLogService.log({
      actorUserId: adminUserId,
      action: ActivityAction.SPONSORSHIP_REVIEWED,
      entityType: "sponsorship",
      entityId: withRelations.id,
      summary: `Sponsorship reviewed: ${input.status}`,
      metadata: {
        status: withRelations.status,
        needsClarification: withRelations.needsClarification,
        adminNotes: input.adminNotes ?? null,
      },
    });

    return { sponsorship: await this.toListItemWithCount(withRelations) };
  }

  async pauseForDonor(
    donorUserId: string,
    sponsorshipId: string,
    input: PauseSponsorshipInput,
  ) {
    return this.pauseSponsorship(sponsorshipId, input, { donorUserId });
  }

  async pauseForAdmin(
    adminUserId: string,
    sponsorshipId: string,
    input: PauseSponsorshipInput,
  ) {
    return this.pauseSponsorship(sponsorshipId, input, { actorUserId: adminUserId });
  }

  async resumeForDonor(_donorUserId: string, _sponsorshipId: string) {
    throw new ForbiddenException("Only an admin can activate a sponsorship");
  }

  async completeForDonor(
    donorUserId: string,
    sponsorshipId: string,
    input: CompleteSponsorshipInput,
  ) {
    return this.markSponsorshipCompleted(sponsorshipId, input, { donorUserId });
  }

  async completeForAdmin(
    adminUserId: string,
    sponsorshipId: string,
    input: CompleteSponsorshipInput,
  ) {
    return this.markSponsorshipCompleted(sponsorshipId, input, {
      actorUserId: adminUserId,
    });
  }

  async disputeForDonor(
    donorUserId: string,
    sponsorshipId: string,
    input: DisputeSponsorshipInput,
  ) {
    return this.disputeSponsorship(sponsorshipId, input, { donorUserId });
  }

  async resumeForAdmin(adminUserId: string, sponsorshipId: string) {
    return this.resumeSponsorship(sponsorshipId, { actorUserId: adminUserId });
  }

  async cancelForDonor(
    donorUserId: string,
    sponsorshipId: string,
    input: CancelSponsorshipInput,
  ) {
    return this.cancelSponsorship(sponsorshipId, input, { donorUserId });
  }

  async cancelForAdmin(
    adminUserId: string,
    sponsorshipId: string,
    input: CancelSponsorshipInput,
  ) {
    return this.cancelSponsorship(sponsorshipId, input, { actorUserId: adminUserId });
  }

  async stopForDonor(
    donorUserId: string,
    sponsorshipId: string,
    input: StopSponsorshipInput,
  ): Promise<{ sponsorship: SponsorshipListItem }> {
    return this.stopSponsorship(sponsorshipId, donorUserId, input, {
      donorUserId,
    });
  }

  async stopForAdmin(
    adminUserId: string,
    sponsorshipId: string,
    input: StopSponsorshipInput,
  ): Promise<{ sponsorship: SponsorshipListItem }> {
    return this.stopSponsorship(sponsorshipId, adminUserId, input);
  }

  async disputeForAdmin(
    adminUserId: string,
    sponsorshipId: string,
    input: DisputeSponsorshipInput,
  ) {
    return this.disputeSponsorship(sponsorshipId, input, {
      actorUserId: adminUserId,
    });
  }

  async setStatusForAdmin(
    adminUserId: string,
    sponsorshipId: string,
    input: SetSponsorshipStatusInput,
  ): Promise<{ sponsorship: SponsorshipListItem }> {
    const targetStatus = input.status as SponsorshipStatusEnum;
    const wasActive = await this.dataSource.transaction(async (manager) => {
      const sponsorship = await manager.findOne(Sponsorship, {
        where: { id: sponsorshipId },
        lock: { mode: "pessimistic_write" },
      });

      if (!sponsorship) {
        throw new NotFoundException("Sponsorship request not found");
      }

      const previousStatus = sponsorship.status;
      if (previousStatus === targetStatus) {
        throw new BadRequestException("Sponsorship is already in this status");
      }

      sponsorship.status = targetStatus;
      sponsorship.reviewedBy = adminUserId;
      sponsorship.reviewedAt = new Date();

      if (input.notes?.trim()) {
        sponsorship.adminNotes = input.notes.trim();
      }

      if (targetStatus === SponsorshipStatusEnum.ACTIVE) {
        sponsorship.needsClarification = false;
        if (!sponsorship.activatedAt) {
          sponsorship.activatedAt = new Date();
        }
      }

      if (targetStatus === SponsorshipStatusEnum.COMPLETED) {
        sponsorship.completedAt = new Date();
      }

      if (targetStatus === SponsorshipStatusEnum.CANCELLED) {
        sponsorship.needsClarification = false;
      }

      if (targetStatus === SponsorshipStatusEnum.REQUESTED) {
        sponsorship.needsClarification = false;
        sponsorship.activatedAt = null;
        sponsorship.completedAt = null;
      }

      await manager.save(sponsorship);

      const affectsCoverage =
        previousStatus === SponsorshipStatusEnum.ACTIVE ||
        targetStatus === SponsorshipStatusEnum.ACTIVE;
      if (affectsCoverage) {
        await this.recalculateFamilyCoverage(manager, sponsorship.familyId);
      }

      return {
        becameActive:
          targetStatus === SponsorshipStatusEnum.ACTIVE &&
          previousStatus === SponsorshipStatusEnum.REQUESTED,
        sponsorshipId: sponsorship.id,
        familyId: sponsorship.familyId,
        donorUserId: sponsorship.donorUserId,
      };
    });

    if (wasActive.becameActive) {
      const withRelations = await this.sponsorshipRepo.findOne({
        where: { id: wasActive.sponsorshipId },
        relations: { family: true, donorUser: true },
      });
      if (withRelations) {
        const room = await this.chatService.ensureRoomForApprovedSponsorship(
          wasActive.familyId,
          wasActive.donorUserId,
          wasActive.sponsorshipId,
        );
        await this.chatService.deliverInitialSponsorshipMessage(
          withRelations,
          room.id,
          adminUserId,
        );
      }
    }

    await this.activityLogService.log({
      actorUserId: adminUserId,
      action: ActivityAction.SPONSORSHIP_REVIEWED,
      entityType: "sponsorship",
      entityId: sponsorshipId,
      summary: `Sponsorship status set to ${targetStatus}`,
      metadata: { status: targetStatus, notes: input.notes ?? null },
    });

    return this.loadListItem(sponsorshipId);
  }

  async syncCompletedSponsorships(): Promise<void> {
    const activeItems = await this.sponsorshipRepo.find({
      where: { status: SponsorshipStatusEnum.ACTIVE },
    });
    const now = new Date();

    for (const sponsorship of activeItems) {
      if (sponsorship.isOngoing || !sponsorship.activatedAt) continue;
      if (!sponsorship.durationMonths) continue;
      const endDate = new Date(sponsorship.activatedAt);
      endDate.setMonth(endDate.getMonth() + sponsorship.durationMonths);
      if (now >= endDate) {
        await this.autoCompleteExpiredSponsorship(sponsorship.id);
      }
    }
  }

  private async autoCompleteExpiredSponsorship(sponsorshipId: string) {
    await this.dataSource.transaction(async (manager) => {
      const sponsorship = await manager.findOne(Sponsorship, {
        where: { id: sponsorshipId },
        lock: { mode: "pessimistic_write" },
      });
      if (!sponsorship || sponsorship.status !== SponsorshipStatusEnum.ACTIVE) {
        return;
      }

      sponsorship.status = SponsorshipStatusEnum.COMPLETED;
      sponsorship.completedAt = new Date();
      await manager.save(sponsorship);
      await this.recalculateFamilyCoverage(manager, sponsorship.familyId);
    });
  }

  private async pauseSponsorship(
    sponsorshipId: string,
    input: PauseSponsorshipInput,
    options: { donorUserId?: string; actorUserId?: string },
  ) {
    const updated = await this.dataSource.transaction(async (manager) => {
      const sponsorship = await this.loadOwnedSponsorship(
        manager,
        sponsorshipId,
        options.donorUserId,
      );

      if (sponsorship.status !== SponsorshipStatusEnum.ACTIVE) {
        throw new BadRequestException("Only active sponsorships can be paused");
      }

      sponsorship.status = SponsorshipStatusEnum.PAUSED;
      if (input.notes?.trim()) {
        sponsorship.adminNotes = input.notes.trim();
      }
      const saved = await manager.save(sponsorship);
      await this.recalculateFamilyCoverage(manager, saved.familyId);
      return saved;
    });

    return this.loadListItem(updated.id);
  }

  private async resumeSponsorship(
    sponsorshipId: string,
    options: { donorUserId?: string; actorUserId?: string },
  ) {
    const updated = await this.dataSource.transaction(async (manager) => {
      const sponsorship = await this.loadOwnedSponsorship(
        manager,
        sponsorshipId,
        options.donorUserId,
      );

      if (sponsorship.status !== SponsorshipStatusEnum.PAUSED) {
        throw new BadRequestException("Only paused sponsorships can be resumed");
      }

      sponsorship.status = SponsorshipStatusEnum.ACTIVE;
      if (!sponsorship.activatedAt) {
        sponsorship.activatedAt = new Date();
      }
      const saved = await manager.save(sponsorship);
      await this.recalculateFamilyCoverage(manager, saved.familyId);
      return saved;
    });

    return this.loadListItem(updated.id);
  }

  private async cancelSponsorship(
    sponsorshipId: string,
    input: CancelSponsorshipInput,
    options: { donorUserId?: string; actorUserId?: string },
  ) {
    const updated = await this.dataSource.transaction(async (manager) => {
      const sponsorship = await this.loadOwnedSponsorship(
        manager,
        sponsorshipId,
        options.donorUserId,
      );

      if (
        sponsorship.status !== SponsorshipStatusEnum.REQUESTED &&
        sponsorship.status !== SponsorshipStatusEnum.ACTIVE &&
        sponsorship.status !== SponsorshipStatusEnum.PAUSED
      ) {
        throw new BadRequestException(
          "This sponsorship cannot be cancelled in its current status",
        );
      }

      sponsorship.status = SponsorshipStatusEnum.CANCELLED;
      sponsorship.needsClarification = false;
      if (input.notes?.trim()) {
        sponsorship.stopNotes = input.notes.trim();
      }
      const saved = await manager.save(sponsorship);
      await this.recalculateFamilyCoverage(manager, saved.familyId);
      return saved;
    });

    return this.loadListItem(updated.id);
  }

  private async markSponsorshipCompleted(
    sponsorshipId: string,
    input: CompleteSponsorshipInput,
    options: { donorUserId?: string; actorUserId?: string },
  ) {
    const updated = await this.dataSource.transaction(async (manager) => {
      const sponsorship = await this.loadOwnedSponsorship(
        manager,
        sponsorshipId,
        options.donorUserId,
      );

      if (
        sponsorship.status !== SponsorshipStatusEnum.ACTIVE &&
        sponsorship.status !== SponsorshipStatusEnum.PAUSED
      ) {
        throw new BadRequestException(
          "Only active or paused sponsorships can be completed",
        );
      }

      sponsorship.status = SponsorshipStatusEnum.COMPLETED;
      sponsorship.completedAt = new Date();
      if (input.notes?.trim()) {
        sponsorship.stopNotes = input.notes.trim();
      }
      const saved = await manager.save(sponsorship);
      await this.recalculateFamilyCoverage(manager, saved.familyId);
      return saved;
    });

    if (options.actorUserId) {
      await this.activityLogService.log({
        actorUserId: options.actorUserId,
        action: ActivityAction.SPONSORSHIP_COMPLETED,
        entityType: "sponsorship",
        entityId: updated.id,
        summary: "Sponsorship marked as completed",
      });
    }

    return this.loadListItem(updated.id);
  }

  private async stopSponsorship(
    sponsorshipId: string,
    stoppedByUserId: string,
    input: StopSponsorshipInput,
    options?: { donorUserId?: string },
  ) {
    const updated = await this.dataSource.transaction(async (manager) => {
      const sponsorship = await this.loadOwnedSponsorship(
        manager,
        sponsorshipId,
        options?.donorUserId,
      );

      if (sponsorship.status !== SponsorshipStatusEnum.ACTIVE) {
        throw new BadRequestException("Only active sponsorships can be stopped");
      }

      sponsorship.status = SponsorshipStatusEnum.STOPPED;
      sponsorship.stoppedAt = new Date();
      sponsorship.stoppedBy = stoppedByUserId;
      sponsorship.stopNotes = input.notes?.trim() || null;
      const saved = await manager.save(sponsorship);
      await this.recalculateFamilyCoverage(manager, saved.familyId);
      return saved;
    });

    return this.loadListItem(updated.id);
  }

  private async disputeSponsorship(
    sponsorshipId: string,
    input: DisputeSponsorshipInput,
    options: { donorUserId?: string; actorUserId?: string },
  ) {
    const updated = await this.dataSource.transaction(async (manager) => {
      const sponsorship = await this.loadOwnedSponsorship(
        manager,
        sponsorshipId,
        options.donorUserId,
      );

      if (
        sponsorship.status !== SponsorshipStatusEnum.ACTIVE &&
        sponsorship.status !== SponsorshipStatusEnum.PAUSED
      ) {
        throw new BadRequestException(
          "Only active or paused sponsorships can be marked as disputed",
        );
      }

      sponsorship.status = SponsorshipStatusEnum.DISPUTED;
      if (options.actorUserId) {
        sponsorship.reviewedBy = options.actorUserId;
        sponsorship.reviewedAt = new Date();
      }
      if (input.notes?.trim()) {
        sponsorship.adminNotes = input.notes.trim();
      }
      const saved = await manager.save(sponsorship);
      await this.recalculateFamilyCoverage(manager, saved.familyId);
      return saved;
    });

    if (options.actorUserId) {
      await this.activityLogService.log({
        actorUserId: options.actorUserId,
        action: ActivityAction.SPONSORSHIP_DISPUTED,
        entityType: "sponsorship",
        entityId: updated.id,
        summary: "Sponsorship marked as disputed",
      });
    }

    return this.loadListItem(updated.id);
  }

  private async loadOwnedSponsorship(
    manager: EntityManager,
    sponsorshipId: string,
    donorUserId?: string,
  ) {
    const sponsorship = await manager.findOne(Sponsorship, {
      where: { id: sponsorshipId },
      lock: { mode: "pessimistic_write" },
    });

    if (!sponsorship) {
      throw new NotFoundException("Sponsorship request not found");
    }

    if (donorUserId && sponsorship.donorUserId !== donorUserId) {
      throw new NotFoundException("Sponsorship request not found");
    }

    return sponsorship;
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
      throw new NotFoundException("Family not found");
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
    family.coverageStatus = this.deriveCoverageStatus(
      monthlyRequired,
      newCovered,
    );

    await manager.save(family);
  }

  private async loadListItem(sponsorshipId: string) {
    const withRelations = await this.sponsorshipRepo.findOne({
      where: { id: sponsorshipId },
      relations: { family: true, donorUser: true },
    });
    if (!withRelations) {
      throw new Error("Failed to load sponsorship");
    }
    return { sponsorship: await this.toListItemWithCount(withRelations) };
  }

  private resolveMonthlyAmount(
    type: "full" | "partial",
    amount: number | undefined,
    monthlyRequired: number,
  ): number {
    if (type === "full") {
      return monthlyRequired;
    }

    const partialAmount = amount;
    if (partialAmount === undefined || partialAmount <= 0) {
      throw new BadRequestException(
        "Amount is required for partial sponsorship",
      );
    }

    if (partialAmount > monthlyRequired) {
      throw new BadRequestException(
        "Partial amount cannot exceed the family's monthly required amount",
      );
    }

    return partialAmount;
  }

  private deriveCoverageStatus(
    monthlyRequired: number,
    monthlyCovered: number,
  ): CoverageStatusEnum {
    if (monthlyCovered <= 0) {
      return CoverageStatusEnum.NOT_COVERED;
    }
    if (monthlyCovered >= monthlyRequired) {
      return CoverageStatusEnum.FULLY_COVERED;
    }
    return CoverageStatusEnum.PARTIALLY_COVERED;
  }

  private async findFamilyForUser(familyUserId: string): Promise<Family> {
    const family = await this.familyRepo.findOne({
      where: { familyUserId },
    });

    if (!family) {
      throw new NotFoundException("No family profile linked to this account");
    }

    if (!family.familyLoginEnabled) {
      throw new ForbiddenException("Family dashboard access is disabled");
    }

    return family;
  }

  private resolveSelectedReceivingMethod(
    familyMethods: Array<Record<string, string>>,
    index: number,
  ): Record<string, string> {
    if (index < 0 || index >= familyMethods.length) {
      throw new BadRequestException("Invalid receiving method selection");
    }

    const method = familyMethods[index]!;
    return { method: method.method ?? "" };
  }

  private canViewReceivingDetails(status: SponsorshipStatusEnum): boolean {
    return (
      status === SponsorshipStatusEnum.ACTIVE ||
      status === SponsorshipStatusEnum.PAUSED ||
      status === SponsorshipStatusEnum.COMPLETED ||
      status === SponsorshipStatusEnum.STOPPED ||
      status === SponsorshipStatusEnum.DISPUTED
    );
  }

  private resolveReceivingMethodsForListItem(
    sponsorship: Sponsorship,
  ): SponsorshipListItem["selectedReceivingMethods"] {
    const familyMethods = sponsorship.family?.receivingMethods ?? [];
    const index = sponsorship.selectedReceivingMethodIndex ?? 0;
    const canViewDetails = this.canViewReceivingDetails(sponsorship.status);

    if (canViewDetails && familyMethods[index]) {
      return [
        familyMethods[index] as unknown as SponsorshipListItem["selectedReceivingMethods"][number],
      ];
    }

    const stored = sponsorship.selectedReceivingMethods?.[0];
    if (stored?.method) {
      return [{ method: stored.method as SponsorshipListItem["selectedReceivingMethods"][number]["method"] }];
    }

    return [];
  }

  private async toListItems(
    sponsorships: Sponsorship[],
  ): Promise<SponsorshipListItem[]> {
    const counts = await this.transferProofsService.countApprovedForSponsorships(
      sponsorships.map((item) => item.id),
    );
    return sponsorships.map((item) => ({
      ...this.toListItem(item),
      approvedTransferCount: counts.get(item.id) ?? 0,
    }));
  }

  private async toListItemWithCount(
    sponsorship: Sponsorship,
  ): Promise<SponsorshipListItem> {
    const [item] = await this.toListItems([sponsorship]);
    return item!;
  }

  private toListItem(sponsorship: Sponsorship): SponsorshipListItem {
    const donor = sponsorship.donorUser;
    const family = sponsorship.family;

    return {
      id: sponsorship.id,
      familyId: sponsorship.familyId,
      familyPublicCode: family?.publicCode ?? "",
      donorUserId: sponsorship.donorUserId,
      donorName: donor
        ? `${donor.firstName} ${donor.lastName}`.trim()
        : "",
      donorEmail: donor?.email ?? "",
      type: sponsorship.type,
      monthlyAmount: Number(sponsorship.monthlyAmount),
      durationPreset: fieldsToDurationPreset(
        sponsorship.durationMonths,
        sponsorship.isOngoing,
      ),
      durationMonths: sponsorship.durationMonths,
      isOngoing: sponsorship.isOngoing,
      notes: sponsorship.notes,
      selectedReceivingMethodIndex: sponsorship.selectedReceivingMethodIndex ?? 0,
      selectedReceivingMethods: this.resolveReceivingMethodsForListItem(sponsorship),
      canViewReceivingDetails: this.canViewReceivingDetails(sponsorship.status),
      initialMessage: sponsorship.initialMessage,
      receiptUrl: sponsorship.receiptUrl,
      status: sponsorship.status,
      needsClarification: sponsorship.needsClarification,
      adminNotes: sponsorship.adminNotes,
      reviewedAt: sponsorship.reviewedAt?.toISOString() ?? null,
      activatedAt: sponsorship.activatedAt?.toISOString() ?? null,
      completedAt: sponsorship.completedAt?.toISOString() ?? null,
      stoppedAt: sponsorship.stoppedAt?.toISOString() ?? null,
      stopNotes: sponsorship.stopNotes,
      createdAt: sponsorship.createdAt.toISOString(),
      updatedAt: sponsorship.updatedAt.toISOString(),
    };
  }
}
