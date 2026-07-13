import type { UploadedImageFile } from "../common/types/uploaded-file.type";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  editChatMessageSchema,
  reviewChatMessageSchema,
  sendChatTextSchema,
  AdminPermission,
} from "@muakhah/contracts";
import { AdminGuard } from "../auth/admin.guard";
import { DonorGuard } from "../auth/donor.guard";
import { FamilyGuard } from "../auth/family.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { ChatSenderRoleEnum } from "../entities/chat-message.entity";
import { ChatService } from "./chat.service";

@Controller("donor/chat")
@UseGuards(JwtAuthGuard, DonorGuard)
export class DonorChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get("rooms")
  listRooms(@Req() req: { user: { sub: string } }) {
    return this.chatService.listRoomsForDonor(req.user.sub);
  }

  @Get("rooms/by-family/:publicCode")
  getRoomByFamily(
    @Req() req: { user: { sub: string } },
    @Param("publicCode") publicCode: string,
  ) {
    return this.chatService.getOrCreateRoomForDonorByFamilyCode(
      req.user.sub,
      publicCode,
    );
  }

  @Get("rooms/:roomId")
  getRoom(
    @Req() req: { user: { sub: string } },
    @Param("roomId") roomId: string,
  ) {
    return this.chatService.getRoomForDonor(req.user.sub, roomId);
  }

  @Get("rooms/:roomId/messages")
  listMessages(
    @Req() req: { user: { sub: string } },
    @Param("roomId") roomId: string,
  ) {
    return this.chatService.listMessagesForParticipant(
      roomId,
      req.user.sub,
      "donor",
    );
  }

  @Post("rooms/:roomId/messages/text")
  sendText(
    @Req() req: { user: { sub: string } },
    @Param("roomId") roomId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = sendChatTextSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    return this.chatService.sendTextMessage(
      roomId,
      req.user.sub,
      ChatSenderRoleEnum.DONOR,
      parsed.data,
    );
  }

  @Post("rooms/:roomId/messages/media")
  @UseInterceptors(
    FileInterceptor("media", {
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  sendMedia(
    @Req() req: { user: { sub: string } },
    @Param("roomId") roomId: string,
    @UploadedFile() media?: UploadedImageFile,
    @Body("kind") kind?: string,
  ) {
    if (!media) {
      throw new BadRequestException("Media file is required");
    }

    const kindOverride =
      kind === "sticker" || kind === "document" ? kind : undefined;

    return this.chatService.sendMediaMessage(
      roomId,
      req.user.sub,
      ChatSenderRoleEnum.DONOR,
      media,
      kindOverride,
    );
  }
}

@Controller("family/chat")
@UseGuards(JwtAuthGuard, FamilyGuard)
export class FamilyChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get("rooms")
  listRooms(@Req() req: { user: { sub: string } }) {
    return this.chatService.listRoomsForFamily(req.user.sub);
  }

  @Get("rooms/by-sponsorship/:sponsorshipId")
  getRoomBySponsorship(
    @Req() req: { user: { sub: string } },
    @Param("sponsorshipId") sponsorshipId: string,
  ) {
    return this.chatService.getOrCreateRoomForFamilyBySponsorship(
      req.user.sub,
      sponsorshipId,
    );
  }

  @Get("rooms/:roomId")
  getRoom(
    @Req() req: { user: { sub: string } },
    @Param("roomId") roomId: string,
  ) {
    return this.chatService.getRoomForFamily(req.user.sub, roomId);
  }

  @Get("rooms/:roomId/messages")
  listMessages(
    @Req() req: { user: { sub: string } },
    @Param("roomId") roomId: string,
  ) {
    return this.chatService.listMessagesForParticipant(
      roomId,
      req.user.sub,
      "family",
    );
  }

  @Post("rooms/:roomId/messages/text")
  sendText(
    @Req() req: { user: { sub: string } },
    @Param("roomId") roomId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = sendChatTextSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    return this.chatService.sendTextMessage(
      roomId,
      req.user.sub,
      ChatSenderRoleEnum.FAMILY,
      parsed.data,
    );
  }

  @Post("rooms/:roomId/messages/media")
  @UseInterceptors(
    FileInterceptor("media", {
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  sendMedia(
    @Req() req: { user: { sub: string } },
    @Param("roomId") roomId: string,
    @UploadedFile() media?: UploadedImageFile,
    @Body("kind") kind?: string,
  ) {
    if (!media) {
      throw new BadRequestException("Media file is required");
    }

    const kindOverride =
      kind === "sticker" || kind === "document" ? kind : undefined;

    return this.chatService.sendMediaMessage(
      roomId,
      req.user.sub,
      ChatSenderRoleEnum.FAMILY,
      media,
      kindOverride,
    );
  }
}

@Controller("admin/chat")
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
@RequirePermissions(AdminPermission.CHAT_MODERATE)
export class AdminChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get("rooms")
  listRooms() {
    return this.chatService.listRoomsForAdmin();
  }

  @Get("rooms/:roomId/messages")
  listMessages(
    @Param("roomId") roomId: string,
    @Query("status") status?: string,
  ) {
    return this.chatService.listMessagesForAdmin(roomId, status);
  }

  @Get("rooms/:roomId")
  getRoom(@Param("roomId") roomId: string) {
    return this.chatService.getRoomForAdmin(roomId);
  }

  @Patch("messages/:messageId")
  review(
    @Param("messageId") messageId: string,
    @Req() req: { user: { sub: string } },
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = reviewChatMessageSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    return this.chatService.reviewMessageForAdmin(
      messageId,
      req.user.sub,
      parsed.data,
    );
  }

  @Patch("messages/:messageId/content")
  editContent(
    @Param("messageId") messageId: string,
    @Req() req: { user: { sub: string } },
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = editChatMessageSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    return this.chatService.editMessageForAdmin(
      messageId,
      req.user.sub,
      parsed.data,
    );
  }
}
