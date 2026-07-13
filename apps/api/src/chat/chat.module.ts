import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ChatMessage } from "../entities/chat-message.entity";
import { ChatRoom } from "../entities/chat-room.entity";
import { Family } from "../entities/family.entity";
import { Sponsorship } from "../entities/sponsorship.entity";
import { User } from "../entities/user.entity";
import { StorageModule } from "../storage/storage.module";
import {
  AdminChatController,
  DonorChatController,
  FamilyChatController,
} from "./chat.controller";
import { ChatService } from "./chat.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatRoom,
      ChatMessage,
      Family,
      Sponsorship,
      User,
    ]),
    StorageModule,
  ],
  controllers: [DonorChatController, FamilyChatController, AdminChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
