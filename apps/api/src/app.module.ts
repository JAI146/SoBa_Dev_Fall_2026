import { Module } from "@nestjs/common";
import { PermissionsGuard } from "./auth/permissions.guard";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database.module";
import { FamiliesModule } from "./families/families.module";
import { DonorsModule } from "./donors/donors.module";
import { LegalModule } from "./legal/legal.module";
import { SponsorshipsModule } from "./sponsorships/sponsorships.module";
import { ChatModule } from "./chat/chat.module";
import { TransferProofsModule } from "./transfer-proofs/transfer-proofs.module";
import { SponsorTicketsModule } from "./sponsor-tickets/sponsor-tickets.module";
import { FamilyProfileUpdatesModule } from "./family-profile-updates/family-profile-updates.module";
import { ActivityLogsModule } from "./activity-logs/activity-logs.module";
import { HealthModule } from "./health/health.module";
import { SubAdminsModule } from "./sub-admins/sub-admins.module";
import { ActivityLog } from "./entities/activity-log.entity";
import { S3Config } from "./entities/s3-config.entity";
import { SmtpConfig } from "./entities/smtp-config.entity";
import { ChatMessage } from "./entities/chat-message.entity";
import { ChatRoom } from "./entities/chat-room.entity";
import { Family } from "./entities/family.entity";
import { FamilyProfileUpdateRequest } from "./entities/family-profile-update-request.entity";
import { LegalDocument } from "./entities/legal-document.entity";
import { Sponsorship } from "./entities/sponsorship.entity";
import { TransferProof } from "./entities/transfer-proof.entity";
import { SponsorTicket } from "./entities/sponsor-ticket.entity";
import { SponsorTicketMessage } from "./entities/sponsor-ticket-message.entity";
import { User } from "./entities/user.entity";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env"],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        host: config.get("DB_HOST", "localhost"),
        port: parseInt(config.get("DB_PORT", "5432"), 10),
        username: config.get("DB_USERNAME", "postgres"),
        password: config.get("DB_PASSWORD", "postgres"),
        database: config.get("DB_NAME", "muakhah"),
        entities: [User, S3Config, SmtpConfig, Family, LegalDocument, Sponsorship, FamilyProfileUpdateRequest, ChatRoom, ChatMessage, ActivityLog, TransferProof, SponsorTicket, SponsorTicketMessage],
        synchronize: config.get("NODE_ENV") !== "production",
        logging: config.get("NODE_ENV") === "development",
      }),
    }),
    ActivityLogsModule,
    HealthModule,
    SubAdminsModule,
    DatabaseModule,
    AuthModule,
    AdminModule,
    FamiliesModule,
    DonorsModule,
    LegalModule,
    SponsorshipsModule,
    FamilyProfileUpdatesModule,
    ChatModule,
    TransferProofsModule,
    SponsorTicketsModule,
  ],
  providers: [PermissionsGuard],
})
export class AppModule {}
