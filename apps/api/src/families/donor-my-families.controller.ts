import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { DonorGuard } from "../auth/donor.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { FamiliesService } from "../families/families.service";

@Controller("donor/my-families")
@UseGuards(JwtAuthGuard, DonorGuard)
export class DonorMyFamiliesController {
  constructor(private readonly familiesService: FamiliesService) {}

  @Get()
  list(@Req() req: { user: { sub: string } }) {
    return this.familiesService.listMyFamiliesForDonor(req.user.sub);
  }
}
