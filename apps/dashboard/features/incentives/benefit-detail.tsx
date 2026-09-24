"use client";

/**
 * Loads one benefit’s balances, eligibility snapshot, allocations, and event history.
 * Displays review notes and criteria in panels and connects the event form to refreshes.
 */
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  incentiveDetailSchema,
  incentiveProgramsSchema,
} from "@purposemint/contracts";
import { useAdminQuery } from "@/lib/use-admin-query";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import base from "@/app/dashboard/dashboard.module.css";
import styles from "./incentives.module.css";
import { dateTime, money, label } from "./shared";
import { EventForm } from "./event-form";
export function BenefitDetail() {
  const { id } = useParams<{ id: string }>();
  const query = useAdminQuery(
    `/admin/incentives/benefits/${id}`,
    incentiveDetailSchema,
  );
  const programs = useAdminQuery(
    "/admin/incentives/programs",
    incentiveProgramsSchema,
  );
  if (query.error)
    return (
      <DashboardError
        message={query.error}
        onRetry={() => void query.reload()}
      />
    );
  if (query.loading || !query.data)
    return <DashboardLoading label="Loading benefit history…" />;
  const data = query.data,
    benefit = data.benefit;
  const program = programs.data?.find((p) => p.id === benefit.programId);
  return (
    <main className={`${base["dashboard-page"]} ${styles.stack}`}>
      <Link className={base["back-link"]} href="/dashboard/incentives">
        ← Incentives &amp; Benefits
      </Link>
      <div className={base["page-header"]}>
        <div>
          <p className={base.eyebrow}>{benefit.programName}</p>
          <h1>{benefit.userName}</h1>
          <p>
            {benefit.email} ·{" "}
            <Link href={`/dashboard/users/${benefit.userId}`}>
              View customer
            </Link>
          </p>
        </div>
        <span className={styles.status}>{label(benefit.status)}</span>
      </div>
      <section className={styles.metrics}>
        <DashboardStatCard label="Earned" value={money(benefit.earnedCents)} />
        <DashboardStatCard
          label="Received"
          value={money(benefit.distributedCents)}
        />
        <DashboardStatCard
          label="Applied to goals"
          value={money(benefit.allocatedCents)}
        />
        <DashboardStatCard
          label="Withdrawn"
          value={
            benefit.withdrawalStatus === "recorded"
              ? money(benefit.withdrawnCents)
              : "Not confirmed"
          }
        />
        <DashboardStatCard
          label="Remaining"
          value={money(benefit.remainingCents)}
        />
        <DashboardStatCard
          label="Unallocated"
          value={money(benefit.unallocatedCents)}
        />
      </section>
      <section className={base.panel}>
        <h2>Eligibility and receipt</h2>
        <dl className={base["record-grid"]}>
          <div>
            <dt>Decision</dt>
            <dd>{benefit.eligible ? "Eligible" : "Not eligible"}</dd>
          </div>
          <div>
            <dt>First review</dt>
            <dd>{dateTime(benefit.reviewedAt)}</dd>
          </div>
          <div>
            <dt>Earned</dt>
            <dd>{dateTime(benefit.earnedAt)}</dd>
          </div>
          <div>
            <dt>First received</dt>
            <dd>{dateTime(benefit.receivedAt)}</dd>
          </div>
          <div>
            <dt>Previously received this benefit</dt>
            <dd>{benefit.hasReceived ? "Yes" : "Not yet"}</dd>
          </div>
          <div>
            <dt>Award amount at review</dt>
            <dd>{money(benefit.amountCents)}</dd>
          </div>
        </dl>
        <div className={styles.reviewCards}>
          <section className={styles.reviewCard}>
            <h3>Review notes</h3>
            <p>{benefit.eligibilityReason || "No notes added."}</p>
          </section>
          <section className={styles.reviewCard}>
            <div className={styles.heading}>
              <h3>Eligibility criteria</h3>
              <span className={styles.status}>
                Version {benefit.programVersion}
              </span>
            </div>
            <p>{benefit.ruleSnapshot}</p>
          </section>
        </div>
      </section>
      <section className={base.panel}>
        <h2>Current allocations</h2>
        {data.allocations.length ? (
          <ul>
            {data.allocations.map((a) => (
              <li key={`${a.goalId}:${a.category}`}>
                {data.goals.find((g) => g.id === a.goalId)?.title ??
                  data.events.find((e) => e.goalId === a.goalId)?.goalTitle ??
                  "Historical goal"}{" "}
                · {label(a.category)} · {money(a.amountCents)}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.muted}>No current goal allocation.</p>
        )}
      </section>
      {program ? (
        <EventForm data={data} program={program} reload={query.reload} />
      ) : programs.error ? (
        <p role="alert" className={styles.error}>
          {programs.error}
        </p>
      ) : (
        <p>Loading program settings…</p>
      )}
      <section className={base.panel}>
        <h2>Benefit history</h2>
        <ol className={styles.timeline}>
          {[...data.events].reverse().map((e) => (
            <li key={e.id}>
              <strong>
                {label(e.kind)}{" "}
                {e.amountCents ? `· ${money(e.amountCents)}` : ""}
              </strong>
              <p>{e.reason}</p>
              {e.goalTitle ? (
                <p>
                  {e.goalTitle} · {label(e.category ?? "other")}
                </p>
              ) : null}
              <small>
                Occurred: {dateTime(e.occurredAt)} · Recorded:{" "}
                {dateTime(e.recordedAt)}
              </small>
              <small>Source: staff recorded · Reference: {e.reference}</small>
              <small>Recorded by: {e.actorUserId}</small>
              {e.reversesEventId ? (
                <small>Reverses event: {e.reversesEventId}</small>
              ) : null}
              {data.events.some((r) => r.reversesEventId === e.id) ? (
                <span className={styles.status}>
                  Reversed — original retained
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
