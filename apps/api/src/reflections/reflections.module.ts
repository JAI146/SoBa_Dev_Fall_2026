import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReflectionThemeMatch } from '../entities/reflection-theme-match.entity';
import { ReflectionTheme } from '../entities/reflection-theme.entity';
import { Reflection } from '../entities/reflection.entity';
import { ReflectionsController } from './reflections.controller';
import { ReflectionsService } from './reflections.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reflection,
      ReflectionTheme,
      ReflectionThemeMatch,
    ]),
  ],
  controllers: [ReflectionsController],
  providers: [ReflectionsService],
  exports: [ReflectionsService],
})
export class ReflectionsModule {}
