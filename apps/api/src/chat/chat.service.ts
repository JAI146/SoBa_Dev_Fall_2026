import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type {
  ChatMessageListItem,
  ChatRoomListItem,
  EditChatMessageInput,
  ReviewChatMessageInput,
  SendChatTextInput,
} from "@muakhah/contracts";
import { ActivityAction } from "@muakhah/contracts";
import { Repository, In } from "typeorm";
import type { UploadedImageFile } from "../common/types/uploaded-file.type";
import { ActivityLogService } from "../activity-logs/activity-log.service";
import {
  ChatMessage,
  ChatMessageStatusEnum,
  ChatMessageTypeEnum,
  ChatSenderRoleEnum,
} from "../entities/chat-message.entity";
import { ChatRoom } from "../entities/chat-room.entity";
import { Family } from "../entities/family.entity";
import {
  Sponsorship,
  SponsorshipStatusEnum,
} from "../entities/sponsorship.entity";
import { User } from "../entities/user.entity";
import { S3Service } from "../storage/s3.service";

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatRoom)
    private readonly roomRepo: Repository<ChatRoom>,
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(Family)
    private readonly familyRepo: Repository<Family>,
    @InjectRepository(Sponsorship)
    private readonly sponsorshipRepo: Repository<Sponsorship>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly s3Service: S3Service,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async ensureRoomForApprovedSponsorship(
    familyId: string,
    donorUserId: string,
    sponsorshipId: string,
  ): Promise<ChatRoom> {
    let room = await this.roomRepo.findOne({
      where: { familyId, donorUserId },
    });

    if (room) {
      if (!room.sponsorshipId) {
        room.sponsorshipId = sponsorshipId;
        room = await this.roomRepo.save(room);
      }
      return room;
    }

    room = this.roomRepo.create({
      familyId,
      donorUserId,
      sponsorshipId,
    });
    return this.roomRepo.save(room);
  }

  async deliverInitialSponsorshipMessage(
    sponsorship: Sponsorship,
    roomId: string,
    reviewedByAdminId: string,
  ): Promise<void> {
    const content = sponsorship.initialMessage?.trim();
    if (!content || sponsorship.initialMessageDelivered) {
      return;
    }

    const message = this.messageRepo.create({
      roomId,
      senderUserId: sponsorship.donorUserId,
      senderRole: ChatSenderRoleEnum.DONOR,
      type: ChatMessageTypeEnum.TEXT,
      content,
      mediaUrl: null,
      mediaKind: null,
      status: ChatMessageStatusEnum.APPROVED,
      reviewedBy: reviewedByAdminId,
      reviewedAt: new Date(),
    });

    await this.messageRepo.save(message);
    await this.roomRepo.update(roomId, { updatedAt: new Date() });
    await this.sponsorshipRepo.update(sponsorship.id, {
      initialMessageDelivered: true,
    });
  }

  async getMessageStatsForDonor(donorUserId: string): Promise<{
    messagesPendingModeration: number;
    approvedMessages: number;
  }> {
    const rooms = await this.roomRepo.find({
      where: { donorUserId },
      select: { id: true },
    });

    const roomIds = rooms.map((room) => room.id);
    if (roomIds.length === 0) {
      return { messagesPendingModeration: 0, approvedMessages: 0 };
    }

    const [messagesPendingModeration, approvedMessages] = await Promise.all([
      this.messageRepo.count({
        where: {
          roomId: In(roomIds),
          senderUserId: donorUserId,
          status: ChatMessageStatusEnum.PENDING,
        },
      }),
      this.messageRepo.count({
        where: {
          roomId: In(roomIds),
          senderUserId: donorUserId,
          status: In([
            ChatMessageStatusEnum.APPROVED,
            ChatMessageStatusEnum.EDITED,
          ]),
        },
      }),
    ]);

    return { messagesPendingModeration, approvedMessages };
  }

  async syncRoomsFromApprovedSponsorships(): Promise<void> {
    const approved = await this.sponsorshipRepo.find({
      where: { status: SponsorshipStatusEnum.ACTIVE },
      select: { id: true, familyId: true, donorUserId: true },
    });

    for (const sponsorship of approved) {
      await this.ensureRoomForApprovedSponsorship(
        sponsorship.familyId,
        sponsorship.donorUserId,
        sponsorship.id,
      );
    }
  }

  async listRoomsForDonor(donorUserId: string): Promise<{ rooms: ChatRoomListItem[] }> {
    await this.syncRoomsFromApprovedSponsorships();

    const rooms = await this.roomRepo.find({
      where: { donorUserId },
      relations: { family: true, donorUser: true },
      order: { updatedAt: "DESC" },
    });

    const items = await Promise.all(
      rooms.map(async (room) => this.toRoomListItem(room, donorUserId, "donor")),
    );

    return {
      rooms: items.filter((room) => room.canSend),
    };
  }

  async listRoomsForFamily(
    familyUserId: string,
  ): Promise<{ rooms: ChatRoomListItem[] }> {
    await this.syncRoomsFromApprovedSponsorships();

    const family = await this.findFamilyForUser(familyUserId);
    const rooms = await this.roomRepo.find({
      where: { familyId: family.id },
      relations: { family: true, donorUser: true },
      order: { updatedAt: "DESC" },
    });

    const items = await Promise.all(
      rooms.map(async (room) =>
        this.toRoomListItem(room, familyUserId, "family"),
      ),
    );

    return {
      rooms: items.filter((room) => room.canSend),
    };
  }

  async listRoomsForAdmin(): Promise<{ rooms: ChatRoomListItem[] }> {
    await this.syncRoomsFromApprovedSponsorships();

    const rooms = await this.roomRepo.find({
      relations: { family: true, donorUser: true },
      order: { updatedAt: "DESC" },
    });

    const items = await Promise.all(
      rooms.map(async (room) => this.toRoomListItem(room, null, "admin")),
    );

    return { rooms: items };
  }

  async getRoomForDonor(
    donorUserId: string,
    roomId: string,
  ): Promise<{ room: ChatRoomListItem }> {
    const room = await this.getRoomWithRelations(roomId);
    await this.assertDonorRoomAccess(room, donorUserId);
    return {
      room: await this.toRoomListItem(room, donorUserId, "donor"),
    };
  }

  async getRoomForFamily(
    familyUserId: string,
    roomId: string,
  ): Promise<{ room: ChatRoomListItem }> {
    const room = await this.getRoomWithRelations(roomId);
    await this.assertFamilyRoomAccess(room, familyUserId);
    return {
      room: await this.toRoomListItem(room, familyUserId, "family"),
    };
  }

  async getRoomForAdmin(roomId: string): Promise<{ room: ChatRoomListItem }> {
    const room = await this.getRoomWithRelations(roomId);
    return {
      room: await this.toRoomListItem(room, null, "admin"),
    };
  }

  async getOrCreateRoomForDonorByFamilyCode(
    donorUserId: string,
    familyPublicCode: string,
  ): Promise<{ room: ChatRoomListItem }> {
    const family = await this.familyRepo.findOne({
      where: { publicCode: familyPublicCode },
    });
    if (!family) {
      throw new NotFoundException("Family not found");
    }

    const hasApproved = await this.sponsorshipRepo.exists({
      where: {
        donorUserId,
        familyId: family.id,
        status: SponsorshipStatusEnum.ACTIVE,
      },
    });
    if (!hasApproved) {
      throw new ForbiddenException(
        "Chat is available only for active sponsorships",
      );
    }

    const sponsorship = await this.sponsorshipRepo.findOne({
      where: {
        donorUserId,
        familyId: family.id,
        status: SponsorshipStatusEnum.ACTIVE,
      },
      order: { createdAt: "DESC" },
    });

    const room = await this.ensureRoomForApprovedSponsorship(
      family.id,
      donorUserId,
      sponsorship!.id,
    );

    const withRelations = await this.getRoomWithRelations(room.id);
    return {
      room: await this.toRoomListItem(withRelations, donorUserId, "donor"),
    };
  }

  async getOrCreateRoomForFamilyBySponsorship(
    familyUserId: string,
    sponsorshipId: string,
  ): Promise<{ room: ChatRoomListItem }> {
    const family = await this.findFamilyForUser(familyUserId);
    const sponsorship = await this.sponsorshipRepo.findOne({
      where: { id: sponsorshipId, familyId: family.id },
    });
    if (!sponsorship) {
      throw new NotFoundException("Sponsorship not found");
    }
    if (sponsorship.status !== SponsorshipStatusEnum.ACTIVE) {
      throw new ForbiddenException(
        "Chat is available only for active sponsorships",
      );
    }

    const room = await this.ensureRoomForApprovedSponsorship(
      family.id,
      sponsorship.donorUserId,
      sponsorship.id,
    );
    const withRelations = await this.getRoomWithRelations(room.id);
    return {
      room: await this.toRoomListItem(withRelations, familyUserId, "family"),
    };
  }

  async listMessagesForParticipant(
    roomId: string,
    userId: string,
    role: "donor" | "family",
  ): Promise<{ messages: ChatMessageListItem[] }> {
    const room = await this.getRoomWithRelations(roomId);
    if (role === "donor") {
      await this.assertDonorRoomAccess(room, userId);
    } else {
      await this.assertFamilyRoomAccess(room, userId);
    }

    const [publicMessages, ownRejected, ownPending] = await Promise.all([
      this.messageRepo.find({
        where: {
          roomId,
          status: In([
            ChatMessageStatusEnum.APPROVED,
            ChatMessageStatusEnum.EDITED,
          ]),
        },
        relations: { senderUser: true },
        order: { createdAt: "ASC" },
      }),
      this.messageRepo.find({
        where: {
          roomId,
          senderUserId: userId,
          status: ChatMessageStatusEnum.REJECTED,
        },
        relations: { senderUser: true },
        order: { createdAt: "ASC" },
      }),
      this.messageRepo.find({
        where: {
          roomId,
          senderUserId: userId,
          status: ChatMessageStatusEnum.PENDING,
        },
        relations: { senderUser: true },
        order: { createdAt: "ASC" },
      }),
    ]);

    const messages = [...publicMessages, ...ownRejected, ...ownPending].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    return {
      messages: messages.map((item) =>
        this.toParticipantMessageListItem(item, userId),
      ),
    };
  }

  async listMessagesForAdmin(
    roomId: string,
    status?: string,
  ): Promise<{ messages: ChatMessageListItem[] }> {
    await this.getRoomWithRelations(roomId);

    const allowedStatuses = Object.values(ChatMessageStatusEnum);
    let messages;
    if (status === "approved") {
      messages = await this.messageRepo.find({
        where: {
          roomId,
          status: In([
            ChatMessageStatusEnum.APPROVED,
            ChatMessageStatusEnum.EDITED,
          ]),
        },
        relations: { senderUser: true },
        order: { createdAt: "ASC" },
      });
    } else {
      const where: { roomId: string; status?: ChatMessageStatusEnum } = {
        roomId,
      };
      if (status && allowedStatuses.includes(status as ChatMessageStatusEnum)) {
        where.status = status as ChatMessageStatusEnum;
      }
      messages = await this.messageRepo.find({
        where,
        relations: { senderUser: true },
        order: { createdAt: "ASC" },
      });
    }

    return { messages: messages.map((item) => this.toMessageListItem(item)) };
  }

  async sendTextMessage(
    roomId: string,
    senderUserId: string,
    senderRole: ChatSenderRoleEnum,
    input: SendChatTextInput,
  ): Promise<{ message: ChatMessageListItem }> {
    await this.assertCanSend(roomId, senderUserId, senderRole);

    const message = this.messageRepo.create({
      roomId,
      senderUserId,
      senderRole,
      type: ChatMessageTypeEnum.TEXT,
      content: input.content.trim(),
      mediaUrl: null,
      mediaKind: null,
      status: ChatMessageStatusEnum.PENDING,
    });

    const saved = await this.messageRepo.save(message);
    await this.roomRepo.update(roomId, { updatedAt: new Date() });

    const withSender = await this.messageRepo.findOne({
      where: { id: saved.id },
      relations: { senderUser: true },
    });
    if (!withSender) {
      throw new Error("Failed to load sent message");
    }

    return { message: this.toMessageListItem(withSender) };
  }

  async sendMediaMessage(
    roomId: string,
    senderUserId: string,
    senderRole: ChatSenderRoleEnum,
    file: UploadedImageFile,
    kindOverride?: "image" | "video" | "document" | "sticker",
  ): Promise<{ message: ChatMessageListItem }> {
    await this.assertCanSend(roomId, senderUserId, senderRole);

    let uploaded: { url: string; kind: "image" | "video" | "document" | "sticker" };
    try {
      uploaded = await this.s3Service.uploadChatMedia(file, roomId, kindOverride);
    } catch {
      throw new BadRequestException(
        "Unsupported file type. Send images, videos, or documents (PDF, Word, Excel, PowerPoint, TXT, ZIP).",
      );
    }

    const message = this.messageRepo.create({
      roomId,
      senderUserId,
      senderRole,
      type: ChatMessageTypeEnum.MEDIA,
      content:
        uploaded.kind === "document" ? file.originalname : null,
      mediaUrl: uploaded.url,
      mediaKind: uploaded.kind,
      status: ChatMessageStatusEnum.PENDING,
    });

    const saved = await this.messageRepo.save(message);
    await this.roomRepo.update(roomId, { updatedAt: new Date() });

    const withSender = await this.messageRepo.findOne({
      where: { id: saved.id },
      relations: { senderUser: true },
    });
    if (!withSender) {
      throw new Error("Failed to load sent message");
    }

    return { message: this.toMessageListItem(withSender) };
  }

  async reviewMessageForAdmin(
    messageId: string,
    adminUserId: string,
    input: ReviewChatMessageInput,
  ): Promise<{ message: ChatMessageListItem }> {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: { senderUser: true },
    });
    if (!message) {
      throw new NotFoundException("Message not found");
    }
    if (
      message.status !== ChatMessageStatusEnum.PENDING &&
      message.status !== ChatMessageStatusEnum.ESCALATED
    ) {
      throw new BadRequestException(
        "Only pending or escalated messages can be reviewed",
      );
    }

    if (
      input.status === "escalated" &&
      message.status !== ChatMessageStatusEnum.PENDING
    ) {
      throw new BadRequestException("Only pending messages can be escalated");
    }

    const statusMap: Record<
      ReviewChatMessageInput["status"],
      ChatMessageStatusEnum
    > = {
      approved: ChatMessageStatusEnum.APPROVED,
      rejected: ChatMessageStatusEnum.REJECTED,
      escalated: ChatMessageStatusEnum.ESCALATED,
    };

    message.status = statusMap[input.status];
    message.adminNotes = input.adminNotes?.trim() || null;
    message.reviewedBy = adminUserId;
    message.reviewedAt = new Date();

    const saved = await this.messageRepo.save(message);
    await this.roomRepo.update(message.roomId, { updatedAt: new Date() });

    await this.activityLogService.log({
      actorUserId: adminUserId,
      action: ActivityAction.CHAT_MESSAGE_REVIEWED,
      entityType: "chat_message",
      entityId: saved.id,
      summary: `Chat message ${input.status}`,
      metadata: { status: saved.status, adminNotes: saved.adminNotes },
    });

    return { message: this.toMessageListItem(saved) };
  }

  async editMessageForAdmin(
    messageId: string,
    adminUserId: string,
    input: EditChatMessageInput,
  ): Promise<{ message: ChatMessageListItem }> {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: { senderUser: true },
    });
    if (!message) {
      throw new NotFoundException("Message not found");
    }
    if (message.type !== ChatMessageTypeEnum.TEXT) {
      throw new BadRequestException("Only text messages can be edited");
    }
    if (
      message.status !== ChatMessageStatusEnum.APPROVED &&
      message.status !== ChatMessageStatusEnum.EDITED
    ) {
      throw new BadRequestException(
        "Only approved or edited messages can be edited",
      );
    }

    message.content = input.content.trim();
    message.status = ChatMessageStatusEnum.EDITED;
    message.reviewedBy = adminUserId;
    message.reviewedAt = new Date();

    const saved = await this.messageRepo.save(message);
    await this.roomRepo.update(message.roomId, { updatedAt: new Date() });

    await this.activityLogService.log({
      actorUserId: adminUserId,
      action: ActivityAction.CHAT_MESSAGE_EDITED,
      entityType: "chat_message",
      entityId: saved.id,
      summary: "Chat message edited by admin",
    });

    return { message: this.toMessageListItem(saved) };
  }

  private async assertCanSend(
    roomId: string,
    senderUserId: string,
    senderRole: ChatSenderRoleEnum,
  ) {
    const room = await this.getRoomWithRelations(roomId);
    if (senderRole === ChatSenderRoleEnum.DONOR) {
      await this.assertDonorRoomAccess(room, senderUserId);
    } else {
      await this.assertFamilyRoomAccess(room, senderUserId);
    }

    const canSend = await this.hasApprovedSponsorship(
      room.familyId,
      room.donorUserId,
    );
    if (!canSend) {
      throw new ForbiddenException(
        "Chat is closed because the sponsorship is no longer active",
      );
    }
  }

  private async hasApprovedSponsorship(
    familyId: string,
    donorUserId: string,
  ): Promise<boolean> {
    return this.sponsorshipRepo.exists({
      where: {
        familyId,
        donorUserId,
        status: SponsorshipStatusEnum.ACTIVE,
      },
    });
  }

  private async assertDonorRoomAccess(room: ChatRoom, donorUserId: string) {
    if (room.donorUserId !== donorUserId) {
      throw new NotFoundException("Chat room not found");
    }
    const hasApproved = await this.hasApprovedSponsorship(
      room.familyId,
      donorUserId,
    );
    if (!hasApproved) {
      throw new ForbiddenException(
        "Chat is available only for active sponsorships",
      );
    }
  }

  private async assertFamilyRoomAccess(room: ChatRoom, familyUserId: string) {
    const family = await this.findFamilyForUser(familyUserId);
    if (room.familyId !== family.id) {
      throw new NotFoundException("Chat room not found");
    }
    const hasApproved = await this.hasApprovedSponsorship(
      room.familyId,
      room.donorUserId,
    );
    if (!hasApproved) {
      throw new ForbiddenException(
        "Chat is available only for active sponsorships",
      );
    }
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

  private async getRoomWithRelations(roomId: string): Promise<ChatRoom> {
    const room = await this.roomRepo.findOne({
      where: { id: roomId },
      relations: { family: true, donorUser: true },
    });
    if (!room) {
      throw new NotFoundException("Chat room not found");
    }
    return room;
  }

  private async toRoomListItem(
    room: ChatRoom,
    userId: string | null,
    viewer: "donor" | "family" | "admin",
  ): Promise<ChatRoomListItem> {
    const donor = room.donorUser;
    const pendingCount = await this.messageRepo.count({
      where: {
        roomId: room.id,
        status: ChatMessageStatusEnum.PENDING,
      },
    });

    const lastApprovedMessage = await this.findLastApprovedMessage(room.id);

    const canSend = await this.hasApprovedSponsorship(
      room.familyId,
      room.donorUserId,
    );

    return {
      id: room.id,
      familyId: room.familyId,
      familyPublicCode: room.family?.publicCode ?? "",
      donorUserId: room.donorUserId,
      donorName: donor ? `${donor.firstName} ${donor.lastName}`.trim() : "",
      donorEmail: donor?.email ?? "",
      familyAvatarUrl: this.getFamilyAvatarUrl(room.family),
      pendingCount,
      canSend,
      lastMessageAt: lastApprovedMessage?.createdAt.toISOString() ?? null,
      lastMessageType: lastApprovedMessage?.type ?? null,
      lastMessageContent: lastApprovedMessage?.content ?? null,
      lastMessageMediaKind: lastApprovedMessage?.mediaKind ?? null,
      lastMessageSenderRole: lastApprovedMessage?.senderRole ?? null,
      lastMessageStatus: lastApprovedMessage?.status ?? null,
      createdAt: room.createdAt.toISOString(),
    };
  }

  private getFamilyAvatarUrl(family: Family | null | undefined): string | null {
    if (!family?.mediaItems?.length) {
      return null;
    }
    const image = family.mediaItems.find((item) => item.kind === "image");
    return image?.url ?? null;
  }

  private async findLastApprovedMessage(
    roomId: string,
  ): Promise<ChatMessage | null> {
    return this.messageRepo.findOne({
      where: {
        roomId,
        status: In([
          ChatMessageStatusEnum.APPROVED,
          ChatMessageStatusEnum.EDITED,
        ]),
      },
      order: { createdAt: "DESC" },
    });
  }

  private toParticipantMessageListItem(
    message: ChatMessage,
    viewerUserId: string,
  ): ChatMessageListItem {
    const item = this.toMessageListItem(message);
    if (
      message.status !== ChatMessageStatusEnum.REJECTED ||
      message.senderUserId !== viewerUserId
    ) {
      return { ...item, adminNotes: null };
    }
    return item;
  }

  private toMessageListItem(message: ChatMessage): ChatMessageListItem {
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
}
