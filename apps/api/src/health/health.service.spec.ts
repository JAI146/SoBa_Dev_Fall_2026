import { ServiceUnavailableException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { HealthService } from './health.service';

function dataSourceWith(query: jest.Mock): DataSource {
  return { query } as unknown as DataSource;
}

describe('HealthService', () => {
  it('reports ok when the database answers', async () => {
    const service = new HealthService(
      dataSourceWith(jest.fn().mockResolvedValue([{ '?column?': 1 }])),
    );
    await expect(service.check()).resolves.toEqual({
      status: 'ok',
      message: 'The API is up and the database answered.',
    });
  });

  it('reports unavailable when the database does not answer', async () => {
    const service = new HealthService(
      dataSourceWith(jest.fn().mockRejectedValue(new Error('offline'))),
    );
    await expect(service.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
