import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LegalDocument } from "../entities/legal-document.entity";
import { AdminLegalController } from "./admin-legal.controller";
import { LegalService } from "./legal.service";
import { PublicLegalController } from "./public-legal.controller";

@Module({
  imports: [TypeOrmModule.forFeature([LegalDocument])],
  controllers: [AdminLegalController, PublicLegalController],
  providers: [LegalService],
  exports: [LegalService],
})
export class LegalModule {}
