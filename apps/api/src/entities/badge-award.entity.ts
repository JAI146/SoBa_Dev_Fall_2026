import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { BadgeDefinition } from './badge-definition.entity';
import { User } from './user.entity';

@Entity('badge_awards')
@Index('uq_badge_awards_badge_user', ['badgeId', 'userId'], { unique: true })
@Index('idx_badge_awards_user_id', ['userId'])
export class BadgeAward {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'badge_id', type: 'uuid' })
  badgeId!: string;

  @ManyToOne(() => BadgeDefinition, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'badge_id' })
  badge?: BadgeDefinition;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @CreateDateColumn({ name: 'unlocked_at', type: 'timestamptz' })
  unlockedAt!: Date;
}
