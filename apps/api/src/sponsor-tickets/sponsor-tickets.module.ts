import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ActivityLogsModule } from "../activity-logs/activity-logs.module";
import { SponsorTicketMessage } from "../entities/sponsor-ticket-message.entity";
import { SponsorTicket } from "../entities/sponsor-ticket.entity";
import { Sponsorship } from "../entities/sponsorship.entity";
import {
  AdminSponsorTicketsController,
  DonorSponsorTicketsController,
} from "./sponsor-tickets.controller";
import { SponsorTicketsService } from "./sponsor-tickets.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SponsorTicket,
      SponsorTicketMessage,
      Sponsorship,
    ]),
    ActivityLogsModule,
  ],
  controllers: [DonorSponsorTicketsController, AdminSponsorTicketsController],
  providers: [SponsorTicketsService],
  exports: [SponsorTicketsService],
})
export class SponsorTicketsModule {}
