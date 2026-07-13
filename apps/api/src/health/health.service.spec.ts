import { ServiceUnavailableException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('reports a healthy database query', async () => {
    const repository = {
      count: jest.fn().mockResolvedValue(1),
    } as unknown as Repository<User>;
    await expect(new HealthService(repository).check()).resolves.toEqual({
      status: 'ok',
      message:
        'Successfully queried the users table. Backend and database are running.',
    });
  });

  it('reports an unavailable database', async () => {
    const repository = {
      count: jest.fn().mockRejectedValue(new Error('offline')),
    } as unknown as Repository<User>;
    await expect(new HealthService(repository).check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
