import { Controller, Get, Param } from "@nestjs/common";
import { LegalService } from "./legal.service";

@Controller("legal")
export class PublicLegalController {
  constructor(private readonly legalService: LegalService) {}

  @Get()
  async list() {
    const documents = await this.legalService.listPublic();
    return { documents };
  }

  @Get(":slug")
  async getOne(@Param("slug") slug: string) {
    const document = await this.legalService.getBySlugPublic(slug);
    return { document };
  }
}
