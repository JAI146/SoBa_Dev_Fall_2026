import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ActivityLog } from "../entities/activity-log.entity";
import { ChatMessage } from "../entities/chat-message.entity";
import { Family } from "../entities/family.entity";
import { FamilyProfileUpdateRequest } from "../entities/family-profile-update-request.entity";
import { Sponsorship } from "../entities/sponsorship.entity";
import { User } from "../entities/user.entity";
import { MailModule } from "../mail/mail.module";
import { StorageModule } from "../storage/storage.module";
import { SubAdminsModule } from "../sub-admins/sub-admins.module";
import { ChatModule } from "../chat/chat.module";
import { TransferProofsModule } from "../transfer-proofs/transfer-proofs.module";
import { AdminDashboardController } from "./admin-dashboard.controller";
import { AdminDashboardService } from "./admin-dashboard.service";
import { AdminSettingsController } from "./admin-settings.controller";

@Module({
  imports: [
    StorageModule,
    MailModule,
    ChatModule,
    TransferProofsModule,
    SubAdminsModule,
    TypeOrmModule.forFeature([
      Family,
      Sponsorship,
      User,
      ChatMessage,
      FamilyProfileUpdateRequest,
      ActivityLog,
    ]),
  ],
  controllers: [AdminSettingsController, AdminDashboardController],
  providers: [AdminDashboardService],
})
export class AdminModule {}
