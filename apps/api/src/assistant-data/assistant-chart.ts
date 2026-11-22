import { BadRequestException } from '@nestjs/common';
import {
  assistantChartSchema,
  type AssistantChart,
} from '@purposemint/contracts';
import { z } from 'zod';

export type ChartDataset = {
  rows: Record<string, unknown>[];
  categories: string[];
  metrics: string[];
  scope: string;
  analysis?: { labels: Record<string, string>; groupedBy: string };
};
export const readableField = (field: string) =>
  field
    .replace(/[._]/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase();
export const chartRequestSchema = z
  .object({
    datasetId: z.string(),
    type: z.enum(['bar', 'line', 'area', 'pie']),
    title: z.string().min(1).max(160),
    category: z.string(),
    metric: z.string(),
    aggregate: z.enum(['sum', 'count', 'value']),
  })
  .strict();

export function buildAssistantChart(
  input: unknown,
  datasets: Map<string, ChartDataset>,
): AssistantChart {
  const query = chartRequestSchema.safeParse(input);
  if (!query.success) throw new BadRequestException('Invalid chart options.');
  const q = query.data;
  if (q.aggregate === 'sum' && /(?:percent|rate)$/i.test(q.metric)) {
    throw new BadRequestException(
      'Use aggregate value for per-record percentages or rates; summing them would be misleading.',
    );
  }
  const dataset = datasets.get(q.datasetId);
  if (dataset?.analysis && q.aggregate !== 'value')
    throw new BadRequestException('Plot the calculated group values directly.');
  if (dataset?.metrics.includes('count') && q.aggregate === 'count') {
    throw new BadRequestException(
      'This is an aggregated dataset. Use aggregate sum and metric count to chart event totals; counting summary rows gives incorrect event counts.',
    );
  }
  if (
    !dataset ||
    !dataset.categories.includes(q.category) ||
    (q.aggregate !== 'count' && !dataset.metrics.includes(q.metric))
  )
    throw new BadRequestException(
      'Choose a dataset and fields returned by a data tool in this request.',
    );
  const grouped = new Map<string, number>();
  const points: { name: string; value: number | null }[] = [];
  for (const row of dataset.rows) {
    const raw = row[q.category];
    const name = (
      typeof raw === 'string'
        ? raw
        : typeof raw === 'number' || typeof raw === 'boolean'
          ? String(raw)
          : 'Unknown'
    ).slice(0, 160);
    const label = q.category === 'createdAt' ? name.slice(0, 10) : name;
    const value = q.aggregate === 'count' ? 1 : row[q.metric];
    if (q.aggregate === 'value' && value === null) {
      points.push({ name: label, value: null });
      continue;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    if (q.aggregate === 'value') points.push({ name: label, value });
    else grouped.set(label, (grouped.get(label) ?? 0) + value);
  }
  // Percentages and other per-record measurements must not be summed by name.
  const data =
    q.aggregate === 'value'
      ? points
      : [...grouped]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, value]) => ({ name, value }));
  if (
    q.type === 'pie' &&
    data.some((point) => typeof point.value === 'number' && point.value < 0)
  )
    throw new BadRequestException(
      'Pie charts cannot show negative values. Choose a bar or line chart.',
    );
  const valueLabel =
    dataset.analysis?.labels[q.metric] ??
    (q.aggregate === 'count'
      ? 'Record count'
      : (q.aggregate === 'sum' ? 'Total ' : '') + readableField(q.metric));
  const grouping = dataset.analysis?.groupedBy ?? readableField(q.category);
  const title =
    valueLabel.charAt(0).toUpperCase() +
    valueLabel.slice(1) +
    (grouping ? ' by ' + grouping : '');
  const result = assistantChartSchema.safeParse({
    type: q.type,
    title: title.slice(0, 160),
    valueLabel: valueLabel.slice(0, 80),
    scope: (data.some((point) => point.value === null)
      ? data.filter((point) => point.value === null).length +
        ' records have no available value; see the data table. ' +
        dataset.scope
      : dataset.scope
    ).slice(0, 500),
    data: dataset.analysis
      ? data.map((point, i) => ({
          ...point,
          sampleSize: dataset.rows[i].rowCount,
        }))
      : data,
  });
  if (!result.success)
    throw new BadRequestException(
      'This dataset cannot be charted with those options.',
    );
  return result.data;
}
