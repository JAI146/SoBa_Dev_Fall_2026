import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Family } from "../entities/family.entity";
import { Sponsorship } from "../entities/sponsorship.entity";
import { User } from "../entities/user.entity";
import { StorageModule } from "../storage/storage.module";
import { ChatModule } from "../chat/chat.module";
import {
  AdminSponsorshipsController,
  DonorSponsorshipsController,
} from "./admin-sponsorships.controller";
import { DonorDashboardController } from "./donor-dashboard.controller";
import { FamilySponsorshipsController } from "./family-sponsorships.controller";
import { TransferProofsModule } from "../transfer-proofs/transfer-proofs.module";
import { SponsorshipsService } from "./sponsorships.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Sponsorship, Family, User]),
    StorageModule,
    ChatModule,
    TransferProofsModule,
  ],
  controllers: [
    DonorDashboardController,
    DonorSponsorshipsController,
    AdminSponsorshipsController,
    FamilySponsorshipsController,
  ],
  providers: [SponsorshipsService],
  exports: [SponsorshipsService],
})
export class SponsorshipsModule {}
