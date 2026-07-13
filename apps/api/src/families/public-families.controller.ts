import { Controller, Get, Param, Query } from "@nestjs/common";
import { FamiliesService } from "./families.service";
import { parsePublicFamilyQuery } from "./parse-public-family-query";

@Controller("families/public")
export class PublicFamiliesController {
  constructor(private readonly familiesService: FamiliesService) {}

  @Get()
  list(@Query() query: Record<string, string | undefined>) {
    return this.familiesService.listPublic(parsePublicFamilyQuery(query));
  }

  @Get(":publicCode")
  findByPublicCode(@Param("publicCode") publicCode: string) {
    return this.familiesService.findPublicByCode(publicCode);
  }
}
