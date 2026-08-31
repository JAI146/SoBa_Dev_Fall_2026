import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { ReflectionThemeMatch } from './reflection-theme-match.entity';

@Entity('reflection_themes')
export class ReflectionTheme {
  @PrimaryColumn({ type: 'varchar', length: 80 })
  key!: string;

  @Column({ type: 'varchar', length: 100 })
  label!: string;

  @Column({ name: 'color_token', type: 'varchar', length: 40 })
  colorToken!: string;

  @Column({ name: 'match_keywords', type: 'text', array: true })
  matchKeywords!: string[];

  @Column({ name: 'encouragement_line', type: 'varchar', length: 255 })
  encouragementLine!: string;

  @Column({ name: 'sort_order', type: 'int' })
  sortOrder!: number;

  @OneToMany(() => ReflectionThemeMatch, (match) => match.theme)
  matches?: ReflectionThemeMatch[];
}
