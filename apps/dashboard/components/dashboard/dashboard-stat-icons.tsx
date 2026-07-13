import type { ReactNode } from "react";

type IconProps = { className?: string };

function Svg({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function FamiliesIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </Svg>
  );
}

function HiddenIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </Svg>
  );
}

function PartialIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" stroke="none" opacity="0.35" />
    </Svg>
  );
}

function CoveredIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </Svg>
  );
}

function DonorsIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}

function SponsorshipsIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </Svg>
  );
}

function MessagesIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
  );
}

function ProfileUpdatesIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </Svg>
  );
}

function ActivityIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
    </Svg>
  );
}

function NoticesIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </Svg>
  );
}

function ApprovedIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="m9 10 2 2 4-4" />
    </Svg>
  );
}

function CompletedIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </Svg>
  );
}

function MoneyIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </Svg>
  );
}

function RemainingIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
      <polyline points="16 17 22 17 22 11" />
    </Svg>
  );
}

function ShieldIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </Svg>
  );
}

function ActiveIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  );
}

function SuspendedIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" x2="19.07" y1="4.93" y2="19.07" />
    </Svg>
  );
}

export type DashboardStatIconName =
  | "families"
  | "hidden"
  | "partial"
  | "covered"
  | "donors"
  | "sponsorships"
  | "messages"
  | "profileUpdates"
  | "activity"
  | "notices"
  | "approved"
  | "completed"
  | "money"
  | "remaining"
  | "shield"
  | "active"
  | "suspended";

const ICONS: Record<DashboardStatIconName, (props: IconProps) => ReactNode> = {
  families: FamiliesIcon,
  hidden: HiddenIcon,
  partial: PartialIcon,
  covered: CoveredIcon,
  donors: DonorsIcon,
  sponsorships: SponsorshipsIcon,
  messages: MessagesIcon,
  profileUpdates: ProfileUpdatesIcon,
  activity: ActivityIcon,
  notices: NoticesIcon,
  approved: ApprovedIcon,
  completed: CompletedIcon,
  money: MoneyIcon,
  remaining: RemainingIcon,
  shield: ShieldIcon,
  active: ActiveIcon,
  suspended: SuspendedIcon,
};

export function DashboardStatIcon({
  name,
  className,
}: {
  name: DashboardStatIconName;
  className?: string;
}) {
  const Icon = ICONS[name];
  return <Icon className={className} />;
}

export function MailIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </Svg>
  );
}

export function BellIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </Svg>
  );
}
