import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  adminUserDetailResponseSchema,
  UserStatus,
  UserType,
  userPublicSchema,
} from '@purposemint/contracts';
import type { Env } from '../config/env.validation';
import type { AuthPrincipal } from '../auth/auth-principal';
import type { ChartDataset } from './assistant-chart';
import {
  assistantToolSpecs,
  toolArguments,
  type ReadResource,
} from './assistant-tools.catalog';
import {
  addReportDatasets,
  boundToolData,
  filterReportCollections,
} from './assistant-tool-output';

@Injectable()
export class AssistantToolsService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  async execute(
    name: string,
    input: unknown,
    principal: AuthPrincipal,
    authorization: string,
    datasets: Map<string, ChartDataset>,
    callId: string,
  ) {
    const spec = assistantToolSpecs.find((tool) => tool.name === name);
    if (!spec) throw new BadRequestException('Unknown read tool.');
    const parsed = (() => {
      try {
        return toolArguments(spec, input);
      } catch {
        throw new BadRequestException(
          'Invalid tool arguments. Use only the documented fields and values.',
        );
      }
    })();
    if (
      spec.name === 'get_notification_report' &&
      parsed.section === 'preferences' &&
      !parsed.customerId
    )
      throw new BadRequestException(
        'Select customerId for notification preferences.',
      );
    if (parsed.includeCustomerContext && !parsed.caseId)
      throw new BadRequestException('Select caseId for customer context.');
    if (!/^Bearer [A-Za-z0-9._~-]+$/.test(authorization))
      throw new UnauthorizedException('Sign in again to use dashboard data.');
    // Recheck the actor for every tool, not just once when a multi-step answer begins.
    const actor = (await this.read(
      { key: 'actor', path: 'users/me', schema: userPublicSchema, query: {} },
      authorization,
    )) as {
      id: string;
      userType: string;
      status: string;
      adminRole: string | null;
      customRoleId?: string | null;
    };
    if (
      actor.id !== principal.userId ||
      actor.userType !== UserType.ADMIN ||
      actor.status !== UserStatus.ACTIVE
    )
      throw new ForbiddenException(
        'Assistant access is currently limited to active administrators.',
      );
    const sections: Record<string, unknown> = {};
    const endpoints = spec.reads(parsed);
    if (spec.name === 'get_kyc_report' && parsed.customerId) {
      const selected = (await this.read(
        {
          key: 'lookup',
          path: 'admin/users/' + parsed.customerId,
          schema: adminUserDetailResponseSchema,
          query: {},
        },
        authorization,
      )) as { email: string };
      endpoints.find((endpoint) => endpoint.key === 'cases')!.query.search =
        selected.email;
    }
    // Sequential reads stop at the first denial. Nothing from a partial report enters model context.
    for (const endpoint of endpoints) {
      const result = await this.read(endpoint, authorization);
      if (!endpoint.gateOnly) sections[endpoint.key] = result;
    }
    if (
      spec.name === 'get_support_case_report' &&
      parsed.includeCustomerContext
    ) {
      const detail = sections.case as { customer: { id: string } };
      sections.customer = await this.read(
        {
          key: 'customer',
          path: 'admin/users/' + detail.customer.id,
          schema: adminUserDetailResponseSchema,
          query: {},
        },
        authorization,
      );
    }
    filterReportCollections(spec.name, sections, parsed);
    const bounded = boundToolData(sections);
    const effective = Object.values(sections).flatMap((value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value))
        return [];
      const section = value as Record<string, unknown>;
      return section.filters
        ? [section.filters]
        : section.windowDays
          ? [{ windowDays: section.windowDays }]
          : [];
    });
    const coverage =
      'Dashboard report ' +
      name +
      '; filters ' +
      JSON.stringify(effective.length ? effective : parsed) +
      '. Fields retain dashboard units; Cents means USD cents. Arrays show at most 50 rows.';
    return {
      source: 'dashboard_api',
      retrievedAt: new Date().toISOString(),
      filters: parsed,
      note:
        spec.note ??
        'Only dashboard-visible fields are included. Respect each collection pagination, restrictions, and source labels.',
      ...bounded,
      chartDatasets: addReportDatasets(
        bounded.data,
        datasets,
        callId,
        coverage,
      ),
    };
  }

  private async read(
    endpoint: ReadResource,
    authorization: string,
  ): Promise<unknown> {
    if (!/^(?:admin|users)\/[a-zA-Z0-9/_-]+$/.test(endpoint.path))
      throw new BadRequestException('Invalid dashboard resource.');
    const url = new URL(
      'http://127.0.0.1:' +
        this.config.get('PORT', { infer: true }) +
        '/api/' +
        endpoint.path,
    );
    for (const [key, value] of Object.entries(endpoint.query)) {
      if (value === undefined) continue;
      if (
        typeof value !== 'string' &&
        typeof value !== 'number' &&
        typeof value !== 'boolean'
      )
        throw new BadRequestException('Invalid dashboard filter value.');
      url.searchParams.set(key, String(value));
    }
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: authorization },
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new ServiceUnavailableException(
        'The dashboard report is temporarily unavailable.',
      );
    }
    if (response.status === 401)
      throw new UnauthorizedException('Your session ended. Sign in again.');
    if (response.status === 403)
      throw new ForbiddenException(
        'You do not have access to this dashboard report or requested section.',
      );
    if (response.status === 404)
      throw new BadRequestException(
        'No accessible record was found for that selection.',
      );
    if (response.status === 400)
      throw new BadRequestException(
        'The dashboard rejected these filters. Check the date range and selected record.',
      );
    if (!response.ok)
      throw new ServiceUnavailableException(
        'The dashboard report could not be loaded.',
      );
    const reader = response.body?.getReader();
    if (!reader)
      throw new BadGatewayException(
        'The dashboard returned an invalid report.',
      );
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 1000000) {
          await reader.cancel();
          throw new BadGatewayException(
            'This report is too large. Narrow the selection.',
          );
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    let raw: unknown;
    try {
      raw = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      throw new BadGatewayException(
        'The dashboard returned an invalid report.',
      );
    }
    const result = endpoint.schema.safeParse(raw);
    if (!result.success)
      throw new BadGatewayException(
        'The dashboard report format could not be validated.',
      );
    return result.data;
  }
}
