import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Family } from "../entities/family.entity";
import { Sponsorship } from "../entities/sponsorship.entity";
import { User } from "../entities/user.entity";
import { StorageModule } from "../storage/storage.module";
import { AdminFamiliesController } from "./admin-families.controller";
import { DonorFamiliesController } from "./donor-families.controller";
import { DonorMyFamiliesController } from "./donor-my-families.controller";
import { PublicFamiliesController } from "./public-families.controller";
import { FamiliesService } from "./families.service";

@Module({
  imports: [TypeOrmModule.forFeature([Family, User, Sponsorship]), StorageModule],
  controllers: [
    AdminFamiliesController,
    DonorFamiliesController,
    DonorMyFamiliesController,
    PublicFamiliesController,
  ],
  providers: [FamiliesService],
  exports: [FamiliesService],
})
export class FamiliesModule {}
