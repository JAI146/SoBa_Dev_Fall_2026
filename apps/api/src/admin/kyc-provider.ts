import { randomUUID } from 'node:crypto';

export interface KycRetryResult {
  providerReference: string;
}

/**
 * Boundary between PurposeMint and an identity-verification vendor.
 * A real provider (for example Synctera) implements this interface and
 * feeds status changes back through a webhook into `kyc_verifications`.
 */
export interface KycProvider {
  readonly name: string;
  retryVerification(userId: string): Promise<KycRetryResult>;
}

/** Stand-in used until a real provider is connected; no external call is made. */
export class ManualKycProvider implements KycProvider {
  readonly name = 'manual';

  retryVerification(): Promise<KycRetryResult> {
    return Promise.resolve({ providerReference: `manual_${randomUUID()}` });
  }
}
