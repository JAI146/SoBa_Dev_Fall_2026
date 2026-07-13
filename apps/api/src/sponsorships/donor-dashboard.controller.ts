import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { DonorGuard } from "../auth/donor.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SponsorshipsService } from "./sponsorships.service";

@Controller("donor")
@UseGuards(JwtAuthGuard, DonorGuard)
export class DonorDashboardController {
  constructor(private readonly sponsorshipsService: SponsorshipsService) {}

  @Get("dashboard")
  getDashboard(@Req() req: { user: { sub: string } }) {
    return this.sponsorshipsService.getDashboardForDonor(req.user.sub);
  }
}
