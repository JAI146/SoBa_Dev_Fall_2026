import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type {
  LegalDocumentSlugValue,
  UpdateLegalDocumentInput,
} from "@muakhah/contracts";
import { legalDocumentSlugs } from "@muakhah/contracts";
import { Repository } from "typeorm";
import { LegalDocument } from "../entities/legal-document.entity";

@Injectable()
export class LegalService {
  constructor(
    @InjectRepository(LegalDocument)
    private readonly legalRepo: Repository<LegalDocument>,
  ) {}

  async listPublic() {
    return this.listForAdmin();
  }

  async listForAdmin() {
    const existing = await this.legalRepo.find();
    const bySlug = new Map(existing.map((doc) => [doc.slug, doc]));

    return legalDocumentSlugs.map((slug) => {
      const doc = bySlug.get(slug);
      return this.toPublic(doc ?? this.emptyDocument(slug));
    });
  }

  async getBySlugForAdmin(slug: string) {
    this.assertValidSlug(slug);
    const doc = await this.legalRepo.findOne({ where: { slug } });
    return this.toPublic(doc ?? this.emptyDocument(slug));
  }

  async getBySlugPublic(slug: string) {
    this.assertValidSlug(slug);
    const doc = await this.legalRepo.findOne({ where: { slug } });
    return this.toPublic(doc ?? this.emptyDocument(slug));
  }

  async upsertForAdmin(slug: string, input: UpdateLegalDocumentInput) {
    this.assertValidSlug(slug);
    let doc = await this.legalRepo.findOne({ where: { slug } });
    if (!doc) {
      doc = this.legalRepo.create({
        slug,
        contentEn: input.contentEn,
        contentAr: input.contentAr,
      });
    } else {
      doc.contentEn = input.contentEn;
      doc.contentAr = input.contentAr;
    }
    const saved = await this.legalRepo.save(doc);
    return this.toPublic(saved);
  }

  private emptyDocument(slug: LegalDocumentSlugValue): LegalDocument {
    return {
      slug,
      contentEn: "",
      contentAr: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private assertValidSlug(slug: string): asserts slug is LegalDocumentSlugValue {
    if (!(legalDocumentSlugs as readonly string[]).includes(slug)) {
      throw new NotFoundException("Legal document not found");
    }
  }

  private toPublic(doc: LegalDocument) {
    return {
      slug: doc.slug as LegalDocumentSlugValue,
      contentEn: doc.contentEn ?? "",
      contentAr: doc.contentAr ?? "",
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}
