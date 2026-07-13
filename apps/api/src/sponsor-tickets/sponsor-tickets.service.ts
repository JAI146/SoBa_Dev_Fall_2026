import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type {
  CreateSponsorTicketInput,
  ReplySponsorTicketInput,
  SponsorTicketDetail,
  SponsorTicketListItem,
  UpdateSponsorTicketStatusInput,
} from "@muakhah/contracts";
import { ActivityAction } from "@muakhah/contracts";
import { Repository } from "typeorm";
import { ActivityLogService } from "../activity-logs/activity-log.service";
import {
  SponsorTicketMessage,
  SponsorTicketSenderRoleEnum,
} from "../entities/sponsor-ticket-message.entity";
import {
  SponsorTicket,
  SponsorTicketStatusEnum,
} from "../entities/sponsor-ticket.entity";
import { Sponsorship, SponsorshipStatusEnum } from "../entities/sponsorship.entity";

const ISSUE_STATUSES = new Set([
  SponsorshipStatusEnum.ACTIVE,
  SponsorshipStatusEnum.PAUSED,
  SponsorshipStatusEnum.COMPLETED,
  SponsorshipStatusEnum.STOPPED,
  SponsorshipStatusEnum.DISPUTED,
]);

@Injectable()
export class SponsorTicketsService {
  constructor(
    @InjectRepository(SponsorTicket)
    private readonly ticketRepo: Repository<SponsorTicket>,
    @InjectRepository(SponsorTicketMessage)
    private readonly messageRepo: Repository<SponsorTicketMessage>,
    @InjectRepository(Sponsorship)
    private readonly sponsorshipRepo: Repository<Sponsorship>,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async createForDonor(
    donorUserId: string,
    input: CreateSponsorTicketInput,
  ): Promise<{ ticket: SponsorTicketDetail }> {
    const sponsorship = await this.sponsorshipRepo.findOne({
      where: { id: input.sponsorshipId, donorUserId },
      relations: { family: true, donorUser: true },
    });

    if (!sponsorship) {
      throw new NotFoundException("Sponsorship not found");
    }

    if (!ISSUE_STATUSES.has(sponsorship.status)) {
      throw new BadRequestException(
        "Issues can only be reported for approved sponsorships",
      );
    }

    const ticket = await this.ticketRepo.save(
      this.ticketRepo.create({
        sponsorshipId: sponsorship.id,
        familyId: sponsorship.familyId,
        donorUserId,
        subject: input.subject.trim(),
        status: SponsorTicketStatusEnum.OPEN,
        resolvedAt: null,
      }),
    );

    await this.messageRepo.save(
      this.messageRepo.create({
        ticketId: ticket.id,
        senderUserId: donorUserId,
        senderRole: SponsorTicketSenderRoleEnum.DONOR,
        content: input.message.trim(),
      }),
    );

    await this.activityLogService.log({
      actorUserId: donorUserId,
      action: ActivityAction.SPONSOR_TICKET_CREATED,
      entityType: "sponsor_ticket",
      entityId: ticket.id,
      summary: `Sponsor issue opened for family ${sponsorship.family?.publicCode ?? ""}`,
      metadata: { subject: ticket.subject },
    });

    return { ticket: await this.loadDetail(ticket.id) };
  }

  async listForDonor(
    donorUserId: string,
  ): Promise<{ tickets: SponsorTicketListItem[] }> {
    const tickets = await this.ticketRepo.find({
      where: { donorUserId },
      relations: { donorUser: true, sponsorship: { family: true }, messages: true },
      order: { updatedAt: "DESC" },
    });

    return { tickets: tickets.map((ticket) => this.toListItem(ticket)) };
  }

  async findOneForDonor(
    donorUserId: string,
    ticketId: string,
  ): Promise<{ ticket: SponsorTicketDetail }> {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, donorUserId },
    });

    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }

    return { ticket: await this.loadDetail(ticketId) };
  }

  async replyForDonor(
    donorUserId: string,
    ticketId: string,
    input: ReplySponsorTicketInput,
  ): Promise<{ ticket: SponsorTicketDetail }> {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, donorUserId },
    });

    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }

    if (ticket.status === SponsorTicketStatusEnum.RESOLVED) {
      throw new BadRequestException("Cannot reply to a resolved ticket");
    }

    await this.messageRepo.save(
      this.messageRepo.create({
        ticketId,
        senderUserId: donorUserId,
        senderRole: SponsorTicketSenderRoleEnum.DONOR,
        content: input.message.trim(),
      }),
    );

    ticket.status = SponsorTicketStatusEnum.OPEN;
    await this.ticketRepo.save(ticket);

    return { ticket: await this.loadDetail(ticketId) };
  }

  async listForAdmin(): Promise<{ tickets: SponsorTicketListItem[] }> {
    const tickets = await this.ticketRepo.find({
      relations: { donorUser: true, sponsorship: { family: true }, messages: true },
      order: { updatedAt: "DESC" },
      take: 200,
    });

    return { tickets: tickets.map((ticket) => this.toListItem(ticket)) };
  }

  async findOneForAdmin(ticketId: string): Promise<{ ticket: SponsorTicketDetail }> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }
    return { ticket: await this.loadDetail(ticketId) };
  }

  async replyForAdmin(
    adminUserId: string,
    ticketId: string,
    input: ReplySponsorTicketInput,
  ): Promise<{ ticket: SponsorTicketDetail }> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }

    await this.messageRepo.save(
      this.messageRepo.create({
        ticketId,
        senderUserId: adminUserId,
        senderRole: SponsorTicketSenderRoleEnum.ADMIN,
        content: input.message.trim(),
      }),
    );

    if (ticket.status === SponsorTicketStatusEnum.OPEN) {
      ticket.status = SponsorTicketStatusEnum.IN_PROGRESS;
      await this.ticketRepo.save(ticket);
    }

    await this.activityLogService.log({
      actorUserId: adminUserId,
      action: ActivityAction.SPONSOR_TICKET_REPLIED,
      entityType: "sponsor_ticket",
      entityId: ticket.id,
      summary: `Admin replied to sponsor ticket: ${ticket.subject}`,
    });

    return { ticket: await this.loadDetail(ticketId) };
  }

  async updateStatusForAdmin(
    adminUserId: string,
    ticketId: string,
    input: UpdateSponsorTicketStatusInput,
  ): Promise<{ ticket: SponsorTicketDetail }> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }

    ticket.status = input.status as SponsorTicketStatusEnum;
    ticket.resolvedAt =
      input.status === "resolved" ? new Date() : null;
    await this.ticketRepo.save(ticket);

    await this.activityLogService.log({
      actorUserId: adminUserId,
      action: ActivityAction.SPONSOR_TICKET_STATUS_UPDATED,
      entityType: "sponsor_ticket",
      entityId: ticket.id,
      summary: `Sponsor ticket status updated to ${input.status}`,
    });

    return { ticket: await this.loadDetail(ticketId) };
  }

  private async loadDetail(ticketId: string): Promise<SponsorTicketDetail> {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: {
        donorUser: true,
        sponsorship: { family: true },
        messages: { senderUser: true },
      },
      order: { messages: { createdAt: "ASC" } },
    });

    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }

    const listItem = this.toListItem(ticket);
    const messages = (ticket.messages ?? [])
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((message) => ({
        id: message.id,
        senderUserId: message.senderUserId,
        senderName: message.senderUser
          ? `${message.senderUser.firstName} ${message.senderUser.lastName}`.trim()
          : "",
        senderRole: message.senderRole as "donor" | "admin",
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      }));

    return { ...listItem, messages };
  }

  private toListItem(ticket: SponsorTicket): SponsorTicketListItem {
    const donor = ticket.donorUser;
    const sortedMessages = [...(ticket.messages ?? [])].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    const lastMessage = sortedMessages[0];

    return {
      id: ticket.id,
      sponsorshipId: ticket.sponsorshipId,
      familyPublicCode: ticket.sponsorship?.family?.publicCode ?? "",
      donorUserId: ticket.donorUserId,
      donorName: donor ? `${donor.firstName} ${donor.lastName}`.trim() : "",
      subject: ticket.subject,
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
      lastMessagePreview: lastMessage?.content.slice(0, 120) ?? null,
    };
  }
}
