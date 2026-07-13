import { Controller, Get, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/admin.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AdminDashboardService } from "./admin-dashboard.service";

@Controller("admin/dashboard")
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get()
  getOverview() {
    return this.adminDashboardService.getOverview();
  }
}
