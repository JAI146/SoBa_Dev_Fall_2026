import { BadRequestException } from '@nestjs/common';
import { type AssistantChart } from '@purposemint/contracts';
import { z } from 'zod';
import {
  analyzeDataset,
  analysisPlanSchema,
  parseAnalysisPlan,
} from './assistant-analysis';
import { customerFields } from './assistant-customer-dataset';
import {
  buildAssistantChart,
  readableField,
  type ChartDataset,
} from './assistant-chart';

const chartTypes = ['bar', 'line', 'area', 'pie'] as const;
const view = z
  .object({
    plan: z.unknown(),
    chartMetric: z.string().min(1).max(100).nullable(),
    chartType: z.enum(chartTypes).nullable(),
  })
  .strict()
  .refine(
    (v) => Boolean(v.chartMetric) === Boolean(v.chartType),
    'Set both chart options or neither.',
  );

const request = z
  .object({
    source: z.string().min(1).max(80),
    views: z.array(view).min(1).max(3),
  })
  .strict();

export const analysisTool = {
  type: 'function',
  name: 'analyze_dashboard',
  strict: true,
  description:
    'Compute grouped comparisons, filters, rankings and charts on the server. For customer savings/engagement comparisons use source "customers" directly. This joins all authorized pages by customer and calculates up to three independent views in one call. Each view can render a chart automatically. For other reports use a datasetId returned by its read tool; its page scope still applies. Include every requested statistic as a measure. To compare average savings progress by plan, badge status and pathway use three separate views grouped by plan, badgeStatus and pathway, each with avg on progressPercent and chartMetric avg_progressPercent. Use pct_true on noSavingsActivity for the share without recorded activity. Customer fields: ' +
    Object.entries(customerFields)
      .map(([key, description]) => key + ' = ' + description)
      .join('; '),
  parameters: {
    type: 'object',
    additionalProperties: false,
    required: ['source', 'views'],
    properties: {
      source: {
        type: 'string',
        description: '"customers" or a returned datasetId.',
      },
      views: {
        type: 'array',
        minItems: 1,
        maxItems: 3,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['plan', 'chartMetric', 'chartType'],
          properties: {
            plan: analysisPlanSchema,
            chartMetric: {
              type: ['string', 'null'],
              description:
                'Use rowCount or <operation>_<field>, e.g. avg_progressPercent; null for table only.',
            },
            chartType: {
              type: ['string', 'null'],
              enum: [...chartTypes, null],
              description:
                'Use bar for comparing averages. Use pie only for additive, exclusive parts of a whole.',
            },
          },
        },
      },
    },
  },
};

export async function runAnalysisTool(
  input: unknown,
  datasets: Map<string, ChartDataset>,
  prefix: string,
  charts: AssistantChart[],
  customers: (fields: Set<string>) => Promise<ChartDataset>,
) {
  const parsed = request.safeParse(input);
  if (!parsed.success)
    throw new BadRequestException(
      'Supply one to three analysis views with valid chart options.',
    );
  const { source, views } = parsed.data;
  const plans = views.map((v) => parseAnalysisPlan(v.plan));
  const fields = new Set(
    plans.flatMap((p) => [
      ...p.groupBy,
      ...p.filters.map((f) => f.field),
      ...p.measures.map((m) => m.field),
    ]),
  );
  const dataset =
    source === 'customers' ? await customers(fields) : datasets.get(source);
  if (!dataset)
    throw new BadRequestException(
      'Select customers or a dataset returned by a dashboard report.',
    );
  const stagedCharts: AssistantChart[] = [];
  const stagedDatasets = new Map<string, ChartDataset>();
  const results = views.map(({ chartMetric, chartType }, i) => {
    const plan = plans[i];
    const result = analyzeDataset(dataset, plan);
    const datasetId = prefix + '_view_' + (i + 1);
    const by = plan.groupBy.map(readableField).join(' and ');
    const label = result.measures.find((m) => m.key === chartMetric)?.label;
    const table = result.dataset;
    table.analysis = {
      labels: Object.fromEntries(result.measures.map((m) => [m.key, m.label])),
      groupedBy: by,
    };
    if (chartMetric && !label)
      throw new BadRequestException(
        'The chart metric must be one of the calculated measures.',
      );
    let chartTitle: string | undefined;
    if (label && chartMetric && chartType && table.rows.length) {
      if (charts.length + stagedCharts.length >= 3)
        throw new BadRequestException('Maximum three charts per reply.');
      if (
        chartType === 'pie' &&
        (plan.groupBy.some((k) =>
          ['pathway', 'submittedPathway', 'badge'].includes(k),
        ) ||
          !/^(?:rowCount$|sum_|valid_)/.test(chartMetric))
      ) {
        throw new BadRequestException(
          'Use a bar chart for overlapping groups, averages or percentages.',
        );
      }
      const chart = buildAssistantChart(
        {
          datasetId,
          type: chartType,
          title: label.slice(0, 160),
          category: 'group',
          metric: chartMetric,
          aggregate: 'value',
        },
        new Map([[datasetId, table]]),
      );
      chartTitle = chart.title;
      stagedCharts.push(chart);
    }
    stagedDatasets.set(datasetId, table);
    return {
      datasetId,
      groupBy: plan.groupBy,
      filters: plan.filters,
      matchedRows: result.matchedRows,
      totalGroups: result.totalGroups,
      returnedGroups: table.rows.length,
      measures: result.measures,
      rows: table.rows,
      chartTitle,
    };
  });
  // A bad later view must never leave an unrelated or partially validated chart in the reply.
  for (const [id, table] of stagedDatasets) datasets.set(id, table);
  charts.push(...stagedCharts);
  return {
    data: {
      sourceRows: dataset.rows.length,
      scope: dataset.scope,
      views: results,
    },
  };
}
