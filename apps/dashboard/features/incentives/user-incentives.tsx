"use client";

/**
 * Loads a customer’s latest benefits independently of the main profile request.
 * Styled cards link to each benefit, with a separate action to view all customer benefits.
 */
import Link from "next/link";
import { incentiveBenefitsSchema } from "@purposemint/contracts";
import { useAdminQuery } from "@/lib/use-admin-query";
import { money, label } from "./shared";
import base from "@/app/dashboard/dashboard.module.css";
import styles from "./incentives.module.css";

export function UserIncentives({ userId }: { userId: string }) {
  const query = useAdminQuery(
    `/admin/incentives/benefits?userId=${encodeURIComponent(userId)}&pageSize=5`,
    incentiveBenefitsSchema,
  );
  return (
    <section className={`${base.panel} ${styles.stack}`}>
      <div className={styles.heading}>
        <h2>Incentives &amp; Benefits</h2>
        <Link
          className={styles.outlineButton}
          href={`/dashboard/incentives?userId=${encodeURIComponent(userId)}`}
        >
          View all benefits
        </Link>
      </div>
      {query.error ? (
        <p role="alert">
          {query.error}{" "}
          <button onClick={() => void query.reload()}>Retry</button>
        </p>
      ) : query.loading ? (
        <p>Loading benefits…</p>
      ) : (
        <>
          {query.data?.items.length ? (
            <ul className={styles.benefitList}>
              {query.data.items.map((benefit) => (
                <li key={benefit.id}>
                  <Link
                    className={styles.benefitLink}
                    href={`/dashboard/incentives/${benefit.id}`}
                  >
                    <div className={styles.stackSmall}>
                      <strong>{benefit.programName}</strong>
                      <span className={styles.status}>
                        {label(benefit.status)}
                      </span>
                    </div>
                    <div className={styles.benefitAmount}>
                      <strong>{money(benefit.remainingCents)}</strong>
                      <span>Remaining</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>No eligibility reviews or benefits recorded.</p>
          )}
        </>
      )}
    </section>
  );
}
