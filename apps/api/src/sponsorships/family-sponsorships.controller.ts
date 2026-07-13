import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import { FamilyGuard } from "../auth/family.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SponsorshipsService } from "./sponsorships.service";

@Controller("family")
@UseGuards(JwtAuthGuard, FamilyGuard)
export class FamilySponsorshipsController {
  constructor(private readonly sponsorshipsService: SponsorshipsService) {}

  @Get("dashboard")
  getDashboard(@Req() req: { user: { sub: string } }) {
    return this.sponsorshipsService.getDashboardForFamilyUser(req.user.sub);
  }

  @Get("sponsorships")
  listSponsorships(@Req() req: { user: { sub: string } }) {
    return this.sponsorshipsService.listForFamilyUser(req.user.sub);
  }

  @Get("sponsorships/:id")
  findSponsorship(
    @Req() req: { user: { sub: string } },
    @Param("id") id: string,
  ) {
    return this.sponsorshipsService.findOneForFamilyUser(req.user.sub, id);
  }
}
