import { join } from 'path';
import { DataSource, QueryResult } from 'typeorm';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { AuditService } from '../audit/audit.service';
import { SubscriptionManagementService } from './subscription-management.service';

class MetadataSource extends DataSource {
  async prepare() {
    await this.buildMetadatas();
  }
}

describe('subscription PostgreSQL query generation', () => {
  it('builds enrollment, scheduled-change, and paginated list queries without a metadata error', async () => {
    // Real PostgreSQL metadata/query builder; only database execution is replaced.
    const source = new MetadataSource({
      type: 'postgres',
      entities: [join(__dirname, '../entities/*.entity.ts')],
    });
    await source.prepare();
    const runner = source.createQueryRunner();
    const statements: string[] = [];
    jest
      .spyOn(runner, 'query')
      .mockImplementation(
        (sql: string, _parameters?: unknown[], structured?: boolean) => {
          statements.push(sql);
          const result = new QueryResult();
          result.records = [];
          result.raw = [];
          result.affected = 0;
          return Promise.resolve(structured ? result : []);
        },
      );
    jest.spyOn(runner, 'release').mockResolvedValue(undefined);
    jest.spyOn(source, 'createQueryRunner').mockReturnValue(runner);
    const service = new SubscriptionManagementService(
      source.getRepository(SubscriptionPlan),
      { recordTransactional: jest.fn() } as unknown as AuditService,
    );
    await expect(
      service.listSubscriptions({ page: 1, pageSize: 20 }),
    ).resolves.toMatchObject({ items: [], total: 0 });
    expect(statements.some((sql) => sql.includes('user_created_at'))).toBe(
      true,
    );
    expect(statements.some((sql) => sql.includes('s_renewal_at'))).toBe(true);
    expect(
      statements.some((sql) => sql.includes('subscription_started_at')),
    ).toBe(true);
  });
});
