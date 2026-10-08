import {
  adminPlanInputSchema,
  planEntitlementsSchema,
} from '@purposemint/contracts';
import { planInput, planEntity } from './subscription-fixtures';
import {
  captureTerms,
  changeAction,
  nextRenewal,
  planAvailable,
} from './subscription-policy';

describe('subscription configuration and billing policy', () => {
  const at = new Date('2026-10-01T12:00:00Z');
  it('accepts an arbitrary new pricing tier without an enum change', () => {
    expect(
      adminPlanInputSchema.parse(
        planInput({ key: 'foundation_plus', name: 'Foundation Plus' }),
      ).key,
    ).toBe('foundation_plus');
  });
  it('rejects unsupported entitlements instead of granting arbitrary capabilities', () => {
    expect(
      planEntitlementsSchema.safeParse({
        pathways: true,
        communityChallenges: false,
        bankTransfers: true,
      }).success,
    ).toBe(false);
  });
  it.each([-1, 1.005, Infinity, 1000000])(
    'rejects invalid prices: %s',
    (priceMonthly) => {
      expect(
        adminPlanInputSchema.safeParse(planInput({ priceMonthly })).success,
      ).toBe(false);
    },
  );
  it('requires a yearly price, unique cycles, and a free always-available default', () => {
    for (const extra of [
      { priceYearly: null },
      { billingCycles: ['monthly', 'monthly'] as const },
      { isDefault: true },
      { availableFrom: at.toISOString(), availableUntil: at.toISOString() },
    ]) {
      expect(
        adminPlanInputSchema.safeParse({ ...planInput(), ...extra }).success,
      ).toBe(false);
    }
    expect(
      adminPlanInputSchema.safeParse(
        planInput({
          isDefault: true,
          priceMonthly: 0,
          limits: { pathwayApplications: null, challengeParticipations: null },
        }),
      ).success,
    ).toBe(true);
  });
  it('rejects limits for disabled features and promotions on unsupported cycles', () => {
    expect(
      adminPlanInputSchema.safeParse(
        planInput({
          limits: { pathwayApplications: 1, challengeParticipations: null },
        }),
      ).success,
    ).toBe(false);
    expect(
      adminPlanInputSchema.safeParse(
        planInput({
          billingCycles: ['monthly'],
          promotion: {
            monthlyPrice: null,
            yearlyPrice: 50,
            startsAt: at.toISOString(),
            endsAt: '2026-11-01T12:00:00Z',
          },
        }),
      ).success,
    ).toBe(false);
  });
  it('captures cents and retains original regular prices independently of later catalog edits', () => {
    const plan = planEntity({
      priceMonthly: 9.99,
      promotion: {
        monthlyPrice: 4.99,
        yearlyPrice: null,
        startsAt: at.toISOString(),
        endsAt: '2026-10-31T12:00:00Z',
      },
    });
    const terms = captureTerms(plan, 'monthly', at);
    plan.priceMonthly = 99;
    expect(terms).toMatchObject({
      planKey: 'foundation',
      amountCents: 499,
      regularAmountCents: 999,
      promotionEndsAt: '2026-10-31T12:00:00Z',
    });
    expect(
      captureTerms(plan, 'monthly', new Date('2026-11-01T12:00:00Z'))
        .amountCents,
    ).toBe(9900);
  });
  it('checks active state, availability windows, and the chosen billing cycle', () => {
    expect(planAvailable(planEntity({ active: false }), at)).toBe(false);
    expect(
      planAvailable(planEntity({ availableUntil: at.toISOString() }), at),
    ).toBe(false);
    expect(() =>
      captureTerms(planEntity({ available: false }), 'monthly', at),
    ).toThrow();
    expect(() =>
      captureTerms(planEntity({ billingCycles: ['yearly'] }), 'monthly', at),
    ).toThrow();
  });
  it('clamps monthly and yearly calendar boundaries', () => {
    expect(
      nextRenewal(new Date('2027-01-31T18:20:00Z'), 'monthly').toISOString(),
    ).toBe('2027-02-28T18:20:00.000Z');
    expect(
      nextRenewal(new Date('2028-02-29T18:20:00Z'), 'yearly').toISOString(),
    ).toBe('2029-02-28T18:20:00.000Z');
  });
  it('records plan/cycle actions without depending on plan names or display order', () => {
    const previous = captureTerms(planEntity(), 'monthly', at);
    expect(
      changeAction(
        previous,
        captureTerms(
          planEntity({ key: 'higher', priceMonthly: 20 }),
          'monthly',
          at,
        ),
      ),
    ).toBe('upgraded');
    expect(
      changeAction(
        previous,
        captureTerms(
          planEntity({ key: 'lower', priceMonthly: 0 }),
          'monthly',
          at,
        ),
      ),
    ).toBe('downgraded');
    expect(
      changeAction(previous, captureTerms(planEntity(), 'yearly', at)),
    ).toBe('cycle_changed');
  });
});
