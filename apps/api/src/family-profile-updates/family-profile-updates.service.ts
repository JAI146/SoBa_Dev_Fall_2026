import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type {
  CreateProfileUpdateRequestInput,
  FamilySelfProfile,
  FamilySelfUpdatableFieldKey,
  ProfileUpdateRequestListItem,
  ReviewProfileUpdateRequestInput,
} from "@muakhah/contracts";
import { familySelfUpdatableFields } from "@muakhah/contracts";
import { DataSource, Repository } from "typeorm";
import {
  CaseCategoryEnum,
  DisplacementStatusEnum,
  Family,
  FamilyProfileStatusEnum,
  GovernorateEnum,
  HousingStatusEnum,
  IncomeStatusEnum,
} from "../entities/family.entity";
import {
  FamilyProfileUpdateRequest,
  ProfileUpdateRequestStatusEnum,
} from "../entities/family-profile-update-request.entity";
import { User } from "../entities/user.entity";
import { FamiliesService } from "../families/families.service";

function splitHeadName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: "Family", lastName: "Member" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "Family" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function serializeValue(value: unknown): string {
  return JSON.stringify(value);
}

function parseStoredValue(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

@Injectable()
export class FamilyProfileUpdatesService {
  constructor(
    @InjectRepository(FamilyProfileUpdateRequest)
    private readonly requestRepo: Repository<FamilyProfileUpdateRequest>,
    private readonly familiesService: FamiliesService,
    private readonly dataSource: DataSource,
  ) {}

  async getProfileForFamilyUser(
    familyUserId: string,
  ): Promise<{ profile: FamilySelfProfile }> {
    const family = await this.familiesService.findByFamilyUserId(familyUserId);
    return { profile: this.toSelfProfile(family) };
  }

  async listForFamilyUser(
    familyUserId: string,
  ): Promise<{ requests: ProfileUpdateRequestListItem[] }> {
    const family = await this.familiesService.findByFamilyUserId(familyUserId);
    const items = await this.requestRepo.find({
      where: { familyId: family.id },
      relations: { family: true },
      order: { createdAt: "DESC" },
    });
    return { requests: items.map((item) => this.toListItem(item)) };
  }

  async createForFamilyUser(
    familyUserId: string,
    input: CreateProfileUpdateRequestInput,
  ): Promise<{ request: ProfileUpdateRequestListItem }> {
    const family = await this.familiesService.findByFamilyUserId(familyUserId);

    const existingPending = await this.requestRepo.findOne({
      where: {
        familyId: family.id,
        fieldKey: input.fieldKey,
        status: ProfileUpdateRequestStatusEnum.PENDING,
      },
    });
    if (existingPending) {
      throw new BadRequestException(
        "You already have a pending update request for this field",
      );
    }

    this.validateFieldValue(input.fieldKey, input.requestedValue);

    const currentValue = this.readFieldValue(family, input.fieldKey);
    const requestedSerialized = serializeValue(input.requestedValue);
    const currentSerialized = serializeValue(currentValue);

    if (requestedSerialized === currentSerialized) {
      throw new BadRequestException(
        "The requested value is the same as the current value",
      );
    }

    const entity = this.requestRepo.create({
      familyId: family.id,
      fieldKey: input.fieldKey,
      currentValue: currentSerialized,
      requestedValue: requestedSerialized,
      status: ProfileUpdateRequestStatusEnum.PENDING,
      adminNotes: null,
      reviewedBy: null,
      reviewedAt: null,
    });

    const saved = await this.requestRepo.save(entity);
    await this.familiesService.updateProfileStatus(
      family.id,
      FamilyProfileStatusEnum.NEEDS_UPDATE,
    );
    const withFamily = await this.requestRepo.findOne({
      where: { id: saved.id },
      relations: { family: true },
    });
    if (!withFamily) {
      throw new Error("Failed to load created profile update request");
    }
    return { request: this.toListItem(withFamily) };
  }

  async listForAdmin(filters?: {
    status?: string;
    search?: string;
  }): Promise<{ requests: ProfileUpdateRequestListItem[] }> {
    const qb = this.requestRepo
      .createQueryBuilder("request")
      .leftJoinAndSelect("request.family", "family")
      .orderBy("request.createdAt", "DESC");

    if (filters?.status) {
      qb.andWhere("request.status = :status", { status: filters.status });
    }

    if (filters?.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      qb.andWhere(
        "(family.publicCode ILIKE :term OR family.headOfFamilyName ILIKE :term OR request.fieldKey ILIKE :term)",
        { term },
      );
    }

    const items = await qb.getMany();
    return { requests: items.map((item) => this.toListItem(item)) };
  }

  async reviewForAdmin(
    requestId: string,
    adminUserId: string,
    input: ReviewProfileUpdateRequestInput,
  ): Promise<{ request: ProfileUpdateRequestListItem }> {
    const updated = await this.dataSource.transaction(async (manager) => {
      const request = await manager.findOne(FamilyProfileUpdateRequest, {
        where: { id: requestId },
        lock: { mode: "pessimistic_write" },
      });

      if (!request) {
        throw new NotFoundException("Profile update request not found");
      }

      if (request.status !== ProfileUpdateRequestStatusEnum.PENDING) {
        throw new BadRequestException(
          "Only pending update requests can be reviewed",
        );
      }

      if (input.status === "rejected") {
        const family = await manager.findOne(Family, {
          where: { id: request.familyId },
          lock: { mode: "pessimistic_write" },
        });
        if (family) {
          family.profileStatus = FamilyProfileStatusEnum.PUBLISHED;
          await manager.save(family);
        }
        request.status = ProfileUpdateRequestStatusEnum.REJECTED;
        request.adminNotes = input.adminNotes?.trim() || null;
        request.reviewedBy = adminUserId;
        request.reviewedAt = new Date();
        return manager.save(request);
      }

      const family = await manager.findOne(Family, {
        where: { id: request.familyId },
        lock: { mode: "pessimistic_write" },
      });

      if (!family) {
        throw new NotFoundException("Family not found");
      }

      if (request.fieldKey === "headOfFamilyName" && family.familyUserId) {
        const familyUser = await manager.findOne(User, {
          where: { id: family.familyUserId },
        });
        if (familyUser) {
          family.familyUser = familyUser;
        }
      }

      const parsedValue = parseStoredValue(request.requestedValue);
      const fieldKey = request.fieldKey as FamilySelfUpdatableFieldKey;
      this.validateFieldValue(fieldKey, parsedValue);
      this.applyFieldValue(family, fieldKey, parsedValue);
      family.profileStatus = FamilyProfileStatusEnum.PUBLISHED;

      await manager.save(family);
      if (family.familyUser) {
        await manager.save(family.familyUser);
      }

      request.status = ProfileUpdateRequestStatusEnum.APPROVED;
      request.adminNotes = input.adminNotes?.trim() || null;
      request.reviewedBy = adminUserId;
      request.reviewedAt = new Date();

      return manager.save(request);
    });

    const withFamily = await this.requestRepo.findOne({
      where: { id: updated.id },
      relations: { family: true },
    });
    if (!withFamily) {
      throw new Error("Failed to load reviewed profile update request");
    }
    return { request: this.toListItem(withFamily) };
  }

  private toSelfProfile(family: Family): FamilySelfProfile {
    return {
      publicCode: family.publicCode,
      headOfFamilyName: family.headOfFamilyName,
      headOfFamilyNameAr: family.headOfFamilyNameAr,
      internalPhone: family.internalPhone,
      detailedAddress: family.detailedAddress,
      detailedAddressAr: family.detailedAddressAr,
      areaGeneral: family.areaGeneral,
      areaGeneralAr: family.areaGeneralAr,
      publicStory: family.publicStory,
      publicStoryAr: family.publicStoryAr,
      externalLinks: family.externalLinks,
      familySize: family.familySize,
      childrenCount: family.childrenCount,
      infantCount: family.infantCount,
      womenCount: family.womenCount,
      elderlyCount: family.elderlyCount,
      governorate: family.governorate,
      caseCategory: family.caseCategory,
      housingStatus: family.housingStatus,
      incomeStatus: family.incomeStatus,
      displacementStatus: family.displacementStatus,
      hasWidow: family.hasWidow,
      hasOrphans: family.hasOrphans,
      hasDisabledMember: family.hasDisabledMember,
      hasChronicPatient: family.hasChronicPatient,
      receivingMethods: family.receivingMethods as unknown as FamilySelfProfile["receivingMethods"],
      mediaItems: family.mediaItems as unknown as FamilySelfProfile["mediaItems"],
      updatedAt: family.updatedAt.toISOString(),
    };
  }

  private readFieldValue(
    family: Family,
    fieldKey: FamilySelfUpdatableFieldKey,
  ): unknown {
    return (family as unknown as Record<string, unknown>)[fieldKey];
  }

  private validateFieldValue(
    fieldKey: FamilySelfUpdatableFieldKey,
    value: unknown,
  ) {
    if (!familySelfUpdatableFields.includes(fieldKey)) {
      throw new BadRequestException("Invalid field");
    }

    const stringFields = new Set([
      "headOfFamilyName",
      "internalPhone",
      "detailedAddress",
      "areaGeneral",
      "publicStory",
      "externalLinks",
    ]);
    const numberFields = new Set([
      "familySize",
      "childrenCount",
      "infantCount",
      "womenCount",
      "elderlyCount",
    ]);
    const booleanFields = new Set([
      "hasWidow",
      "hasOrphans",
      "hasDisabledMember",
      "hasChronicPatient",
    ]);
    const enumFields: Record<string, string[]> = {
      governorate: Object.values(GovernorateEnum),
      caseCategory: Object.values(CaseCategoryEnum),
      housingStatus: Object.values(HousingStatusEnum),
      incomeStatus: Object.values(IncomeStatusEnum),
      displacementStatus: Object.values(DisplacementStatusEnum),
    };

    if (stringFields.has(fieldKey)) {
      if (typeof value !== "string" || !value.trim()) {
        throw new BadRequestException("Value must be a non-empty string");
      }
      if (fieldKey === "headOfFamilyName" && value.trim().length > 255) {
        throw new BadRequestException("Name is too long");
      }
      return;
    }

    if (numberFields.has(fieldKey)) {
      const num = typeof value === "number" ? value : Number(value);
      if (!Number.isInteger(num) || num < 0) {
        throw new BadRequestException("Value must be a non-negative whole number");
      }
      if (fieldKey === "familySize" && num < 1) {
        throw new BadRequestException("Family size must be at least 1");
      }
      return;
    }

    if (booleanFields.has(fieldKey)) {
      if (typeof value !== "boolean") {
        throw new BadRequestException("Value must be true or false");
      }
      return;
    }

    const allowed = enumFields[fieldKey];
    if (allowed && (typeof value !== "string" || !allowed.includes(value))) {
      throw new BadRequestException("Invalid option selected");
    }
  }

  private applyFieldValue(
    family: Family,
    fieldKey: FamilySelfUpdatableFieldKey,
    value: unknown,
  ) {
    if (typeof value === "string" && [
      "headOfFamilyName",
      "internalPhone",
      "detailedAddress",
      "areaGeneral",
      "publicStory",
      "externalLinks",
    ].includes(fieldKey)) {
      const trimmed = value.trim();
      if (fieldKey === "headOfFamilyName") {
        family.headOfFamilyName = trimmed;
        if (family.familyUser) {
          const { firstName, lastName } = splitHeadName(trimmed);
          family.familyUser.firstName = firstName;
          family.familyUser.lastName = lastName;
        }
        return;
      }
      (family as unknown as Record<string, unknown>)[fieldKey] =
        trimmed || null;
      return;
    }

    if (typeof value === "number" && [
      "familySize",
      "childrenCount",
      "infantCount",
      "womenCount",
      "elderlyCount",
    ].includes(fieldKey)) {
      (family as unknown as Record<string, unknown>)[fieldKey] = value;
      return;
    }

    if (typeof value === "boolean") {
      (family as unknown as Record<string, unknown>)[fieldKey] = value;
      return;
    }

    if (typeof value === "string") {
      switch (fieldKey) {
        case "governorate":
          family.governorate = value as GovernorateEnum;
          return;
        case "caseCategory":
          family.caseCategory = value as CaseCategoryEnum;
          return;
        case "housingStatus":
          family.housingStatus = value as HousingStatusEnum;
          return;
        case "incomeStatus":
          family.incomeStatus = value as IncomeStatusEnum;
          return;
        case "displacementStatus":
          family.displacementStatus = value as DisplacementStatusEnum;
          return;
        default:
          break;
      }
    }

    throw new BadRequestException("Unable to apply field update");
  }

  private toListItem(
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
}
