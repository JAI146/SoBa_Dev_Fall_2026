import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('smtp_config')
export class SmtpConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'smtp_server', type: 'varchar', length: 255 })
  smtpServer!: string;

  @Column({ name: 'smtp_port', type: 'int' })
  smtpPort!: number;

  @Column({ name: 'smtp_email_user', type: 'varchar', length: 255 })
  smtpEmailUser!: string;

  @Column({ name: 'smtp_email_password', type: 'text' })
  smtpEmailPassword!: string;

  @Column({ name: 'from_email', type: 'varchar', length: 255 })
  fromEmail!: string;

  @Column({ name: 'smtp_bcc', type: 'varchar', length: 255, nullable: true })
  smtpBcc!: string | null;

  @Column({ name: 'smtp_enabled', type: 'boolean', default: false })
  smtpEnabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
