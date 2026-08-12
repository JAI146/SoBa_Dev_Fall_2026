import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async check() {
    try {
      // A bare round-trip, so health does not depend on any table's shape.
      await this.dataSource.query('SELECT 1');
      return {
        status: 'ok',
        message: 'The API is up and the database answered.',
      };
    } catch {
      throw new ServiceUnavailableException(
        'The API is up but the database did not answer.',
      );
    }
  }
}
