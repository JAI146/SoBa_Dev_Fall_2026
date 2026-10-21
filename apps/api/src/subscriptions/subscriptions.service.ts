import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  CreateUpgradeIntentInput,
  SubscriptionPlanPublic,
  SubscriptionPlansResponse,
  UpgradeIntentResponse,
} from '@purposemint/contracts';
import { QueryFailedError, Repository } from 'typeorm';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { UpgradeIntent } from '../entities/upgrade-intent.entity';
import { User } from '../entities/user.entity';
import { SubscriptionManagementService } from '../subscription-management/subscription-management.service';
import { planAvailable } from '../subscription-management/subscription-policy';

const UPGRADE_ACKNOWLEDGEMENT = (planName: string) =>
  `We saved your interest in ${planName}. An administrator can help you change your subscription. Your current subscription has not changed.`;

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly plans: Repository<SubscriptionPlan>,
    @InjectRepository(UpgradeIntent)
    private readonly intents: Repository<UpgradeIntent>,
    private readonly management: SubscriptionManagementService,
  ) {}

  async list(userId: string): Promise<SubscriptionPlansResponse> {
    const [access, plans] = await Promise.all([
      this.management.access(userId),
      this.plans.find({ order: { sortOrder: 'ASC' } }),
    ]);
    return {
      currentPlanKey: access.planKey,
      currentSubscription: access,
      plans: plans.filter((plan) => planAvailable(plan)).map(toPublicPlan),
    };
  }

  async recordUpgradeIntent(
    userId: string,
    input: CreateUpgradeIntentInput,
  ): Promise<UpgradeIntentResponse> {
    try {
      const result = await this.intents.manager.transaction(async (manager) => {
        const user = await manager.findOne(User, {
          where: { id: userId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!user) throw new NotFoundException('User not found.');

        const access = await this.management.access(userId, manager);
        const [selectedPlan, currentPlan] = await Promise.all([
          manager.findOneBy(SubscriptionPlan, { key: input.planKey }),
          manager.findOneBy(SubscriptionPlan, { key: access.planKey }),
        ]);
        if (!selectedPlan) {
          throw new NotFoundException("We couldn't find that membership plan.");
        }
        if (!currentPlan) {
          throw new NotFoundException(
            "We couldn't find your current membership plan.",
          );
        }
        if (!planAvailable(selectedPlan))
          throw new BadRequestException(
            'This plan is not currently available.',
          );
        if (
          selectedPlan.key === currentPlan.key ||
          (selectedPlan.billingCycles.includes('monthly')
            ? selectedPlan.priceMonthly
            : (selectedPlan.priceYearly ?? 0) / 12) <=
            access.billing.regularAmountCents /
              100 /
              (access.billing.cycle === 'yearly' ? 12 : 1)
        ) {
          throw new BadRequestException(
            'Choose a plan above your current membership.',
          );
        }

        const existing = await manager.findOneBy(UpgradeIntent, {
          userId,
          planKey: input.planKey,
        });
        if (existing) return { plan: selectedPlan, alreadyRecorded: true };

        await manager.save(
          manager.create(UpgradeIntent, {
            userId,
            planKey: input.planKey,
          }),
        );
        return { plan: selectedPlan, alreadyRecorded: false };
      });
      return this.toUpgradeResponse(result.plan, result.alreadyRecorded);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const plan = await this.plans.findOneBy({ key: input.planKey });
      if (!plan) {
        throw new NotFoundException("We couldn't find that membership plan.");
      }
      return this.toUpgradeResponse(plan, true);
    }
  }

  private toUpgradeResponse(
    plan: SubscriptionPlan,
    alreadyRecorded: boolean,
  ): UpgradeIntentResponse {
    return {
      planKey: plan.key,
      planName: plan.name,
      alreadyRecorded,
      message: UPGRADE_ACKNOWLEDGEMENT(plan.name),
    };
  }
}

function toPublicPlan(plan: SubscriptionPlan): SubscriptionPlanPublic {
  return {
    key: plan.key,
    name: plan.name,
    tagline: plan.tagline,
    priceMonthly: plan.priceMonthly,
    priceYearly: plan.priceYearly,
    billingCycles: plan.billingCycles,
    promotion: plan.promotion,
    badge: plan.badge,
    description: plan.description,
    features: plan.features,
    ctaLabel: plan.ctaLabel,
    sortOrder: plan.sortOrder,
  };
}

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError: unknown = error.driverError;
  return Boolean(
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === '23505',
  );
}
