import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DonorGuard } from "../auth/donor.guard";
import { FamiliesService } from "./families.service";
import { parsePublicFamilyQuery } from "./parse-public-family-query";

@Controller("donor/families")
@UseGuards(JwtAuthGuard, DonorGuard)
export class DonorFamiliesController {
  constructor(private readonly familiesService: FamiliesService) {}

  @Get()
  list(
    @Req() req: { user: { sub: string } },
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.familiesService.listForDonor(
      req.user.sub,
      parsePublicFamilyQuery(query),
    );
  }

  @Get(":publicCode")
  findByPublicCode(
    @Param("publicCode") publicCode: string,
    @Req() req: { user: { sub: string } },
  ) {
    return this.familiesService.findByPublicCodeForDonor(publicCode, req.user.sub);
  }
}
