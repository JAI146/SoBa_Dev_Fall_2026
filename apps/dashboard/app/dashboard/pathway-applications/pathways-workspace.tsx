"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  pathwayManagementResponseSchema,
  type ManagedApplication,
  type PartnerCatalog,
  type PathwayCatalog,
} from "@purposemint/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Dialog } from "@/components/common/dialog";
import { EditIcon, EyeIcon } from "@/components/common/table-action-icons";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import { formatAdminDateTime, formatMoney } from "@/lib/admin-format";
import { useAdminQuery } from "@/lib/use-admin-query";
import { ManagementTable } from "./management-table";
import { PartnerForm, PathwayForm } from "./catalog-form";
import styles from "./management.module.css";

const emptyPathways: PathwayCatalog[] = [];
const emptyPartners: PartnerCatalog[] = [];
const emptyApplications: ManagedApplication[] = [];
const tabs = [
  "Applications",
  "Pathways",
  "Partners",
  "Intake & readiness",
  "Unavailable",
] as const;
type Tab = (typeof tabs)[number];
const unavailable = [
  [
    "Live partner availability",
    "No partner capacity, appointment, vacancy, or waitlist data.",
  ],
  [
    "Referrals",
    "Partner selections exist, but no referral delivery or acknowledgement records.",
  ],
  ["Connections", "No partner contact or confirmed connection records."],
  [
    "Partner application outcomes",
    "No partner acceptance or processing outcomes.",
  ],
  [
    "Real-world completion",
    "Readiness checklists do not verify housing, employment, enrollment, or other external outcomes.",
  ],
  ["Failures", "No partner failure decisions, reasons, or outcome history."],
  [
    "Verified financial eligibility",
    "Savings are self-attested; no bank verification.",
  ],
] as const;
const unavailableData = unavailable.map(([name, reason]) => ({
  name,
  reason,
  status: "Unable to implement with current data",
}));
const unavailableColumns: ColumnDef<(typeof unavailableData)[number]>[] = [
  { accessorKey: "name", header: "Feature" },
  { accessorKey: "status", header: "Status" },
  { accessorKey: "reason", header: "Missing data" },
];
function Status({ active }: { active: boolean }) {
  return (
    <span className={`${styles.status} ${!active ? styles.mutedStatus : ""}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}
function Applicant({ app }: { app: ManagedApplication }) {
  return (
    <Link href={`/dashboard/pathway-applications/${app.id}`}>
      {app.applicant.name}
      <small>{app.applicant.email}</small>
    </Link>
  );
}
function Checklist({ app }: { app: ManagedApplication }) {
  return (
    <>
      {app.checklistProgress.completed} / {app.checklistProgress.total}
      {app.checklistProgress.total > 0 && (
        <progress
          aria-label={`${app.applicant.name} readiness`}
          max={app.checklistProgress.total}
          value={app.checklistProgress.completed}
        />
      )}
      <small>
        {app.checklistReady
          ? "Ready"
          : app.status === "draft"
            ? "Not submitted"
            : "In progress"}
      </small>
    </>
  );
}
const applicantColumn: ColumnDef<ManagedApplication> = {
  id: "applicant",
  accessorFn: (app) => `${app.applicant.name} ${app.applicant.email}`,
  header: "Applicant",
  cell: ({ row }) => <Applicant app={row.original} />,
};
const appPathwayColumn: ColumnDef<ManagedApplication> = {
  id: "pathway",
  accessorFn: (app) => app.pathway.title,
  header: "Pathway",
};
const checklistColumn: ColumnDef<ManagedApplication> = {
  id: "readiness",
  accessorFn: (app) =>
    app.checklistProgress.total
      ? app.checklistProgress.completed / app.checklistProgress.total
      : 0,
  header: "Readiness",
  cell: ({ row }) => <Checklist app={row.original} />,
};
const reviewColumn: ColumnDef<ManagedApplication> = {
  id: "review",
  header: "Review",
  enableSorting: false,
  cell: ({ row }) => (
    <Link
      aria-label={`Review ${row.original.applicant.name} application`}
      title="Review application"
      className={styles.iconButton}
      href={`/dashboard/pathway-applications/${row.original.id}`}
    >
      <EyeIcon />
    </Link>
  ),
};
const applicationColumns: ColumnDef<ManagedApplication>[] = [
  applicantColumn,
  appPathwayColumn,
  {
    accessorKey: "attestedAmount",
    header: "Self-attested savings",
    cell: ({ row }) => (
      <>
        {formatMoney(row.original.attestedAmount)}
        <small>Minimum {formatMoney(row.original.pathway.minimumAmount)}</small>
      </>
    ),
  },
  {
    id: "partners",
    accessorFn: (app) =>
      app.selectedPartners.map((partner) => partner.name).join(", "),
    header: "Selected partners",
    cell: ({ getValue }) => getValue<string>() || "None selected",
  },
  checklistColumn,
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) =>
      getValue<string>() === "submitted" ? "Submitted" : "Draft",
  },
  {
    accessorKey: "submittedAt",
    header: "Submitted",
    cell: ({ row }) =>
      formatAdminDateTime(
        row.original.submittedAt,
        row.original.applicant.timeZone,
      ),
  },
  reviewColumn,
];
const intakeColumns: ColumnDef<ManagedApplication>[] = [
  applicantColumn,
  appPathwayColumn,
  {
    accessorKey: "membershipEligible",
    header: "Membership",
    cell: ({ row }) => (
      <>
        {row.original.membershipEligible ? "Elevation" : "Not Elevation"}
        <small>Current membership</small>
      </>
    ),
  },
  {
    accessorKey: "savingsEligible",
    header: "Savings minimum",
    cell: ({ row }) => (
      <>
        {row.original.attestedAmount === null
          ? "Not provided"
          : row.original.savingsEligible
            ? "Met"
            : "Not met"}
        <small>
          {formatMoney(row.original.attestedAmount)} /{" "}
          {formatMoney(row.original.pathway.minimumAmount)}
        </small>
      </>
    ),
  },
  {
    accessorKey: "attestationAccepted",
    header: "Attestation",
    cell: ({ getValue }) => (getValue<boolean>() ? "Accepted" : "Pending"),
  },
  checklistColumn,
  {
    accessorKey: "checklistReadyAt",
    header: "Checklist finished",
    cell: ({ row }) =>
      formatAdminDateTime(
        row.original.checklistReadyAt,
        row.original.applicant.timeZone,
      ),
  },
  reviewColumn,
];

export default function PathwayApplicationsPage() {
  const query = useAdminQuery(
    "/admin/pathway-management",
    pathwayManagementResponseSchema,
  );
  const [tab, setTab] = useState<Tab>("Applications");
  const [pathwayKey, setPathwayKey] = useState("");
  const [status, setStatus] = useState("");
  const [catalogStatus, setCatalogStatus] = useState("");
  const [readiness, setReadiness] = useState("");
  const [editingPathway, setEditingPathway] = useState<PathwayCatalog | null>(
    null,
  );
  const [editingPartner, setEditingPartner] = useState<
    PartnerCatalog | "new" | null
  >(null);
  const pathways = query.data?.pathways ?? emptyPathways;
  const partners = query.data?.partners ?? emptyPartners;
  const applications = query.data?.applications ?? emptyApplications;
  const canManage = query.data?.canManage ?? false;
  const filteredApps = useMemo(
    () =>
      applications.filter(
        (app) =>
          (!pathwayKey || app.pathway.key === pathwayKey) &&
          (!status || app.status === status) &&
          (tab !== "Intake & readiness" ||
            !readiness ||
            (readiness === "ready" ? app.checklistReady : !app.checklistReady)),
      ),
    [applications, pathwayKey, status, readiness, tab],
  );
  const filteredPathways = useMemo(
    () =>
      pathways.filter(
        (pathway) =>
          (!pathwayKey || pathway.key === pathwayKey) &&
          (!catalogStatus || pathway.isActive === (catalogStatus === "active")),
      ),
    [pathways, pathwayKey, catalogStatus],
  );
  const filteredPartners = useMemo(
    () =>
      partners.filter(
        (partner) =>
          (!pathwayKey || partner.pathwayKey === pathwayKey) &&
          (!catalogStatus || partner.isActive === (catalogStatus === "active")),
      ),
    [partners, pathwayKey, catalogStatus],
  );
  const chartData = useMemo(
    () =>
      pathways.map((pathway) => ({
        name: pathway.title.replace(" Pathway", ""),
        Draft: applications.filter(
          (app) => app.pathway.key === pathway.key && app.status === "draft",
        ).length,
        Submitted: applications.filter(
          (app) =>
            app.pathway.key === pathway.key && app.status === "submitted",
        ).length,
      })),
    [pathways, applications],
  );
  const pathwayColumns = useMemo<ColumnDef<PathwayCatalog>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Pathway",
        cell: ({ row }) => (
          <>
            <strong>
              {row.original.iconEmoji} {row.original.title}
            </strong>
            <small>{row.original.description}</small>
          </>
        ),
      },
      {
        accessorKey: "minimumAmount",
        header: "Savings minimum",
        cell: ({ getValue }) => formatMoney(getValue<number>()),
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ getValue }) => <Status active={getValue<boolean>()} />,
      },
      {
        accessorKey: "applicationCount",
        header: "Applications",
        cell: ({ row }) => (
          <button
            type="button"
            aria-label={`View applications for ${row.original.title}`}
            onClick={() => {
              setPathwayKey(row.original.key);
              setTab("Applications");
            }}
          >
            {row.original.applicationCount}
          </button>
        ),
      },
      { accessorKey: "checklistTemplateCount", header: "Checklist items" },
      {
        id: "source",
        accessorFn: (pathway) => pathway.sourceLabel,
        header: "Source",
        cell: ({ row }) => (
          <a
            href={row.original.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {row.original.sourceLabel}
          </a>
        ),
      },
      {
        id: "edit",
        header: canManage ? "Edit" : "Details",
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            className={styles.iconButton}
            aria-label={`${canManage ? "Edit" : "View"} ${row.original.title}`}
            title={canManage ? "Edit pathway" : "View pathway"}
            onClick={() => setEditingPathway(row.original)}
          >
            {canManage ? <EditIcon /> : <EyeIcon />}
          </button>
        ),
      },
    ],
    [canManage],
  );
  const partnerColumns = useMemo<ColumnDef<PartnerCatalog>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Partner",
        cell: ({ row }) => (
          <>
            <strong>{row.original.name}</strong>
            <small>{row.original.description}</small>
          </>
        ),
      },
      { accessorKey: "partnerType", header: "Type" },
      {
        id: "pathway",
        accessorFn: (partner) =>
          pathways.find((pathway) => pathway.key === partner.pathwayKey)
            ?.title ?? partner.pathwayKey,
        header: "Pathway",
      },
      { accessorKey: "locationLabel", header: "Location" },
      {
        id: "tags",
        accessorFn: (partner) => partner.capabilityTags.join(", "),
        header: "Capabilities",
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ getValue }) => <Status active={getValue<boolean>()} />,
      },
      { accessorKey: "applicationCount", header: "Selected on applications" },
      {
        id: "availability",
        header: "Availability",
        enableSorting: false,
        cell: () => "Not recorded",
      },
      {
        id: "edit",
        header: canManage ? "Edit" : "Details",
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            className={styles.iconButton}
            aria-label={`${canManage ? "Edit" : "View"} ${row.original.name}`}
            title={canManage ? "Edit partner" : "View partner"}
            onClick={() => setEditingPartner(row.original)}
          >
            {canManage ? <EditIcon /> : <EyeIcon />}
          </button>
        ),
      },
    ],
    [canManage, pathways],
  );
  if (query.error)
    return (
      <DashboardError
        message={query.error}
        onRetry={() => void query.reload()}
      />
    );
  if (query.loading || !query.data)
    return <DashboardLoading label="Loading pathways and partners…" />;
  async function saved() {
    setEditingPathway(null);
    setEditingPartner(null);
    await query.reload();
  }
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Pathways & partners</h1>
        <button type="button" onClick={() => void query.reload()}>
          Refresh
        </button>
      </header>
      <div className={styles.stats}>
        <div>
          <span>Active pathways</span>
          <strong>
            {pathways.filter((pathway) => pathway.isActive).length}
          </strong>
        </div>
        <div>
          <span>Active partners</span>
          <strong>
            {partners.filter((partner) => partner.isActive).length}
          </strong>
        </div>
        <div>
          <span>Submitted applications</span>
          <strong>
            {applications.filter((app) => app.status === "submitted").length}
          </strong>
        </div>
        <div>
          <span>Readiness checklists finished</span>
          <strong>
            {applications.filter((app) => app.checklistReady).length}
          </strong>
        </div>
      </div>
      <section
        className={styles.chartBand}
        aria-label="Application distribution"
      >
        <h2>Applications by pathway</h2>
        {applications.length ? (
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 8, bottom: 16, left: 0 }}
              >
                <defs>
                  <linearGradient
                    id="pathway-draft-gradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#e6a4ee" />
                    <stop offset="100%" stopColor="#c875d4" />
                  </linearGradient>
                  <linearGradient
                    id="pathway-submitted-gradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#99e4c8" />
                    <stop offset="100%" stopColor="#4fbb96" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                  minTickGap={8}
                  tickFormatter={(value: string) =>
                    value.length > 12 ? `${value.slice(0, 11)}…` : value
                  }
                  height={50}
                />
                <YAxis
                  allowDecimals={false}
                  width={30}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: "#e0e8e3",
                    color: "#4b5563",
                  }}
                  cursor={{ fill: "#f0f7f3" }}
                />
                <Legend />
                <Bar
                  dataKey="Draft"
                  stackId="applications"
                  fill="url(#pathway-draft-gradient)"
                  radius={[0, 0, 5, 5]}
                />
                <Bar
                  dataKey="Submitted"
                  stackId="applications"
                  fill="url(#pathway-submitted-gradient)"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className={styles.note}>No applications recorded.</p>
        )}
      </section>
      <div
        className={styles.tabs}
        role="tablist"
        aria-label="Pathway management"
      >
        {tabs.map((name, index) => (
          <button
            key={name}
            type="button"
            role="tab"
            id={`tab-${index}`}
            aria-selected={name === tab}
            aria-controls="management-panel"
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <section
        id="management-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tabs.indexOf(tab)}`}
      >
        <div className={styles.sectionHeading}>
          <h2>{tab === "Unavailable" ? "Unavailable partner data" : tab}</h2>
          {tab === "Partners" && canManage && (
            <button
              className={styles.primary}
              type="button"
              disabled={!pathways.some((pathway) => pathway.isActive)}
              onClick={() => setEditingPartner("new")}
            >
              Add partner
            </button>
          )}
        </div>
        {tab !== "Unavailable" && (
          <div className={styles.filters}>
            <label>
              Pathway
              <select
                value={pathwayKey}
                onChange={(event) => setPathwayKey(event.target.value)}
              >
                <option value="">All pathways</option>
                {pathways.map((pathway) => (
                  <option key={pathway.key} value={pathway.key}>
                    {pathway.title}
                  </option>
                ))}
              </select>
            </label>
            {tab === "Applications" || tab === "Intake & readiness" ? (
              <label>
                Application status
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                </select>
              </label>
            ) : (
              <label>
                Status
                <select
                  value={catalogStatus}
                  onChange={(event) => setCatalogStatus(event.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            )}
            {tab === "Intake & readiness" && (
              <label>
                Readiness
                <select
                  value={readiness}
                  onChange={(event) => setReadiness(event.target.value)}
                >
                  <option value="">All checklists</option>
                  <option value="ready">Finished</option>
                  <option value="pending">Unfinished</option>
                </select>
              </label>
            )}
          </div>
        )}
        {tab === "Applications" && (
          <ManagementTable
            key={tab}
            data={filteredApps}
            columns={applicationColumns}
            label="Applications"
          />
        )}
        {tab === "Intake & readiness" && (
          <>
            <p className={styles.note}>
              Current membership and minimums; self-attested savings. Checklist
              readiness is not a verified partner outcome.
            </p>
            <ManagementTable
              key={tab}
              data={filteredApps}
              columns={intakeColumns}
              label="Intake records"
            />
          </>
        )}
        {tab === "Pathways" && (
          <ManagementTable
            key={tab}
            data={filteredPathways}
            columns={pathwayColumns}
            label="Pathways"
          />
        )}
        {tab === "Partners" && (
          <ManagementTable
            key={tab}
            data={filteredPartners}
            columns={partnerColumns}
            label="Partners"
          />
        )}
        {tab === "Unavailable" && (
          <ManagementTable
            key={tab}
            data={unavailableData}
            columns={unavailableColumns}
            label="Unavailable features"
          />
        )}
      </section>
      <Dialog
        open={editingPathway !== null}
        title={canManage ? "Edit pathway" : "Pathway details"}
        onClose={() => setEditingPathway(null)}
      >
        {editingPathway && (
          <PathwayForm
            key={editingPathway.key}
            pathway={editingPathway}
            canManage={canManage}
            onSaved={saved}
            onClose={() => setEditingPathway(null)}
          />
        )}
      </Dialog>
      <Dialog
        open={editingPartner !== null}
        title={
          editingPartner === "new"
            ? "Add partner"
            : canManage
              ? "Edit partner"
              : "Partner details"
        }
        onClose={() => setEditingPartner(null)}
      >
        {editingPartner && (
          <PartnerForm
            key={editingPartner === "new" ? "new" : editingPartner.id}
            partner={editingPartner === "new" ? undefined : editingPartner}
            pathways={pathways}
            canManage={canManage}
            onSaved={saved}
            onClose={() => setEditingPartner(null)}
          />
        )}
      </Dialog>
    </main>
  );
}
