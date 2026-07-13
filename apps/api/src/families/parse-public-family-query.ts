import { BadRequestException } from "@nestjs/common";
import { publicFamilyQuerySchema } from "@muakhah/contracts";

export function parsePublicFamilyQuery(
  query: Record<string, string | undefined>,
) {
  const parsed = publicFamilyQuerySchema.safeParse({
    search: query.search || undefined,
    governorate: query.governorate || undefined,
    familySizeRange: query.familySizeRange || undefined,
    childrenCountRange: query.childrenCountRange || undefined,
    caseCategory: query.caseCategory || undefined,
    priorityLevel: query.priorityLevel || undefined,
    sponsorshipCoverage: query.sponsorshipCoverage || undefined,
    receivingMethod: query.receivingMethod || undefined,
    monthlyAmountRange: query.monthlyAmountRange || undefined,
    coveragePercentRange: query.coveragePercentRange || undefined,
    mediaAvailability: query.mediaAvailability || undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.errors.map((error) => error.message).join(", ");
    throw new BadRequestException(message);
  }

  return parsed.data;
}
