import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectRepository } from "@nestjs/typeorm";

import type {
  CreateFamilyInput,
  FamilyMediaItemView,
  PublicFamilyQuery,
  UpdateFamilyInput,
} from "@muakhah/contracts";
import { ActivityAction } from "@muakhah/contracts";
import * as bcrypt from "bcrypt";
import { ActivityLogService } from "../activity-logs/activity-log.service";

import { randomBytes } from "crypto";

import { DataSource, In, Repository } from "typeorm";

import {

  CaseCategoryEnum,

  CoverageStatusEnum,

  DisplacementStatusEnum,

  Family,

  FamilyProfileStatusEnum,

  GovernorateEnum,

  HousingStatusEnum,

  IncomeStatusEnum,

  PriorityLevelEnum,

} from "../entities/family.entity";

import type { UploadedMediaFile } from "../common/types/uploaded-file.type";
import { S3Service } from "../storage/s3.service";
import { User, UserStatusEnum, UserTypeEnum } from "../entities/user.entity";
import {
  Sponsorship,
  SponsorshipStatusEnum,
} from "../entities/sponsorship.entity";
import { ChatRoom } from "../entities/chat-room.entity";
import { ChatMessage } from "../entities/chat-message.entity";
import { TransferProof } from "../entities/transfer-proof.entity";
import { SponsorTicket } from "../entities/sponsor-ticket.entity";
import { SponsorTicketMessage } from "../entities/sponsor-ticket-message.entity";
import { FamilyProfileUpdateRequest } from "../entities/family-profile-update-request.entity";
import {
  matchesPublicFamilyQuery,
  needsActiveSponsorships,
  shouldIncludeFullySponsoredFamily,
} from "./public-family-filters";



function parseEnumValue<T extends Record<string, string>>(

  enumObj: T,

  value: string,

): T[keyof T] {

  return value as T[keyof T];

}




function splitHeadName(fullName: string): {

  firstName: string;

  lastName: string;

} {

  const parts = fullName.trim().split(/\s+/);

  if (parts.length === 1) {

    return { firstName: parts[0]!, lastName: "-" };

  }

  return {

    firstName: parts[0]!,

    lastName: parts.slice(1).join(" "),

  };

}



function generatePublicCode(): string {

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  const bytes = randomBytes(8);

  let code = "";

  for (let i = 0; i < 8; i++) {

    code += chars[bytes[i]! % chars.length]!;

  }

  return code;

}



async function generateUniquePublicCode(

  familyRepo: Repository<Family>,

): Promise<string> {

  for (let attempt = 0; attempt < 10; attempt++) {

    const code = generatePublicCode();

    const existing = await familyRepo.findOne({ where: { publicCode: code } });

    if (!existing) {

      return code;

    }

  }

  throw new ConflictException("Unable to generate unique public family code");

}



function isAccountRestricted(family: Family): boolean {

  return (

    !family.familyLoginEnabled ||

    family.familyUser?.status === UserStatusEnum.SUSPENDED ||

    family.profileStatus === FamilyProfileStatusEnum.SUSPENDED

  );

}



@Injectable()

export class FamiliesService {

  constructor(

    @InjectRepository(Family)

    private readonly familyRepo: Repository<Family>,

    @InjectRepository(User)

    private readonly userRepo: Repository<User>,

    @InjectRepository(Sponsorship)

    private readonly sponsorshipRepo: Repository<Sponsorship>,

    private readonly dataSource: DataSource,

    private readonly s3Service: S3Service,

    private readonly activityLogService: ActivityLogService,

  ) {}



  async listForAdmin() {

    const families = await this.familyRepo.find({

      order: { createdAt: "DESC" },

      relations: ["familyUser"],

    });



    return families.map((family) => this.toListItem(family));

  }

  async listPublic(query: PublicFamilyQuery = {}) {
    const families = await this.familyRepo.find({
      where: { profileStatus: FamilyProfileStatusEnum.PUBLISHED },
      order: { createdAt: "DESC" },
    });

    const sponsorshipsByFamilyId = await this.loadActiveSponsorshipsByFamilyId(
      families.map((family) => family.id),
      needsActiveSponsorships(query),
    );

    const includeFullySponsored = shouldIncludeFullySponsoredFamily(query);

    return {
      families: families
        .filter((family) => {
          if (
            !includeFullySponsored &&
            this.isFamilyFullySponsored(family)
          ) {
            return false;
          }

          return matchesPublicFamilyQuery(
            family,
            query,
            sponsorshipsByFamilyId.get(family.id) ?? [],
          );
        })
        .map((family) => this.toPublicProfile(family)),
    };
  }

  async findPublicByCode(publicCode: string) {
    const family = await this.familyRepo.findOne({
      where: { publicCode },
    });

    if (
      !family ||
      !this.isFamilyBrowsable(family) ||
      this.isFamilyFullySponsored(family)
    ) {
      throw new NotFoundException("Family not found");
    }

    return { family: this.toPublicProfile(family) };
  }

  async listForDonor(donorUserId: string, query: PublicFamilyQuery = {}) {
    const families = await this.familyRepo.find({
      where: { profileStatus: FamilyProfileStatusEnum.PUBLISHED },
      order: { createdAt: "DESC" },
    });

    const activeFamilyIds = await this.getActiveFamilyIdsForDonor(donorUserId);
    const sponsorshipsByFamilyId = await this.loadActiveSponsorshipsByFamilyId(
      families.map((family) => family.id),
      needsActiveSponsorships(query),
    );
    const includeFullySponsored = shouldIncludeFullySponsoredFamily(query);

    return {
      families: families
        .filter((family) => {
          if (
            !includeFullySponsored &&
            this.isFamilyFullySponsored(family)
          ) {
            return false;
          }

          return matchesPublicFamilyQuery(
            family,
            query,
            sponsorshipsByFamilyId.get(family.id) ?? [],
          );
        })
        .map((family) =>
          this.toPublicProfileForDonor(family, activeFamilyIds.has(family.id)),
        ),
    };
  }

  async listMyFamiliesForDonor(donorUserId: string) {
    const sponsoredStatuses = [
      SponsorshipStatusEnum.ACTIVE,
      SponsorshipStatusEnum.PAUSED,
      SponsorshipStatusEnum.COMPLETED,
      SponsorshipStatusEnum.STOPPED,
      SponsorshipStatusEnum.DISPUTED,
    ];

    const sponsorships = await this.sponsorshipRepo.find({
      where: {
        donorUserId,
        status: In(sponsoredStatuses),
      },
      select: { familyId: true },
    });

    const familyIds = [...new Set(sponsorships.map((item) => item.familyId))];
    if (familyIds.length === 0) {
      return { families: [] };
    }

    const families = await this.familyRepo.find({
      where: { id: In(familyIds) },
      order: { createdAt: "DESC" },
    });

    const activeFamilyIds = await this.getActiveFamilyIdsForDonor(donorUserId);

    return {
      families: families.map((family) =>
        this.toPublicProfileForDonor(family, activeFamilyIds.has(family.id)),
      ),
    };
  }

  async findByFamilyUserId(familyUserId: string): Promise<Family> {
    const family = await this.familyRepo.findOne({
      where: { familyUserId },
      relations: { familyUser: true },
    });

    if (!family) {
      throw new NotFoundException("No family profile linked to this account");
    }

    if (
      !family.familyLoginEnabled ||
      family.profileStatus === FamilyProfileStatusEnum.SUSPENDED
    ) {
      throw new ForbiddenException("Family dashboard access is disabled");
    }

    return family;
  }

  async findByPublicCodeForDonor(publicCode: string, donorUserId: string) {
    const family = await this.familyRepo.findOne({
      where: { publicCode },
    });

    if (!family || !this.isFamilyBrowsable(family)) {
      throw new NotFoundException("Family not found");
    }

    const hasActive = await this.sponsorshipRepo.exists({
      where: {
        donorUserId,
        familyId: family.id,
        status: SponsorshipStatusEnum.ACTIVE,
      },
    });

    if (this.isFamilyFullySponsored(family) && !hasActive) {
      throw new NotFoundException("Family not found");
    }

    return {
      family: this.toPublicProfileForDonor(family, hasActive),
    };
  }



  async listDetailsForAdmin() {

    const families = await this.familyRepo.find({

      order: { createdAt: "DESC" },

      relations: ["familyUser"],

    });



    return families.map((family) => this.toDetail(family));

  }



  async createForAdmin(
    input: CreateFamilyInput,
    adminUserId: string,
    mediaFiles: UploadedMediaFile[] = [],
  ) {

    const email = input.accountEmail.toLowerCase();

    const existingUser = await this.userRepo.findOne({ where: { email } });

    if (existingUser) {

      throw new ConflictException("Family login email is already in use");

    }



    const publicCode = await generateUniquePublicCode(this.familyRepo);

    const passwordHash = await bcrypt.hash(input.accountPassword, 12);

    const { firstName, lastName } = splitHeadName(input.headOfFamilyName);

    const monthlyRequired = input.monthlyRequiredAmount;



    const detail = await this.dataSource.transaction(async (manager) => {

      const user = manager.create(User, {

        email,

        passwordHash,

        firstName,

        lastName,

        userType: UserTypeEnum.FAMILY,

        status: UserStatusEnum.ACTIVE,

        profileImageUrl: null,

      });

      const savedUser = await manager.save(user);



      const family = manager.create(Family, {

        publicCode,

        pilotBatchNumber: input.pilotBatchNumber,

        isPilotFamily: input.isPilotFamily,

        pilotNotes: input.pilotNotes ?? null,

        headOfFamilyName: input.headOfFamilyName,

        headOfFamilyNameAr: input.headOfFamilyNameAr ?? null,

        nationalId: input.nationalId ?? null,

        internalPhone: input.internalPhone ?? null,

        detailedAddress: input.detailedAddress ?? null,

        detailedAddressAr: input.detailedAddressAr ?? null,

        dataSource: input.dataSource ?? null,

        assignedCaseOfficer: input.assignedCaseOfficer ?? null,

        governorate: parseEnumValue(GovernorateEnum, input.governorate),

        areaGeneral: input.areaGeneral ?? null,

        areaGeneralAr: input.areaGeneralAr ?? null,

        familySize: input.familySize,

        childrenCount: input.childrenCount,

        womenCount: input.womenCount,

        elderlyCount: input.elderlyCount,

        infantCount: input.infantCount,

        externalLinks: input.externalLinks ?? null,

        receivingMethods: input.receivingMethods ?? [],

        mediaItems: [],

        hasWidow: input.hasWidow,

        hasOrphans: input.hasOrphans,

        hasDisabledMember: input.hasDisabledMember,

        hasChronicPatient: input.hasChronicPatient,

        housingStatus: parseEnumValue(HousingStatusEnum, input.housingStatus),

        incomeStatus: parseEnumValue(IncomeStatusEnum, input.incomeStatus),

        displacementStatus: parseEnumValue(

          DisplacementStatusEnum,

          input.displacementStatus,

        ),

        caseCategory: parseEnumValue(CaseCategoryEnum, input.caseCategory),

        priorityLevel: parseEnumValue(PriorityLevelEnum, input.priorityLevel),

        monthlyRequiredAmount: monthlyRequired.toFixed(2),

        monthlyCoveredAmount: "0.00",

        monthlyRemainingAmount: monthlyRequired.toFixed(2),

        publicStory: input.publicStory ?? null,

        publicStoryAr: input.publicStoryAr ?? null,

        profileStatus: parseEnumValue(

          FamilyProfileStatusEnum,

          input.profileStatus ?? FamilyProfileStatusEnum.PUBLISHED,

        ),

        coverageStatus: CoverageStatusEnum.NOT_COVERED,

        familyLoginEnabled: true,

        familyUserId: savedUser.id,

        internalNotes: input.internalNotes ?? null,

        verificationNotes: input.verificationNotes ?? null,

        createdBy: adminUserId,

      });



      const savedFamily = await manager.save(family);

      const mediaSensitivity = input.mediaSensitivity ?? [];
      const mediaItems = [];
      for (let i = 0; i < mediaFiles.length; i++) {
        try {
          const item = await this.s3Service.uploadFamilyMedia(
            mediaFiles[i],
            savedFamily.id,
            mediaSensitivity[i] ?? false,
          );
          mediaItems.push(item);
        } catch {
          // Skip invalid media if S3 is not configured
        }
      }
      if (mediaItems.length > 0) {
        savedFamily.mediaItems = mediaItems;
        await manager.save(savedFamily);
      }

      return this.toDetail({ ...savedFamily, familyUser: savedUser });

    });

    await this.activityLogService.log({
      actorUserId: adminUserId,
      action: ActivityAction.FAMILY_CREATED,
      entityType: "family",
      entityId: detail.id,
      summary: `Family created: ${detail.publicCode}`,
    });

    return detail;
  }



  async findByIdForAdmin(id: string) {

    const family = await this.loadFamilyOrThrow(id);

    return this.toDetail(family);

  }



  async updateForAdmin(id: string, input: UpdateFamilyInput) {

    const family = await this.loadFamilyOrThrow(id);

    const email = input.accountEmail.toLowerCase();



    if (family.familyUser && family.familyUser.email !== email) {

      const existingUser = await this.userRepo.findOne({ where: { email } });

      if (existingUser) {

        throw new ConflictException("Family login email is already in use");

      }

    }



    const monthlyRequired = input.monthlyRequiredAmount;

    const monthlyCovered = Number(family.monthlyCoveredAmount);

    const monthlyRemaining = Math.max(0, monthlyRequired - monthlyCovered);



    return this.dataSource.transaction(async (manager) => {

      if (family.familyUser) {

        const { firstName, lastName } = splitHeadName(input.headOfFamilyName);

        family.familyUser.email = email;

        family.familyUser.firstName = firstName;

        family.familyUser.lastName = lastName;



        if (input.accountPassword) {

          family.familyUser.passwordHash = await bcrypt.hash(

            input.accountPassword,

            12,

          );

        }



        await manager.save(family.familyUser);

      }



      family.headOfFamilyName = input.headOfFamilyName;

      family.headOfFamilyNameAr = input.headOfFamilyNameAr ?? null;

      family.nationalId = input.nationalId ?? null;

      family.internalPhone = input.internalPhone ?? null;

      family.detailedAddress = input.detailedAddress ?? null;

      family.detailedAddressAr = input.detailedAddressAr ?? null;

      family.dataSource = input.dataSource ?? null;

      family.assignedCaseOfficer = input.assignedCaseOfficer ?? null;

      family.internalNotes = input.internalNotes ?? null;

      family.verificationNotes = input.verificationNotes ?? null;

      family.governorate = parseEnumValue(GovernorateEnum, input.governorate);

      family.areaGeneral = input.areaGeneral ?? null;

      family.areaGeneralAr = input.areaGeneralAr ?? null;

      family.familySize = input.familySize;

      family.childrenCount = input.childrenCount;

      family.womenCount = input.womenCount;

      family.elderlyCount = input.elderlyCount;

      family.infantCount = input.infantCount;

      family.externalLinks = input.externalLinks ?? null;

      family.receivingMethods = input.receivingMethods ?? [];

      family.hasWidow = input.hasWidow;

      family.hasOrphans = input.hasOrphans;

      family.hasDisabledMember = input.hasDisabledMember;

      family.hasChronicPatient = input.hasChronicPatient;

      family.housingStatus = parseEnumValue(

        HousingStatusEnum,

        input.housingStatus,

      );

      family.incomeStatus = parseEnumValue(

        IncomeStatusEnum,

        input.incomeStatus,

      );

      family.displacementStatus = parseEnumValue(

        DisplacementStatusEnum,

        input.displacementStatus,

      );

      family.caseCategory = parseEnumValue(

        CaseCategoryEnum,

        input.caseCategory,

      );

      family.priorityLevel = parseEnumValue(

        PriorityLevelEnum,

        input.priorityLevel,

      );

      family.monthlyRequiredAmount = monthlyRequired.toFixed(2);

      family.monthlyRemainingAmount = monthlyRemaining.toFixed(2);

      family.publicStory = input.publicStory ?? null;

      family.publicStoryAr = input.publicStoryAr ?? null;

      family.profileStatus = parseEnumValue(

        FamilyProfileStatusEnum,

        input.profileStatus,

      );

      family.isPilotFamily = input.isPilotFamily;

      family.pilotBatchNumber = input.pilotBatchNumber;

      family.pilotNotes = input.pilotNotes ?? null;



      const savedFamily = await manager.save(family);

      const reloaded = await manager.findOne(Family, {

        where: { id: savedFamily.id },

        relations: ["familyUser"],

      });

      return this.toDetail(reloaded!);

    });

  }

  async updateMediaVisibility(
    id: string,
    items: Array<{ url: string; isSensitive: boolean }>,
  ) {
    const family = await this.loadFamilyOrThrow(id);
    const updates = new Map(items.map((item) => [item.url, item.isSensitive]));

    family.mediaItems = (family.mediaItems ?? []).map((item) =>
      updates.has(item.url)
        ? { ...item, isSensitive: updates.get(item.url)! }
        : item,
    );

    const saved = await this.familyRepo.save(family);
    return this.toDetail(saved);
  }

  async deleteForAdmin(id: string, actorUserId?: string) {
    const family = await this.loadFamilyOrThrow(id);
    const publicCode = family.publicCode;

    await this.dataSource.transaction(async (manager) => {
      const userId = family.familyUserId;

      const sponsorships = await manager.find(Sponsorship, {
        where: { familyId: family.id },
        select: { id: true },
      });
      const sponsorshipIds = sponsorships.map((item) => item.id);

      const rooms = await manager.find(ChatRoom, {
        where: { familyId: family.id },
        select: { id: true },
      });
      const roomIds = rooms.map((item) => item.id);

      const tickets = await manager.find(SponsorTicket, {
        where: { familyId: family.id },
        select: { id: true },
      });
      const ticketIds = tickets.map((item) => item.id);

      if (roomIds.length > 0) {
        await manager.delete(ChatMessage, { roomId: In(roomIds) });
      }
      if (ticketIds.length > 0) {
        await manager.delete(SponsorTicketMessage, {
          ticketId: In(ticketIds),
        });
      }
      if (sponsorshipIds.length > 0) {
        await manager.delete(TransferProof, {
          sponsorshipId: In(sponsorshipIds),
        });
      }

      await manager.delete(SponsorTicket, { familyId: family.id });
      await manager.delete(ChatRoom, { familyId: family.id });
      await manager.delete(FamilyProfileUpdateRequest, {
        familyId: family.id,
      });
      await manager.delete(Sponsorship, { familyId: family.id });
      await manager.delete(Family, { id: family.id });

      if (userId) {
        await manager.delete(User, { id: userId });
      }
    });

    if (actorUserId) {
      await this.activityLogService.log({
        actorUserId,
        action: ActivityAction.FAMILY_DELETED,
        entityType: "family",
        entityId: id,
        summary: `Family deleted: ${publicCode}`,
      });
    }

    return { success: true };
  }



  async updateProfileStatus(
    familyId: string,
    status: FamilyProfileStatusEnum,
  ): Promise<void> {
    await this.familyRepo.update({ id: familyId }, { profileStatus: status });
  }

  async setHiddenForAdmin(
    id: string,
    hidden: boolean,
    actorUserId?: string,
  ) {
    const family = await this.loadFamilyOrThrow(id);

    family.profileStatus = hidden
      ? FamilyProfileStatusEnum.HIDDEN
      : FamilyProfileStatusEnum.PUBLISHED;

    await this.familyRepo.save(family);

    if (actorUserId) {
      await this.activityLogService.log({
        actorUserId,
        action: ActivityAction.FAMILY_UPDATED,
        entityType: "family",
        entityId: family.id,
        summary: hidden
          ? `Family hidden from browse: ${family.publicCode}`
          : `Family published to browse: ${family.publicCode}`,
        metadata: { profileStatus: family.profileStatus },
      });
    }

    return this.toDetail(await this.loadFamilyOrThrow(id));
  }

  async setRestrictedForAdmin(id: string, restricted: boolean) {

    const family = await this.loadFamilyOrThrow(id);

    if (!family.familyUser) {

      throw new NotFoundException("Family login account not found");

    }



    family.familyLoginEnabled = !restricted;

    if (restricted) {
      family.profileStatus = FamilyProfileStatusEnum.SUSPENDED;
    } else if (family.profileStatus === FamilyProfileStatusEnum.SUSPENDED) {
      family.profileStatus = FamilyProfileStatusEnum.PUBLISHED;
    }

    family.familyUser.status = restricted

      ? UserStatusEnum.SUSPENDED

      : UserStatusEnum.ACTIVE;



    await this.dataSource.transaction(async (manager) => {

      await manager.save(family.familyUser!);

      await manager.save(family);

    });



    return this.toDetail(await this.loadFamilyOrThrow(id));

  }



  private async loadFamilyOrThrow(id: string) {

    const family = await this.familyRepo.findOne({

      where: { id },

      relations: ["familyUser"],

    });

    if (!family) {

      throw new NotFoundException("Family not found");

    }

    return family;

  }



  private toListItem(family: Family) {

    return {

      id: family.id,

      publicCode: family.publicCode,

      governorate: family.governorate,

      familySize: family.familySize,

      childrenCount: family.childrenCount,

      caseCategory: family.caseCategory,

      priorityLevel: family.priorityLevel,

      monthlyRequiredAmount: Number(family.monthlyRequiredAmount),

      monthlyCoveredAmount: Number(family.monthlyCoveredAmount),

      monthlyRemainingAmount: Number(family.monthlyRemainingAmount),

      profileStatus: family.profileStatus,

      coverageStatus: family.coverageStatus,

      headOfFamilyName: family.headOfFamilyName,

      headOfFamilyNameAr: family.headOfFamilyNameAr,

      accountEmail: family.familyUser?.email ?? null,

      accountRestricted: isAccountRestricted(family),

      updatedAt: family.updatedAt.toISOString(),

    };

  }



  private toDetail(family: Family) {

    return {

      ...this.toListItem(family),

      nationalId: family.nationalId,

      internalPhone: family.internalPhone,

      detailedAddress: family.detailedAddress,

      detailedAddressAr: family.detailedAddressAr,

      dataSource: family.dataSource,

      internalNotes: family.internalNotes,

      verificationNotes: family.verificationNotes,

      assignedCaseOfficer: family.assignedCaseOfficer,

      areaGeneral: family.areaGeneral,

      areaGeneralAr: family.areaGeneralAr,

      publicStory: family.publicStory,

      publicStoryAr: family.publicStoryAr,

      headOfFamilyNameAr: family.headOfFamilyNameAr,

      womenCount: family.womenCount,

      elderlyCount: family.elderlyCount,

      infantCount: family.infantCount,

      hasWidow: family.hasWidow,

      hasOrphans: family.hasOrphans,

      hasDisabledMember: family.hasDisabledMember,

      hasChronicPatient: family.hasChronicPatient,

      housingStatus: family.housingStatus,

      incomeStatus: family.incomeStatus,

      displacementStatus: family.displacementStatus,

      isPilotFamily: family.isPilotFamily,

      pilotBatchNumber: family.pilotBatchNumber,

      pilotNotes: family.pilotNotes,

      familyLoginEnabled: family.familyLoginEnabled,

      accountStatus: family.familyUser?.status ?? null,

      receivingMethods: family.receivingMethods ?? [],

      mediaItems: family.mediaItems ?? [],

      externalLinks: family.externalLinks,

      createdAt: family.createdAt.toISOString(),

    };

  }

  private buildViewerMediaItems(
    mediaItems: Family["mediaItems"],
    options: { isAuthenticated: boolean; hasActiveSponsorship: boolean },
  ): FamilyMediaItemView[] {
    return (mediaItems ?? []).map((item) => {
      const locked =
        !options.isAuthenticated ||
        (item.isSensitive && !options.hasActiveSponsorship);
      return {
        url: locked ? null : item.url,
        blurredUrl: item.blurredUrl,
        mimeType: item.mimeType,
        filename: item.filename,
        kind: item.kind,
        isSensitive: item.isSensitive,
        locked,
      };
    });
  }

  private toPublicProfile(
    family: Family,
    includeReceivingDetails = false,
    isAuthenticated = false,
  ) {
    const methods = family.receivingMethods ?? [];
    return {
      publicCode: family.publicCode,
      governorate: family.governorate,
      areaGeneral: family.areaGeneral,
      areaGeneralAr: family.areaGeneralAr,
      familySize: family.familySize,
      childrenCount: family.childrenCount,
      womenCount: family.womenCount,
      elderlyCount: family.elderlyCount,
      infantCount: family.infantCount,
      hasWidow: family.hasWidow,
      hasOrphans: family.hasOrphans,
      hasDisabledMember: family.hasDisabledMember,
      hasChronicPatient: family.hasChronicPatient,
      housingStatus: family.housingStatus,
      incomeStatus: family.incomeStatus,
      displacementStatus: family.displacementStatus,
      caseCategory: family.caseCategory,
      priorityLevel: family.priorityLevel,
      monthlyRequiredAmount: Number(family.monthlyRequiredAmount),
      monthlyCoveredAmount: Number(family.monthlyCoveredAmount),
      monthlyRemainingAmount: Number(family.monthlyRemainingAmount),
      coverageStatus: family.coverageStatus,
      receivingMethods: includeReceivingDetails
        ? methods
        : methods.map((method) => ({ method: method.method })),
      publicStory: family.publicStory,
      publicStoryAr: family.publicStoryAr,
      mediaItems: this.buildViewerMediaItems(family.mediaItems, {
        isAuthenticated,
        hasActiveSponsorship: includeReceivingDetails,
      }),
      externalLinks: family.externalLinks,
      updatedAt: family.updatedAt.toISOString(),
    };
  }

  private isFamilyBrowsable(family: Family): boolean {
    return family.profileStatus === FamilyProfileStatusEnum.PUBLISHED;
  }

  private isFamilyFullySponsored(family: Family): boolean {
    if (family.coverageStatus === CoverageStatusEnum.FULLY_COVERED) {
      return true;
    }

    const monthlyRequired = Number(family.monthlyRequiredAmount);
    const monthlyCovered = Number(family.monthlyCoveredAmount);
    const monthlyRemaining = Number(family.monthlyRemainingAmount);

    if (monthlyRequired > 0 && monthlyRemaining <= 0) {
      return true;
    }

    if (monthlyRequired > 0 && monthlyCovered >= monthlyRequired) {
      return true;
    }

    return false;
  }

  private async loadActiveSponsorshipsByFamilyId(
    familyIds: string[],
    required: boolean,
  ): Promise<Map<string, Sponsorship[]>> {
    const map = new Map<string, Sponsorship[]>();
    if (!required || familyIds.length === 0) {
      return map;
    }

    const sponsorships = await this.sponsorshipRepo.find({
      where: {
        familyId: In(familyIds),
        status: SponsorshipStatusEnum.ACTIVE,
      },
    });

    for (const sponsorship of sponsorships) {
      const current = map.get(sponsorship.familyId) ?? [];
      current.push(sponsorship);
      map.set(sponsorship.familyId, current);
    }

    return map;
  }

  private async getActiveFamilyIdsForDonor(
    donorUserId: string,
  ): Promise<Set<string>> {
    const active = await this.sponsorshipRepo.find({
      where: {
        donorUserId,
        status: SponsorshipStatusEnum.ACTIVE,
      },
      select: { familyId: true },
    });
    return new Set(active.map((item) => item.familyId));
  }

  private toPublicProfileForDonor(
    family: Family,
    donorHasActiveSponsorship: boolean,
  ) {
    return {
      ...this.toPublicProfile(family, donorHasActiveSponsorship, true),
      donorHasActiveSponsorship,
      donorHasApprovedSponsorship: donorHasActiveSponsorship,
    };
  }

}
