import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type {
  ActivityLogListItem,
  AdminDashboardOverview,
  ChatMessageListItem,
  DonorListItem,
  ProfileUpdateRequestListItem,
  SponsorshipListItem,
} from "@muakhah/contracts";
import type { FamilySelfUpdatableFieldKey } from "@muakhah/contracts";
import { fieldsToDurationPreset } from "@muakhah/contracts";
import { In, Repository } from "typeorm";
import { ActivityLog } from "../entities/activity-log.entity";
import { ChatMessage, ChatMessageStatusEnum } from "../entities/chat-message.entity";
import {
  CoverageStatusEnum,
  Family,
  FamilyProfileStatusEnum,
} from "../entities/family.entity";
import {
  FamilyProfileUpdateRequest,
  ProfileUpdateRequestStatusEnum,
} from "../entities/family-profile-update-request.entity";
import {
  Sponsorship,
  SponsorshipStatusEnum,
  SponsorshipTypeEnum,
} from "../entities/sponsorship.entity";
import { User, UserStatusEnum, UserTypeEnum } from "../entities/user.entity";
import { SubAdminsService } from "../sub-admins/sub-admins.service";
import { ChatService } from "../chat/chat.service";
import { TransferProofsService } from "../transfer-proofs/transfer-proofs.service";

const RECENT_LIST_LIMIT = 5;
const LATEST_CHAT_ROOMS_LIMIT = 10;

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectRepository(Family)
    private readonly familyRepo: Repository<Family>,
    @InjectRepository(Sponsorship)
    private readonly sponsorshipRepo: Repository<Sponsorship>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(FamilyProfileUpdateRequest)
    private readonly profileUpdateRepo: Repository<FamilyProfileUpdateRequest>,
    @InjectRepository(ActivityLog)
    private readonly activityLogRepo: Repository<ActivityLog>,
    private readonly subAdminsService: SubAdminsService,
    private readonly chatService: ChatService,
    private readonly transferProofsService: TransferProofsService,
  ) {}

  async getOverview(): Promise<{ overview: AdminDashboardOverview }> {
    const [
      totalFamilies,
      hiddenFamilies,
      partiallySponsoredFamilies,
      fullyCoveredFamilies,
      totalSponsors,
      activeSponsorshipRelationships,
      messagesPendingReview,
      profileUpdateRequestsPending,
      totalActivityLogs,
      partialActiveSponsorships,
      fullActiveSponsorships,
      familiesNotCovered,
      familiesExpired,
      sponsorshipRequested,
      sponsorshipActive,
      sponsorshipPaused,
      sponsorshipCompleted,
      sponsorshipCancelled,
      sponsorshipStopped,
      sponsorshipDisputed,
      topDonorRows,
      subAdminsResult,
      latestSponsors,
      latestActiveSponsorships,
      latestPendingMessages,
      latestProfileUpdateRequests,
      latestActivityLogs,
      chatMessageStatusRows,
      chatRoomsResult,
      transferProofSummary,
    ] = await Promise.all([
      this.familyRepo.count(),
      this.familyRepo.count({
        where: { profileStatus: FamilyProfileStatusEnum.HIDDEN },
      }),
      this.familyRepo.count({
        where: { coverageStatus: CoverageStatusEnum.PARTIALLY_COVERED },
      }),
      this.familyRepo.count({
        where: { coverageStatus: CoverageStatusEnum.FULLY_COVERED },
      }),
      this.userRepo.count({
        where: {
          userType: In([UserTypeEnum.VISITOR, UserTypeEnum.SPONSOR]),
          status: UserStatusEnum.ACTIVE,
        },
      }),
      this.sponsorshipRepo.count({
        where: { status: SponsorshipStatusEnum.ACTIVE },
      }),
      this.messageRepo.count({
        where: { status: ChatMessageStatusEnum.PENDING },
      }),
      this.profileUpdateRepo.count({
        where: { status: ProfileUpdateRequestStatusEnum.PENDING },
      }),
      this.activityLogRepo.count(),
      this.sponsorshipRepo.count({
        where: {
          status: SponsorshipStatusEnum.ACTIVE,
          type: SponsorshipTypeEnum.PARTIAL,
        },
      }),
      this.sponsorshipRepo.count({
        where: {
          status: SponsorshipStatusEnum.ACTIVE,
          type: SponsorshipTypeEnum.FULL,
        },
      }),
      this.familyRepo.count({
        where: { coverageStatus: CoverageStatusEnum.NOT_COVERED },
      }),
      this.familyRepo.count({
        where: { coverageStatus: CoverageStatusEnum.EXPIRED },
      }),
      this.sponsorshipRepo.count({
        where: { status: SponsorshipStatusEnum.REQUESTED },
      }),
      this.sponsorshipRepo.count({
        where: { status: SponsorshipStatusEnum.ACTIVE },
      }),
      this.sponsorshipRepo.count({
        where: { status: SponsorshipStatusEnum.PAUSED },
      }),
      this.sponsorshipRepo.count({
        where: { status: SponsorshipStatusEnum.COMPLETED },
      }),
      this.sponsorshipRepo.count({
        where: { status: SponsorshipStatusEnum.CANCELLED },
      }),
      this.sponsorshipRepo.count({
        where: { status: SponsorshipStatusEnum.STOPPED },
      }),
      this.sponsorshipRepo.count({
        where: { status: SponsorshipStatusEnum.DISPUTED },
      }),
      this.loadTopDonors(),
      this.subAdminsService.list(),
      this.loadLatestSponsors(),
      this.loadLatestActiveSponsorships(),
      this.loadLatestPendingMessages(),
      this.loadLatestProfileUpdateRequests(),
      this.loadLatestActivityLogs(),
      this.messageRepo
        .createQueryBuilder("message")
        .select("message.status", "status")
        .addSelect("COUNT(*)", "count")
        .groupBy("message.status")
        .getRawMany<{ status: string; count: string }>(),
      this.chatService.listRoomsForAdmin(),
      this.transferProofsService.getDashboardSummary(),
    ]);

    const chatMessageStatusBreakdown = {
      pending: 0,
      approved: 0,
      rejected: 0,
      escalated: 0,
      edited: 0,
    };
    for (const row of chatMessageStatusRows) {
      const key = row.status as keyof typeof chatMessageStatusBreakdown;
      if (key in chatMessageStatusBreakdown) {
        chatMessageStatusBreakdown[key] = Number(row.count ?? 0);
      }
    }

    const latestChatRooms = chatRoomsResult.rooms.slice(0, LATEST_CHAT_ROOMS_LIMIT);

    return {
      overview: {
        totalFamilies,
        hiddenFamilies,
        partiallySponsoredFamilies,
        fullyCoveredFamilies,
        totalSponsors,
        activeSponsorshipRelationships,
        messagesPendingReview,
        profileUpdateRequestsPending,
        totalActivityLogs,
        sponsorshipTypeBreakdown: {
          partial: partialActiveSponsorships,
          full: fullActiveSponsorships,
        },
        familyCoverageBreakdown: {
          partiallyCovered: partiallySponsoredFamilies,
          fullyCovered: fullyCoveredFamilies,
          notCovered: familiesNotCovered,
          expired: familiesExpired,
        },
        sponsorshipStatusBreakdown: {
          requested: sponsorshipRequested,
          active: sponsorshipActive,
          paused: sponsorshipPaused,
          completed: sponsorshipCompleted,
          cancelled: sponsorshipCancelled,
          stopped: sponsorshipStopped,
          disputed: sponsorshipDisputed,
        },
        chatMessageStatusBreakdown,
        transferProofStatusBreakdown: transferProofSummary.transferProofStatusBreakdown,
        totalTransferProofs: transferProofSummary.totalTransferProofs,
        transferProofsPendingReview: transferProofSummary.transferProofsPendingReview,
        topDonors: topDonorRows,
        subAdmins: subAdminsResult.subAdmins,
        recentLists: {
          latestSponsors,
          latestActiveSponsorships,
          latestPendingMessages,
          latestProfileUpdateRequests,
          latestActivityLogs,
          latestChatRooms,
          latestTransferProofs: transferProofSummary.latestTransferProofs,
          latestPendingTransferProofs: transferProofSummary.latestPendingTransferProofs,
        },
      },
    };
  }

  private async loadLatestSponsors(): Promise<DonorListItem[]> {
    const donors = await this.userRepo.find({
      where: {
        userType: In([UserTypeEnum.VISITOR, UserTypeEnum.SPONSOR]),
      },
      order: { createdAt: "DESC" },
      take: RECENT_LIST_LIMIT,
    });

    return donors.map((donor) => this.toDonorListItem(donor));
  }

  private async loadLatestActiveSponsorships(): Promise<SponsorshipListItem[]> {
    const items = await this.sponsorshipRepo.find({
      where: { status: SponsorshipStatusEnum.ACTIVE },
      relations: { donorUser: true, family: true },
      order: { createdAt: "DESC" },
      take: RECENT_LIST_LIMIT,
    });

    return items.map((item) => this.toSponsorshipListItem(item));
  }

  private async loadLatestPendingMessages(): Promise<ChatMessageListItem[]> {
    const messages = await this.messageRepo.find({
      where: { status: ChatMessageStatusEnum.PENDING },
      relations: { senderUser: true },
      order: { createdAt: "DESC" },
      take: RECENT_LIST_LIMIT,
    });

    return messages.map((message) => this.toChatMessageListItem(message));
  }

  private async loadLatestProfileUpdateRequests(): Promise<
    ProfileUpdateRequestListItem[]
  > {
    const items = await this.profileUpdateRepo.find({
      where: { status: ProfileUpdateRequestStatusEnum.PENDING },
      relations: { family: true },
      order: { createdAt: "DESC" },
      take: RECENT_LIST_LIMIT,
    });

    return items.map((item) => this.toProfileUpdateListItem(item));
  }

  private async loadLatestActivityLogs(): Promise<ActivityLogListItem[]> {
    const rows = await this.activityLogRepo.find({
      order: { createdAt: "DESC" },
      take: RECENT_LIST_LIMIT,
    });

    const actorIds = [...new Set(rows.map((row) => row.actorUserId))];
    const actors =
      actorIds.length > 0
        ? await this.userRepo.find({ where: { id: In(actorIds) } })
        : [];
    const actorMap = new Map(actors.map((actor) => [actor.id, actor]));

    return rows.map((row) => {
      const actor = actorMap.get(row.actorUserId);
      return {
        id: row.id,
        actorUserId: row.actorUserId,
        actorName: actor
          ? `${actor.firstName} ${actor.lastName}`.trim()
          : "Unknown",
        actorEmail: actor?.email ?? "",
        actorAdminRole: (row.actorAdminRole as ActivityLogListItem["actorAdminRole"]) ?? null,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        summary: row.summary,
        metadata: row.metadata,
        createdAt: row.createdAt.toISOString(),
      };
    });
  }

  private toDonorListItem(donor: User): DonorListItem {
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

  private toSponsorshipListItem(sponsorship: Sponsorship): SponsorshipListItem {
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
      selectedReceivingMethods: (sponsorship.selectedReceivingMethods ??
        []) as unknown as SponsorshipListItem["selectedReceivingMethods"],
      canViewReceivingDetails: true,
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

  private toChatMessageListItem(message: ChatMessage): ChatMessageListItem {
    const sender = message.senderUser;

    return {
      id: message.id,
      roomId: message.roomId,
      senderRole: message.senderRole,
      senderName: sender
        ? `${sender.firstName} ${sender.lastName}`.trim()
        : "",
      type: message.type,
      content: message.content,
      mediaUrl: message.mediaUrl,
      mediaKind: message.mediaKind,
      status: message.status,
      adminNotes: message.adminNotes,
      reviewedAt: message.reviewedAt?.toISOString() ?? null,
      createdAt: message.createdAt.toISOString(),
    };
  }

  private toProfileUpdateListItem(
    request: FamilyProfileUpdateRequest,
  ): ProfileUpdateRequestListItem {
    return {
      id: request.id,
      familyId: request.familyId,
      familyPublicCode: request.family?.publicCode ?? "",
      fieldKey: request.fieldKey as FamilySelfUpdatableFieldKey,
      currentValue: request.currentValue,
      requestedValue: request.requestedValue,
      status: request.status,
      adminNotes: request.adminNotes,
      reviewedAt: request.reviewedAt?.toISOString() ?? null,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    };
  }

  private async loadTopDonors() {
    const rows = await this.sponsorshipRepo
      .createQueryBuilder("s")
      .innerJoin(User, "u", "u.id = s.donor_user_id")
      .select("u.id", "id")
      .addSelect("u.first_name", "firstName")
      .addSelect("u.last_name", "lastName")
      .addSelect("u.email", "email")
      .addSelect("u.profile_image_url", "profileImageUrl")
      .addSelect("SUM(s.monthly_amount)", "totalMonthlyAmount")
      .addSelect("COUNT(*)", "activeSponsorships")
      .where("s.status = :status", { status: SponsorshipStatusEnum.ACTIVE })
      .groupBy("u.id")
      .addGroupBy("u.first_name")
      .addGroupBy("u.last_name")
      .addGroupBy("u.email")
      .addGroupBy("u.profile_image_url")
      .orderBy("SUM(s.monthly_amount)", "DESC")
      .limit(10)
      .getRawMany<{
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        profileImageUrl: string | null;
        totalMonthlyAmount: string;
        activeSponsorships: string;
      }>();

    return rows.map((row) => ({
      id: row.id,
      fullName: `${row.firstName} ${row.lastName}`.trim(),
      email: row.email,
      profileImageUrl: row.profileImageUrl,
      totalMonthlyAmount: Number(row.totalMonthlyAmount ?? 0),
      activeSponsorships: Number(row.activeSponsorships ?? 0),
    }));
  }
}
