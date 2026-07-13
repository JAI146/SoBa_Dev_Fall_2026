import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('s3_config')
export class S3Config {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'access_key_id', type: 'varchar', length: 255 })
  accessKeyId!: string;

  @Column({ name: 'secret_access_key', type: 'text' })
  secretAccessKey!: string;

  @Column({ type: 'varchar', length: 100 })
  region!: string;

  @Column({ type: 'varchar', length: 255 })
  bucket!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
