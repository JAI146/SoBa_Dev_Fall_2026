import {
  ReflectionKind,
  type ReflectionKindValue,
} from '@purposemint/contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ReflectionThemeMatch } from './reflection-theme-match.entity';
import { User } from './user.entity';

@Entity('reflections')
@Index(['userId', 'reflectedOn'])
export class Reflection {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
  @Column({ type: 'enum', enum: Object.values(ReflectionKind) })
  kind!: ReflectionKindValue;
  @Column({ type: 'text', nullable: true }) body!: string | null;
  @Column({ name: 'mood_score', type: 'smallint', nullable: true }) moodScore!:
    number | null;
  @Column({ name: 'duration_seconds', type: 'int', nullable: true })
  durationSeconds!: number | null;
  @Column({ name: 'reflected_on', type: 'date' }) reflectedOn!: string;
  @OneToMany(() => ReflectionThemeMatch, (match) => match.reflection)
  themeMatches?: ReflectionThemeMatch[];
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
