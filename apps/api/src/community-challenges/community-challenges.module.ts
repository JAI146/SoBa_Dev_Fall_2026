import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChallengeParticipation } from '../entities/challenge-participation.entity';
import { CommunityChallenge } from '../entities/community-challenge.entity';
import { CommunityChallengesController } from './community-challenges.controller';
import { CommunityChallengesService } from './community-challenges.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CommunityChallenge, ChallengeParticipation]),
  ],
  controllers: [CommunityChallengesController],
  providers: [CommunityChallengesService],
  exports: [CommunityChallengesService],
})
export class CommunityChallengesModule {}
