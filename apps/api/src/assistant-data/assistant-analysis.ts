import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { readableField, type ChartDataset } from './assistant-chart';

const comparisons = [
  'eq',
  'ne',
  'lt',
  'lte',
  'gt',
  'gte',
  'contains',
  'is_known',
  'is_missing',
] as const;
const operations = [
  'avg',
  'sum',
  'min',
  'max',
  'median',
  'pct_zero',
  'pct_true',
  'valid',
] as const;
const field = z.string().min(1).max(160);
const filter = z
  .object({
    field,
    op: z.enum(comparisons),
    value: z.union([
      z.string().max(400),
      z.number().finite(),
      z.boolean(),
      z.null(),
    ]),
  })
  .strict();
const measure = z.object({ field, op: z.enum(operations) }).strict();
const planSchema = z
  .object({
    groupBy: z.array(field).max(2).default([]),
    filters: z.array(filter).max(12).default([]),
    measures: z.array(measure).max(8).default([]),
    orderBy: field.nullable().default(null),
    direction: z.enum(['asc', 'desc']).default('asc'),
    minGroupSize: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(50).default(50),
  })
  .strict();
type Measure = z.infer<typeof measure>;
type Filter = z.infer<typeof filter>;
type Row = Record<string, unknown>;
type Scalar = Exclude<Filter['value'], null>;

const stringField = { type: 'string' };
export const analysisPlanParameters = {
  groupBy: {
    type: 'array',
    items: stringField,
    maxItems: 2,
    description:
      'Zero to two available category fields. An empty array analyzes the entire filtered cohort.',
  },
  measures: {
    type: 'array',
    maxItems: 8,
    items: {
      type: 'object',
      properties: {
        field: stringField,
        op: { type: 'string', enum: operations },
      },
      required: ['field', 'op'],
      additionalProperties: false,
    },
    description:
      'Each output key is op_field, e.g. avg_progressPercent. rowCount and valid_field (known count) are automatic. pct_true uses a boolean, pct_zero uses a number. Both exclude unknowns.',
  },
  filters: {
    type: 'array',
    maxItems: 12,
    items: {
      type: 'object',
      properties: {
        field: stringField,
        op: { type: 'string', enum: comparisons },
        value: { type: ['string', 'number', 'boolean', 'null'] },
      },
      required: ['field', 'op', 'value'],
      additionalProperties: false,
    },
    description:
      'AND conditions on allowlisted fields. Nulls match only is_missing. Use null as value for is_known/is_missing. String comparisons are case insensitive. For multiple memberships, eq matches any.',
  },
  orderBy: {
    type: ['string', 'null'],
    description:
      'group, rowCount, a computed metric key, or null for alphabetical order.',
  },
  direction: { type: 'string', enum: ['asc', 'desc'] },
  minGroupSize: {
    type: 'integer',
    minimum: 1,
    description:
      'Minimum records per group before ranking. Use 1 unless the user specifies a minimum.',
  },
  limit: {
    type: 'integer',
    minimum: 1,
    maximum: 50,
    description:
      'Maximum groups to return after sorting. Use 50 for an unranked comparison.',
  },
};
export const analysisPlanSchema = {
  type: 'object',
  properties: analysisPlanParameters,
  required: Object.keys(analysisPlanParameters),
  additionalProperties: false,
};

const fail = (message: string): never => {
  throw new BadRequestException(message);
};
const isScalar = (v: unknown): v is Scalar =>
  typeof v === 'string' ||
  typeof v === 'boolean' ||
  (typeof v === 'number' && Number.isFinite(v));
const scalarValues = (v: unknown) =>
  (Array.isArray(v) ? v : [v]).filter(isScalar);

function matches(row: Row, condition: Filter) {
  const values = scalarValues(row[condition.field]);
  if (condition.op === 'is_known') return values.length > 0;
  if (condition.op === 'is_missing') return values.length === 0;
  if (!values.length) return false;
  const target =
    typeof condition.value === 'string'
      ? condition.value.toLowerCase()
      : condition.value;
  const matched = values.some((raw) => {
    const value = typeof raw === 'string' ? raw.toLowerCase() : raw;
    if (target === null || typeof value !== typeof target) return false;
    switch (condition.op) {
      case 'eq':
      case 'ne':
        return value === target;
      case 'contains':
        return (
          typeof value === 'string' &&
          typeof target === 'string' &&
          value.includes(target)
        );
      case 'lt':
        return value < target;
      case 'lte':
        return value <= target;
      case 'gt':
        return value > target;
      case 'gte':
        return value >= target;
      default:
        return false;
    }
  });
  return condition.op === 'ne' ? !matched : matched;
}

const opNames: Record<Measure['op'], string> = {
  avg: 'Average',
  sum: 'Total',
  min: 'Lowest',
  max: 'Highest',
  median: 'Median',
  valid: 'Known values for',
  pct_zero: 'Zero',
  pct_true: 'Share with',
};
function metricLabel(m: Measure) {
  const name = readableField(m.field);
  if (m.op === 'valid') return 'Known values for ' + name;
  if (m.op === 'pct_zero') return 'Share with zero ' + name + ' (%)';
  if (m.op === 'pct_true') return 'Share with ' + name + ' (%)';
  const unitName = name
    .replace(/\bpercent$/, '(%)')
    .replace(/\bcents$/, '(USD cents)');
  return opNames[m.op] + ' ' + unitName;
}

// Memberships overlap across groups, but a source row contributes at most once to each group.
function groupRows(rows: Row[], fields: string[]) {
  const groups = new Map<string, { group: string; rows: Row[] }>();
  if (!fields.length) return [{ group: 'All records', rows }];
  let assignments = 0;
  for (const row of rows) {
    let tuples: (Scalar | null)[][] = [[]];
    for (const key of fields) {
      const values = [...new Set(scalarValues(row[key]))];
      const labels = values.length ? values : [null];
      if (labels.length * tuples.length > 1000)
        fail('Too many overlapping groups per record. Narrow the analysis.');
      tuples = tuples.flatMap((prefix) => labels.map((v) => [...prefix, v]));
    }
    assignments += tuples.length;
    if (assignments > 100000)
      fail('Too many group memberships. Narrow the analysis.');
    for (const tuple of tuples) {
      const key = JSON.stringify(tuple);
      const bucket = groups.get(key) ?? {
        group: tuple.map((v) => String(v ?? 'Unknown')).join(' / '),
        rows: [] as Row[],
      };
      bucket.rows.push(row);
      groups.set(key, bucket);
    }
  }
  return [...groups.values()];
}

function summarize(values: number[], op: Measure['op']) {
  if (!values.length) return null;
  const total = values.reduce((s, v) => s + v, 0);
  switch (op) {
    case 'avg':
      return total / values.length;
    case 'sum':
      return total;
    case 'pct_zero':
      return (100 * values.filter((v) => v === 0).length) / values.length;
    case 'pct_true':
      return (100 * total) / values.length;
    case 'min':
      return values.reduce((a, b) => Math.min(a, b));
    case 'max':
      return values.reduce((a, b) => Math.max(a, b));
    case 'median': {
      values.sort((a, b) => a - b);
      return (
        (values[Math.floor((values.length - 1) / 2)] +
          values[Math.floor(values.length / 2)]) /
        2
      );
    }
    case 'valid':
      return values.length;
  }
}

export function parseAnalysisPlan(input: unknown) {
  const parsed = planSchema.safeParse(input);
  if (!parsed.success)
    throw new BadRequestException(
      'Invalid analysis plan: ' + parsed.error.issues[0].message,
    );
  return parsed.data;
}

export function analyzeDataset(source: ChartDataset, input: unknown) {
  if (source.analysis)
    fail(
      'Recalculate from the original report or customers. Group summaries have different denominators.',
    );
  const plan = parseAnalysisPlan(input);
  const allowed = new Set([...source.categories, ...source.metrics]);
  if (
    plan.groupBy.some((key) => !source.categories.includes(key)) ||
    [...plan.filters, ...plan.measures].some((item) => !allowed.has(item.field))
  ) {
    fail(
      'Analysis can use only the categories and measurements listed for this dataset.',
    );
  }
  for (const f of plan.filters) {
    if ((f.op === 'is_missing' || f.op === 'is_known') !== (f.value === null))
      fail('Use null only with is_missing and is_known.');
    if (
      f.value !== null &&
      source.rows.some((row) =>
        scalarValues(row[f.field]).some((v) => typeof v !== typeof f.value),
      )
    )
      fail('Use a filter value of the same type as ' + f.field + '.');
    if (f.op === 'contains' && typeof f.value !== 'string')
      fail('Use contains only with text.');
  }
  const labels = new Map([['rowCount', 'Record count']]);
  for (const m of plan.measures) {
    if (
      m.op !== 'pct_true' &&
      m.op !== 'valid' &&
      !source.metrics.includes(m.field)
    )
      fail('Use a numeric measurement for ' + m.op + '.');
    if (m.op === 'sum' && /percent|rate$/i.test(m.field))
      fail('Percentages and rates cannot be summed.');
    if (
      m.op === 'pct_true' &&
      source.rows.some(
        (row) => row[m.field] != null && typeof row[m.field] !== 'boolean',
      )
    )
      fail('pct_true requires a boolean field.');
    labels.set(m.op + '_' + m.field, metricLabel(m));
    labels.set(
      'valid_' + m.field,
      metricLabel({ field: m.field, op: 'valid' }),
    );
  }
  const order = plan.orderBy ?? 'group';
  if (order !== 'group' && !labels.has(order))
    fail('Sort by group, rowCount, or an output measurement.');
  const matched = source.rows.filter((row) =>
    plan.filters.every((f) => matches(row, f)),
  );
  const groups = groupRows(matched, plan.groupBy).filter(
    (group) => group.rows.length >= plan.minGroupSize,
  );
  const summaries = groups.map(({ group, rows }) => {
    const stats: Record<string, number | null> = { rowCount: rows.length };
    for (const m of plan.measures) {
      const present = rows
        .map((row) => row[m.field])
        .filter((v) => scalarValues(v).length > 0);
      if (m.op === 'valid') {
        stats['valid_' + m.field] = present.length;
        continue;
      }
      const nums =
        m.op === 'pct_true'
          ? present.map((v) => Number(v))
          : present.filter(
              (v): v is number => typeof v === 'number' && Number.isFinite(v),
            );
      stats['valid_' + m.field] = nums.length;
      const result = summarize(nums, m.op);
      if (result !== null && !Number.isFinite(result))
        fail('Measurement exceeds the supported numeric range.');
      stats[m.op + '_' + m.field] =
        result === null ? null : Number(result.toFixed(6));
    }
    return { group, stats };
  });
  const sign = plan.direction === 'desc' ? -1 : 1;
  summaries.sort((a, b) => {
    const tie = a.group.localeCompare(b.group, 'en');
    if (order === 'group') return sign * tie;
    const av = a.stats[order],
      bv = b.stats[order];
    if (av === null || bv === null)
      return Number(av === null) - Number(bv === null) || tie;
    return sign * (av - bv) || tie;
  });
  const dataset: ChartDataset = {
    rows: summaries
      .slice(0, plan.limit)
      .map((r) => ({ group: r.group, ...r.stats })),
    categories: ['group'],
    metrics: [...labels.keys()],
    scope: source.scope,
  };
  return {
    dataset,
    matchedRows: matched.length,
    totalRows: source.rows.length,
    totalGroups: groups.length,
    measures: [...labels].map(([key, label]) => ({ key, label })),
  };
}
