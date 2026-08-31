import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChallengeParticipation } from './challenge-participation.entity';

@Entity('community_challenges')
@Index(['key'], { unique: true })
@Index(['activeMonth', 'isActive'])
export class CommunityChallenge {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 120 }) key!: string;
  @Column({ type: 'varchar', length: 160 }) title!: string;
  @Column({ type: 'varchar', length: 500 }) description!: string;
  @Column({ name: 'active_month', type: 'date' }) activeMonth!: string;
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
  @Column({ name: 'sort_order', type: 'int' }) sortOrder!: number;
  @OneToMany(() => ChallengeParticipation, (row) => row.challenge)
  participations?: ChallengeParticipation[];
}
