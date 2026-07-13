import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Family } from "../entities/family.entity";
import { FamilyProfileUpdateRequest } from "../entities/family-profile-update-request.entity";
import { FamiliesModule } from "../families/families.module";
import {
  AdminProfileUpdateRequestsController,
  FamilyProfileController,
} from "./family-profile-updates.controller";
import { FamilyProfileUpdatesService } from "./family-profile-updates.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([FamilyProfileUpdateRequest]),
    FamiliesModule,
  ],
  controllers: [FamilyProfileController, AdminProfileUpdateRequestsController],
  providers: [FamilyProfileUpdatesService],
})
export class FamilyProfileUpdatesModule {}
