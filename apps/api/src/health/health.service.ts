import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class HealthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async check() {
    try {
      await this.userRepo.count();
      return {
        status: 'ok',
        message:
          'Successfully queried the users table. Backend and database are running.',
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        message:
          'Failed to query the users table. Backend or database may be down.',
      });
    }
  }
}
