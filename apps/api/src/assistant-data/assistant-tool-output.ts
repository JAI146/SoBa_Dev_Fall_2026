import type { Args } from './assistant-tools.catalog';
import { BadGatewayException } from '@nestjs/common';
import type { ChartDataset } from './assistant-chart';

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const privateKey =
  /^(?:.*password.*|.*secret.*|.*access.?key.*|.*api.?key.*|.*token.*|.*credential.*|.*authorization.*|.*cookie.*|ipAddress|ip_address|profileImageUrl|stack|sql|connectionString|databaseUrl)$/i;
const redact = (text: string) =>
  text.replace(
    /sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9._~-]+|(?:postgres(?:ql)?|mysql):\/\/[^\s]+/gi,
    '[redacted credential]',
  );

/** Bound only already-validated dashboard DTOs. Never feed entities or provider errors here. */
export function boundToolData(value: unknown) {
  const truncations: { path: string; available: number; returned: number }[] =
    [];
  function visit(item: unknown, path: string, depth: number): unknown {
    if (depth > 14) {
      truncations.push({ path, available: 1, returned: 0 });
      return '[nested detail omitted]';
    }
    if (typeof item === 'string') {
      const safe = redact(item);
      if (safe.length > 4000)
        truncations.push({ path, available: safe.length, returned: 4000 });
      return safe.slice(0, 4000);
    }
    if (Array.isArray(item)) {
      if (item.length > 50)
        truncations.push({ path, available: item.length, returned: 50 });
      return item
        .slice(0, 50)
        .map((entry, i) => visit(entry, path + '[' + i + ']', depth + 1));
    }
    if (record(item))
      return Object.fromEntries(
        Object.entries(item)
          .filter(([key]) => !privateKey.test(key))
          .map(([key, v]) => [key, visit(v, path + '.' + key, depth + 1)]),
      );
    return item;
  }
  const data = visit(value, 'data', 0);
  if (Buffer.byteLength(JSON.stringify(data)) > 90000)
    throw new BadGatewayException(
      'This report is too large. Select a record, section or narrower filters.',
    );
  return { data, truncations };
}

/** Discover chart columns from permitted DTO collections, never from model-provided values. */
export function addReportDatasets(
  data: unknown,
  datasets: Map<string, ChartDataset>,
  prefix: string,
  scope: string,
) {
  const added: string[] = [];
  function visit(value: unknown, path: string, depth: number, detail = '') {
    if (depth > 7 || added.length >= 24) return;
    if (Array.isArray(value)) {
      const rows = value.filter(record).map((row) => {
        const flat: Record<string, unknown> = {};
        const flatten = (
          item: Record<string, unknown>,
          prefix = '',
          depth = 0,
        ) => {
          for (const [key, child] of Object.entries(item)) {
            if (key === 'metadata' || key === 'history') continue;
            const name = prefix + key;
            if (record(child) && depth < 2)
              flatten(child, name + '.', depth + 1);
            else if (!Array.isArray(child) && !record(child))
              flat[name] = child;
          }
        };
        flatten(row);
        return flat;
      });
      if (rows.length) {
        const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
        const categories = keys.filter(
          (key) =>
            !/(?:id$|email|description|note|reason|prompt|metadata|url)/i.test(
              key,
            ) &&
            rows.some(
              (row) =>
                typeof row[key] === 'string' ||
                typeof row[key] === 'boolean' ||
                (/^(level|week|year)$/.test(key) &&
                  typeof row[key] === 'number'),
            ),
        );
        const metrics = keys.filter(
          (key) =>
            !/(?:id$|version|page)/i.test(key) &&
            rows.some(
              (row) =>
                typeof row[key] === 'number' && Number.isFinite(row[key]),
            ),
        );
        if (categories.length) {
          const id = prefix + '_' + added.length;
          const summary =
            /summary|byAction|byOutcome|byActor|byDay|analytics|weekly|cohorts|counts|groups|byPlan|byPathway|byPartner|buckets/i.test(
              path,
            );
          const chartScope = (
            scope +
            ' Collection: ' +
            path +
            '. ' +
            detail +
            ' ' +
            (summary
              ? 'Use the response summary/filter definitions; grouped rows may be capped.'
              : 'Chart covers only the returned records, not an assumed full population.')
          ).slice(0, 500);
          datasets.set(id, { rows, categories, metrics, scope: chartScope });
          added.push(id);
        }
      }
      // Nested goal/customer collections are discovered for selected record reports.
      value.slice(0, 5).forEach((row, i) => {
        if (record(row))
          Object.entries(row).forEach(([key, child]) => {
            if (Array.isArray(child) || record(child))
              visit(child, path + '[' + i + '].' + key, depth + 1);
          });
      });
    } else if (record(value))
      for (const [key, child] of Object.entries(value)) {
        if (key === 'metadata' || key === 'history') continue;
        const paging = record(value.pagination) ? value.pagination : value;
        const coverage =
          key === 'items' && typeof paging.page === 'number'
            ? 'Page ' +
              paging.page +
              ', ' +
              (Array.isArray(child) ? child.length : 0) +
              ' of ' +
              (typeof paging.total === 'number' ? paging.total : 'unknown') +
              ' matching records.'
            : key === 'items' && typeof value.hasMore === 'boolean'
              ? value.hasMore
                ? 'Only top groups are shown; additional groups exist.'
                : 'All returned summary groups are shown.'
              : detail;
        visit(child, path + '.' + key, depth + 1, coverage);
      }
  }
  visit(data, 'report', 0);
  return added.map((id) => {
    const d = datasets.get(id)!;
    return {
      datasetId: id,
      categories: d.categories,
      metrics: d.metrics,
      scope: d.scope,
    };
  });
}

/** Catalog pages filter locally in the dashboard; mirror that after DTO validation. */
export function filterReportCollections(
  name: string,
  sections: Record<string, unknown>,
  args: Args,
) {
  const matches = (row: Record<string, unknown>) =>
    !args.search ||
    JSON.stringify(row)
      .toLowerCase()
      .includes(String(args.search).toLowerCase());
  const pageList = (
    items: unknown[],
    predicate: (row: Record<string, unknown>) => boolean,
  ) => {
    const rows = items.filter(record).filter(predicate);
    const page = Number(args.page ?? 1),
      pageSize = Number(args.pageSize ?? 25);
    return {
      items: rows.slice((page - 1) * pageSize, page * pageSize),
      pagination: {
        page,
        pageSize,
        total: rows.length,
        hasMore: page * pageSize < rows.length,
      },
    };
  };
  if (name === 'get_badge_report') {
    const catalog = record(sections.catalog) ? sections.catalog : null;
    const activeIds = new Set(
      catalog && Array.isArray(catalog.items)
        ? catalog.items
            .filter(record)
            .filter(
              (row) => args.active === undefined || row.active === args.active,
            )
            .map((row) => row.id)
        : [],
    );
    if (catalog && Array.isArray(catalog.items))
      Object.assign(
        catalog,
        pageList(
          catalog.items,
          (row) =>
            matches(row) &&
            (!args.badgeId || row.id === args.badgeId) &&
            (args.active === undefined || row.active === args.active),
        ),
      );
    const awards = record(sections.awards) ? sections.awards : null;
    if (awards && Array.isArray(awards.items))
      Object.assign(
        awards,
        pageList(
          awards.items,
          (row) =>
            matches(row) &&
            (!args.badgeId || row.badgeId === args.badgeId) &&
            (args.active === undefined || activeIds.has(row.badgeId)),
        ),
      );
  }
  if (name === 'get_pathway_report' && record(sections.workspace)) {
    const workspace = sections.workspace;
    const pagination: Record<string, unknown> = {};
    for (const key of ['pathways', 'partners', 'applications']) {
      if (!Array.isArray(workspace[key])) continue;
      const result = pageList(workspace[key] as unknown[], (row) => {
        if (!matches(row)) return false;
        const pathway = record(row.pathway) ? row.pathway : null;
        if (
          args.pathwayKey &&
          (key === 'pathways'
            ? row.key
            : key === 'partners'
              ? row.pathwayKey
              : pathway?.key) !== args.pathwayKey
        )
          return false;
        if (
          key !== 'applications' &&
          args.active !== undefined &&
          row.isActive !== args.active
        )
          return false;
        if (key === 'applications' && args.status && row.status !== args.status)
          return false;
        if (
          key === 'applications' &&
          args.readiness &&
          row.checklistReady !== (args.readiness === 'ready')
        )
          return false;
        return true;
      });
      workspace[key] = result.items;
      pagination[key] = result.pagination;
    }
    workspace.paginationByCollection = pagination;
  }
}
