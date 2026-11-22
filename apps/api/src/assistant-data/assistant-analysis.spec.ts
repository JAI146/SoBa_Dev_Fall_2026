import { ForbiddenException } from '@nestjs/common';
import type { AssistantChart } from '@purposemint/contracts';
import { runAnalysisTool } from './assistant-analysis-tool';
import { loadCustomerDataset } from './assistant-customer-dataset';
import { analyzeDataset } from './assistant-analysis';
import type { ChartDataset } from './assistant-chart';
import type { ReadResource } from './assistant-tools.catalog';

// Synthetic dashboard rows, after response-schema validation. Duplicate names, two awards,
// overlapping applications, missing progress, and a zero balance with an entry are intentional.
const customers = [
  {
    id: 'a',
    name: 'Alex',
    savedAmount: 0,
    progressPercent: 0,
    recordedEntryCount: 1,
  },
  {
    id: 'b',
    name: 'Alex',
    savedAmount: 50,
    progressPercent: 50,
    recordedEntryCount: 2,
  },
  {
    id: 'c',
    name: 'Bea',
    savedAmount: 0,
    progressPercent: null,
    recordedEntryCount: 0,
  },
  {
    id: 'd',
    name: 'Dev',
    savedAmount: 90,
    progressPercent: 90,
    recordedEntryCount: 1,
  },
];
const page = { page: 1, total: 4, pageSize: 50 };
function fixture({ key }: ReadResource) {
  if (key === 'savings')
    return { customers: { items: customers, pagination: page } };
  if (key === 'subscriptions')
    return {
      ...page,
      items: customers.map((r, i) => ({
        id: r.id,
        userId: r.id,
        planName: i < 3 ? 'Starter' : 'Growth',
      })),
    };
  if (key === 'awards')
    return {
      items: [
        { userId: 'a', badgeId: 'b1' },
        { userId: 'a', badgeId: 'b2' },
        { userId: 'b', badgeId: 'b1' },
      ],
    };
  if (key === 'workspace')
    return {
      applications: [
        ['a', 'Housing'],
        ['a', 'Housing'],
        ['a', 'Work'],
        ['b', 'Work'],
      ].map(([id, title]) => ({ applicant: { id }, pathway: { title } })),
    };
  throw new Error('Unexpected data source');
}
const view = (field: string) => ({
  plan: {
    groupBy: [field],
    measures: [
      { field: 'progressPercent', op: 'avg' },
      { field: 'savedAmount', op: 'sum' },
      { field: 'noSavingsActivity', op: 'pct_true' },
    ],
  },
  chartMetric: 'avg_progressPercent',
  chartType: 'bar',
});
const request = {
  source: 'customers',
  views: ['plan', 'badgeStatus', 'pathway'].map(view),
};
const read = (endpoint: ReadResource) => Promise.resolve(fixture(endpoint));
describe('assistant analysis', () => {
  it('matches the three-chart savings comparison against manually calculated results', async () => {
    const charts: AssistantChart[] = [];
    const results = await runAnalysisTool(
      request,
      new Map(),
      'r',
      charts,
      (fields) => loadCustomerDataset(read, fields),
    );
    expect(results.data.sourceRows).toBe(4);
    const [plans, badges, pathways] = results.data.views;
    expect(plans.rows).toEqual([
      expect.objectContaining({
        group: 'Growth',
        rowCount: 1,
        avg_progressPercent: 90,
        sum_savedAmount: 90,
        pct_true_noSavingsActivity: 0,
      }),
      expect.objectContaining({
        group: 'Starter',
        rowCount: 3,
        valid_progressPercent: 2,
        avg_progressPercent: 25,
        sum_savedAmount: 50,
        pct_true_noSavingsActivity: 33.333333,
      }),
    ]);
    expect(
      badges.rows.map((r) => [r.group, r.rowCount, r.avg_progressPercent]),
    ).toEqual([
      ['No badges', 2, 90],
      ['With badges', 2, 25],
    ]);
    expect(
      pathways.rows.map((r) => [r.group, r.rowCount, r.avg_progressPercent]),
    ).toEqual([
      ['Housing', 1, 0],
      ['No pathway', 2, 90],
      ['Work', 2, 25],
    ]);
    expect(charts).toHaveLength(3);
    for (const [i, chart] of charts.entries()) {
      expect(chart.data).toEqual(
        results.data.views[i].rows.map((r) => ({
          name: r.group,
          value: r.avg_progressPercent,
          sampleSize: r.rowCount,
        })),
      );
      expect(chart.title).toMatch(/progress/i);
    }
    expect(JSON.stringify(results)).not.toContain('Alex');
  });
  it('does not publish partial results if a source is denied or any requested chart is invalid', async () => {
    const datasets = new Map<string, ChartDataset>(),
      charts: AssistantChart[] = [];
    const denied = (end: ReadResource) =>
      end.key === 'workspace'
        ? Promise.reject(new ForbiddenException())
        : read(end);
    await expect(
      runAnalysisTool(request, datasets, 'r', charts, (f) =>
        loadCustomerDataset(denied, f),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      runAnalysisTool(
        {
          ...request,
          views: [
            view('plan'),
            { ...view('badgeStatus'), chartMetric: 'subscriptionPrice' },
          ],
        },
        datasets,
        'r',
        charts,
        (f) => loadCustomerDataset(read, f),
      ),
    ).rejects.toThrow('chart metric');
    expect(datasets.size).toBe(0);
    expect(charts).toEqual([]);
  });
  it('reads additional pages and detects duplicate or inconsistent page membership', async () => {
    const pages = (duplicate: boolean) => (resource: ReadResource) => {
      const start = resource.query.page === 1 ? 0 : 50;
      return Promise.resolve({
        customers: {
          pagination: { page: resource.query.page, total: 51, pageSize: 50 },
          items: Array.from({ length: start ? 1 : 50 }, (_, i) => ({
            ...customers[1],
            id: String((duplicate ? 0 : start) + i),
          })),
        },
      });
    };
    const fields = new Set(['progressPercent']);
    expect((await loadCustomerDataset(pages(false), fields)).rows).toHaveLength(
      51,
    );
    await expect(loadCustomerDataset(pages(true), fields)).rejects.toThrow(
      'moved',
    );
  });
  it('filters and ranks a report within its retrieved scope and preserves unknown values', () => {
    const input: ChartDataset = {
      rows: [
        { team: 'A', value: null },
        { team: 'B', value: 4 },
        { team: 'B', value: 6 },
        { team: 'C', value: 10 },
      ],
      categories: ['team'],
      metrics: ['value'],
      scope: 'Page 2 only',
    };
    const result = analyzeDataset(input, {
      groupBy: ['team'],
      filters: [{ field: 'team', op: 'ne', value: 'C' }],
      measures: [{ field: 'value', op: 'median' }],
      orderBy: 'median_value',
      direction: 'desc',
    });
    expect(result.dataset.scope).toBe('Page 2 only');
    expect(result.dataset.rows).toEqual([
      { group: 'B', rowCount: 2, valid_value: 2, median_value: 5 },
      { group: 'A', rowCount: 1, valid_value: 0, median_value: null },
    ]);
    expect(() =>
      analyzeDataset(input, {
        filters: [{ field: 'hidden', op: 'is_known', value: null }],
      }),
    ).toThrow();
  });
  it('ranks only groups meeting the size threshold after filtering customers', async () => {
    const dataset = await loadCustomerDataset(
      read,
      new Set(['badgeCount', 'plan', 'progressPercent']),
    );
    const result = analyzeDataset(dataset, {
      groupBy: ['plan'],
      filters: [{ field: 'badgeCount', op: 'gte', value: 1 }],
      measures: [{ field: 'progressPercent', op: 'median' }],
      minGroupSize: 2,
      orderBy: 'median_progressPercent',
      direction: 'desc',
      limit: 1,
    });
    expect(result.dataset.rows).toEqual([
      {
        group: 'Starter',
        rowCount: 2,
        valid_progressPercent: 2,
        median_progressPercent: 25,
      },
    ]);
  });
});
