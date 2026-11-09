import { buildAssistantChart, type ChartDataset } from './assistant-chart';
describe('buildAssistantChart', () => {
  const datasets = new Map<string, ChartDataset>([
    [
      'data1',
      {
        rows: [
          { action: 'login', amount: 4 },
          { action: 'login', amount: 6 },
          { action: 'edit', amount: 2 },
        ],
        categories: ['action'],
        metrics: ['amount'],
        scope: 'Retrieved page only',
      },
    ],
  ]);
  const request = {
    datasetId: 'data1',
    type: 'bar',
    title: 'Actions',
    category: 'action',
    metric: 'amount',
    aggregate: 'sum',
  };
  it('computes numbers from server data and preserves scope', () => {
    expect(buildAssistantChart(request, datasets)).toMatchObject({
      data: [
        { name: 'edit', value: 2 },
        { name: 'login', value: 10 },
      ],
      scope: 'Retrieved page only',
    });
    expect(
      buildAssistantChart({ ...request, aggregate: 'count' }, datasets).data,
    ).toEqual([
      { name: 'edit', value: 1 },
      { name: 'login', value: 2 },
    ]);
  });
  it('requires summing preaggregated event counts instead of counting summary rows', () => {
    const summary = new Map<string, ChartDataset>([
      [
        'summary',
        {
          rows: [{ name: 'System Admin', count: 5 }],
          categories: ['name'],
          metrics: ['count'],
          scope: 'All matching records',
        },
      ],
    ]);
    const query = {
      datasetId: 'summary',
      type: 'bar',
      title: 'Badges',
      category: 'name',
      metric: 'count',
      aggregate: 'count',
    };
    expect(() => buildAssistantChart(query, summary)).toThrow(
      'aggregated dataset',
    );
    expect(
      buildAssistantChart({ ...query, aggregate: 'sum' }, summary).data,
    ).toEqual([{ name: 'System Admin', value: 5 }]);
  });
  it('preserves each customer percentage without combining customers with the same name', () => {
    const progress = new Map<string, ChartDataset>([
      [
        'customers',
        {
          rows: [
            { name: 'Jordan', progressPercent: 12 },
            { name: 'Jordan', progressPercent: 87.9 },
            { name: 'No target', progressPercent: null },
          ],
          categories: ['name'],
          metrics: ['progressPercent'],
          scope: 'All 2 matching customers',
        },
      ],
    ]);
    const query = {
      datasetId: 'customers',
      type: 'bar',
      title: 'Savings progress',
      category: 'name',
      metric: 'progressPercent',
      aggregate: 'value',
    };
    expect(buildAssistantChart(query, progress).data).toEqual([
      { name: 'Jordan', value: 12 },
      { name: 'Jordan', value: 87.9 },
      { name: 'No target', value: null },
    ]);
    expect(() =>
      buildAssistantChart({ ...query, aggregate: 'sum' }, progress),
    ).toThrow('summing them would be misleading');
  });
  it('rejects invented datasets, fields, numeric data and executable chart options', () => {
    for (const extra of [
      { datasetId: 'invented' },
      { metric: 'secret' },
      { category: 'secret' },
      { data: [{ value: 999 }] },
      { formatter: 'javascript' },
    ])
      expect(() =>
        buildAssistantChart({ ...request, ...extra }, datasets),
      ).toThrow();
  });
});
