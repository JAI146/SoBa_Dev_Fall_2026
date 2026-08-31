import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ReflectionTheme } from './reflection-theme.entity';
import { Reflection } from './reflection.entity';

@Entity('reflection_theme_matches')
export class ReflectionThemeMatch {
  @PrimaryColumn({ name: 'reflection_id', type: 'uuid' }) reflectionId!: string;
  @ManyToOne(() => Reflection, (reflection) => reflection.themeMatches, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reflection_id' })
  reflection?: Reflection;
  @PrimaryColumn({ name: 'theme_key', type: 'varchar', length: 80 })
  themeKey!: string;
  @ManyToOne(() => ReflectionTheme, (theme) => theme.matches, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'theme_key' })
  theme?: ReflectionTheme;
}
