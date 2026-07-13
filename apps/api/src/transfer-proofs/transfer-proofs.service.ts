import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  ActivityAction,
  type CreateTransferProofInput,
  type ReviewTransferProofInput,
  type TransferProofDetail,
  type TransferProofListItem,
  type TransferProofQueryInput,
  type TransferProofStatusValue,
} from "@muakhah/contracts";
import { Repository } from "typeorm";
import type { UploadedImageFile } from "../common/types/uploaded-file.type";
import { ActivityLogService } from "../activity-logs/activity-log.service";
import { Family } from "../entities/family.entity";
import { Sponsorship, SponsorshipStatusEnum } from "../entities/sponsorship.entity";
import {
  TransferProof,
  TransferProofStatusEnum,
} from "../entities/transfer-proof.entity";
import { S3Service } from "../storage/s3.service";

const UPLOADABLE_STATUSES = new Set([
  SponsorshipStatusEnum.ACTIVE,
  SponsorshipStatusEnum.PAUSED,
]);

@Injectable()
export class TransferProofsService {
  constructor(
    @InjectRepository(TransferProof)
    private readonly transferProofRepo: Repository<TransferProof>,
    @InjectRepository(Sponsorship)
    private readonly sponsorshipRepo: Repository<Sponsorship>,
    @InjectRepository(Family)
    private readonly familyRepo: Repository<Family>,
    private readonly s3Service: S3Service,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async uploadForDonor(
    donorUserId: string,
    sponsorshipId: string,
    input: CreateTransferProofInput,
    file: UploadedImageFile,
  ): Promise<{
    transferProof: TransferProofListItem;
    approvedCount: number;
  }> {
    const sponsorship = await this.sponsorshipRepo.findOne({
      where: { id: sponsorshipId, donorUserId },
      relations: { family: true, donorUser: true },
    });

    if (!sponsorship) {
      throw new NotFoundException("Sponsorship not found");
    }

    if (!UPLOADABLE_STATUSES.has(sponsorship.status)) {
      throw new BadRequestException(
        "Transfer proofs can only be uploaded for active sponsorships",
      );
    }

    const methods = sponsorship.selectedReceivingMethods ?? [];
    const methodIndex = input.receivingMethodIndex;
    const method = methods[methodIndex];
    if (!method) {
      throw new BadRequestException("Invalid receiving method selected");
    }

    let fileUrl: string;
    try {
      fileUrl = await this.s3Service.uploadTransferProof(file, sponsorshipId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to upload transfer proof";
      throw new BadRequestException(message);
    }

    const saved = await this.transferProofRepo.save(
      this.transferProofRepo.create({
        sponsorshipId,
        donorUserId,
        fileUrl,
        notes: input.notes?.trim() || null,
        status: TransferProofStatusEnum.PENDING,
        receivingMethodIndex: methodIndex,
        receivingMethodType: method.method,
        amount: String(input.amount),
        transferDate: input.transferDate,
      }),
    );

    await this.activityLogService.log({
      actorUserId: donorUserId,
      action: ActivityAction.TRANSFER_PROOF_UPLOADED,
      entityType: "transfer_proof",
      entityId: saved.id,
      summary: `Transfer proof uploaded for sponsorship ${sponsorshipId}`,
      metadata: {
        sponsorshipId,
        familyPublicCode: sponsorship.family?.publicCode ?? null,
        receivingMethodType: method.method,
        amount: input.amount,
        transferDate: input.transferDate,
      },
    });

    const approvedCount = await this.countApprovedForSponsorship(sponsorshipId);

    return {
      transferProof: this.toListItem(saved, sponsorship),
      approvedCount,
    };
  }

  async listForDonor(
    donorUserId: string,
    sponsorshipId: string,
  ): Promise<{
    transferProofs: TransferProofListItem[];
    approvedCount: number;
  }> {
    const sponsorship = await this.sponsorshipRepo.findOne({
      where: { id: sponsorshipId, donorUserId },
      relations: { family: true, donorUser: true },
    });

    if (!sponsorship) {
      throw new NotFoundException("Sponsorship not found");
    }

    const items = await this.transferProofRepo.find({
      where: { sponsorshipId },
      relations: { donorUser: true, sponsorship: { family: true } },
      order: { createdAt: "DESC" },
    });

    const approvedCount = await this.countApprovedForSponsorship(sponsorshipId);

    return {
      transferProofs: items.map((item) =>
        this.toListItem(item, item.sponsorship ?? sponsorship),
      ),
      approvedCount,
    };
  }

  async listAllForDonor(
    donorUserId: string,
  ): Promise<{
    transferProofs: TransferProofListItem[];
    approvedCount: number;
  }> {
    const items = await this.transferProofRepo.find({
      where: { donorUserId },
      relations: { donorUser: true, sponsorship: { family: true } },
      order: { createdAt: "DESC" },
      take: 200,
    });

    const approvedCount = await this.transferProofRepo.count({
      where: {
        donorUserId,
        status: TransferProofStatusEnum.ACCEPTED,
      },
    });

    return {
      transferProofs: items
        .filter((item) => item.sponsorship)
        .map((item) => this.toListItem(item, item.sponsorship!)),
      approvedCount,
    };
  }

  async listApprovedForFamily(
    familyUserId: string,
  ): Promise<{
    transferProofs: TransferProofListItem[];
    approvedCount: number;
  }> {
    const family = await this.findFamilyForUser(familyUserId);

    const items = await this.transferProofRepo
      .createQueryBuilder("proof")
      .leftJoinAndSelect("proof.donorUser", "donorUser")
      .leftJoinAndSelect("proof.sponsorship", "sponsorship")
      .leftJoinAndSelect("sponsorship.family", "family")
      .where("sponsorship.familyId = :familyId", { familyId: family.id })
      .andWhere("proof.status = :status", {
        status: TransferProofStatusEnum.ACCEPTED,
      })
      .orderBy("proof.createdAt", "DESC")
      .take(200)
      .getMany();

    return {
      transferProofs: items
        .filter((item) => item.sponsorship)
        .map((item) => this.toListItem(item, item.sponsorship!)),
      approvedCount: items.length,
    };
  }

  async listForAdmin(
    query: TransferProofQueryInput,
  ): Promise<{ transferProofs: TransferProofListItem[] }> {
    const qb = this.transferProofRepo
      .createQueryBuilder("proof")
      .leftJoinAndSelect("proof.donorUser", "donorUser")
      .leftJoinAndSelect("proof.sponsorship", "sponsorship")
      .leftJoinAndSelect("sponsorship.family", "family")
      .orderBy("proof.createdAt", "DESC")
      .take(200);

    if (query.status) {
      qb.andWhere("proof.status = :status", { status: query.status });
    }

    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere(
        "(family.publicCode ILIKE :term OR donorUser.email ILIKE :term OR donorUser.firstName ILIKE :term OR donorUser.lastName ILIKE :term)",
        { term },
      );
    }

    const items = await qb.getMany();

    return {
      transferProofs: items
        .filter((item) => item.sponsorship)
        .map((item) => this.toListItem(item, item.sponsorship!)),
    };
  }

  async getOneForAdmin(id: string): Promise<{ transferProof: TransferProofDetail }> {
    const proof = await this.transferProofRepo.findOne({
      where: { id },
      relations: { donorUser: true, sponsorship: { family: true, donorUser: true } },
    });

    if (!proof?.sponsorship) {
      throw new NotFoundException("Transfer proof not found");
    }

    const approvedCount = await this.countApprovedForSponsorship(
      proof.sponsorshipId,
    );

    return {
      transferProof: this.toDetail(proof, proof.sponsorship, approvedCount),
    };
  }

  async reviewForAdmin(
    adminUserId: string,
    id: string,
    input: ReviewTransferProofInput,
  ): Promise<{ transferProof: TransferProofDetail }> {
    const proof = await this.transferProofRepo.findOne({
      where: { id },
      relations: { donorUser: true, sponsorship: { family: true, donorUser: true } },
    });

    if (!proof?.sponsorship) {
      throw new NotFoundException("Transfer proof not found");
    }

    const statusMap: Record<
      ReviewTransferProofInput["status"],
      TransferProofStatusEnum
    > = {
      pending: TransferProofStatusEnum.PENDING,
      accepted: TransferProofStatusEnum.ACCEPTED,
      rejected: TransferProofStatusEnum.REJECTED,
      clarification: TransferProofStatusEnum.CLARIFICATION,
      disputed: TransferProofStatusEnum.DISPUTED,
    };

    const nextStatus = statusMap[input.status];
    const nextNotes =
      input.adminNotes !== undefined
        ? input.adminNotes?.trim() || null
        : proof.adminNotes;
    const notesChanged = nextNotes !== (proof.adminNotes?.trim() || null);
    const statusChanged = proof.status !== nextStatus;

    if (!statusChanged && !notesChanged) {
      throw new BadRequestException("No changes to save");
    }

    proof.status = nextStatus;
    if (input.adminNotes !== undefined) {
      proof.adminNotes = nextNotes;
    }
    proof.reviewedBy = adminUserId;
    proof.reviewedAt = new Date();

    const saved = await this.transferProofRepo.save(proof);

    await this.activityLogService.log({
      actorUserId: adminUserId,
      action: ActivityAction.TRANSFER_PROOF_REVIEWED,
      entityType: "transfer_proof",
      entityId: saved.id,
      summary: `Transfer proof ${input.status} for sponsorship ${proof.sponsorshipId}`,
      metadata: {
        status: input.status,
        sponsorshipId: proof.sponsorshipId,
        familyPublicCode: proof.sponsorship.family?.publicCode ?? null,
      },
    });

    const approvedCount = await this.countApprovedForSponsorship(
      proof.sponsorshipId,
    );

    return {
      transferProof: this.toDetail(saved, proof.sponsorship, approvedCount),
    };
  }

  async countApprovedForSponsorship(sponsorshipId: string): Promise<number> {
    return this.transferProofRepo.count({
      where: {
        sponsorshipId,
        status: TransferProofStatusEnum.ACCEPTED,
      },
    });
  }

  async getDashboardSummary(): Promise<{
    totalTransferProofs: number;
    transferProofsPendingReview: number;
    transferProofStatusBreakdown: {
      pending: number;
      accepted: number;
      rejected: number;
      clarification: number;
      disputed: number;
    };
    latestTransferProofs: TransferProofListItem[];
    latestPendingTransferProofs: TransferProofListItem[];
  }> {
    const [
      totalTransferProofs,
      transferProofsPendingReview,
      statusRows,
      latestItems,
      latestPendingItems,
    ] = await Promise.all([
      this.transferProofRepo.count(),
      this.transferProofRepo.count({
        where: { status: TransferProofStatusEnum.PENDING },
      }),
      this.transferProofRepo
        .createQueryBuilder("proof")
        .select("proof.status", "status")
        .addSelect("COUNT(*)", "count")
        .groupBy("proof.status")
        .getRawMany<{ status: string; count: string }>(),
      this.transferProofRepo.find({
        relations: { donorUser: true, sponsorship: { family: true } },
        order: { createdAt: "DESC" },
        take: 10,
      }),
      this.transferProofRepo.find({
        where: { status: TransferProofStatusEnum.PENDING },
        relations: { donorUser: true, sponsorship: { family: true } },
        order: { createdAt: "DESC" },
        take: 5,
      }),
    ]);

    const transferProofStatusBreakdown = {
      pending: 0,
      accepted: 0,
      rejected: 0,
      clarification: 0,
      disputed: 0,
    };

    for (const row of statusRows) {
      const key = row.status as keyof typeof transferProofStatusBreakdown;
      if (key in transferProofStatusBreakdown) {
        transferProofStatusBreakdown[key] = Number(row.count ?? 0);
      }
    }

    const mapItems = (items: TransferProof[]) =>
      items
        .filter((item) => item.sponsorship)
        .map((item) => this.toListItem(item, item.sponsorship!));

    return {
      totalTransferProofs,
      transferProofsPendingReview,
      transferProofStatusBreakdown,
      latestTransferProofs: mapItems(latestItems),
      latestPendingTransferProofs: mapItems(latestPendingItems),
    };
  }

  async countApprovedForSponsorships(
    sponsorshipIds: string[],
  ): Promise<Map<string, number>> {
    if (sponsorshipIds.length === 0) {
      return new Map();
    }

    const rows = await this.transferProofRepo
      .createQueryBuilder("proof")
      .select("proof.sponsorship_id", "sponsorshipId")
      .addSelect("COUNT(*)", "count")
      .where("proof.sponsorship_id IN (:...ids)", { ids: sponsorshipIds })
      .andWhere("proof.status = :status", {
        status: TransferProofStatusEnum.ACCEPTED,
      })
      .groupBy("proof.sponsorship_id")
      .getRawMany<{ sponsorshipId: string; count: string }>();

    return new Map(
      rows.map((row) => [row.sponsorshipId, Number(row.count)]),
    );
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

  private toListItem(
    proof: TransferProof,
    sponsorship: Sponsorship,
  ): TransferProofListItem {
    const donor = proof.donorUser ?? sponsorship.donorUser;
    return {
      id: proof.id,
      sponsorshipId: proof.sponsorshipId,
      familyId: sponsorship.familyId,
      familyPublicCode: sponsorship.family?.publicCode ?? "",
      donorUserId: proof.donorUserId,
      donorName: donor ? `${donor.firstName} ${donor.lastName}`.trim() : "",
      donorEmail: donor?.email ?? "",
      fileUrl: proof.fileUrl,
      notes: proof.notes,
      status: proof.status as TransferProofStatusValue,
      receivingMethodIndex: proof.receivingMethodIndex ?? 0,
      receivingMethodType: proof.receivingMethodType,
      adminNotes: proof.adminNotes,
      reviewedAt: proof.reviewedAt?.toISOString() ?? null,
      amount: proof.amount != null ? Number(proof.amount) : null,
      transferDate: proof.transferDate ?? null,
      createdAt: proof.createdAt.toISOString(),
    };
  }

  private toDetail(
    proof: TransferProof,
    sponsorship: Sponsorship,
    approvedTransferCount: number,
  ): TransferProofDetail {
    return {
      ...this.toListItem(proof, sponsorship),
      monthlyAmount: Number(sponsorship.monthlyAmount),
      sponsorshipStatus: sponsorship.status,
      sponsorshipType: sponsorship.type,
      approvedTransferCount,
    };
  }
}
