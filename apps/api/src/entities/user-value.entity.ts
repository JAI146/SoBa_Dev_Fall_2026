import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Value } from './value.entity';

@Entity('user_values')
@Index('uq_user_values_user_value', ['userId', 'valueId'], { unique: true })
export class UserValue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_user_values_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'value_id', type: 'uuid' })
  valueId!: string;

  @ManyToOne(() => Value, (value) => value.userValues, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'value_id' })
  value?: Value;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
