import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CommunityChallenge } from './community-challenge.entity';
import { User } from './user.entity';

@Entity('challenge_participations')
@Index(['userId', 'challengeId'], { unique: true })
export class ChallengeParticipation {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
  @Column({ name: 'challenge_id', type: 'uuid' }) challengeId!: string;
  @ManyToOne(() => CommunityChallenge, (challenge) => challenge.participations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'challenge_id' })
  challenge?: CommunityChallenge;
  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' })
  joinedAt!: Date;
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;
}
