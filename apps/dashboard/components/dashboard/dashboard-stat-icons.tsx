import type { ReactNode } from "react";

type IconProps = { className?: string };
export type DashboardStatIconName = "users" | "goals" | "habits" | "accounts";

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

const icons: Record<DashboardStatIconName, (props: IconProps) => ReactNode> = {
  users: ({ className }) => (
    <Svg className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  ),
  goals: ({ className }) => (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </Svg>
  ),
  habits: ({ className }) => (
    <Svg className={className}>
      <path d="M20 6 9 17l-5-5" />
      <path d="M4 4h16v16H4z" />
    </Svg>
  ),
  accounts: ({ className }) => (
    <Svg className={className}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </Svg>
  ),
};

export function DashboardStatIcon({
  name,
  className,
}: {
  name: DashboardStatIconName;
  className?: string;
}) {
  const Icon = icons[name];
  return <Icon className={className} />;
}
