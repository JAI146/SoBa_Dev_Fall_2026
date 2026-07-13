import type { ReactNode } from "react";

export type SidebarNavIconName = "overview" | "crud";

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

export function SidebarNavIcon({
  name,
  className,
}: {
  name: SidebarNavIconName;
  className?: string;
}) {
  if (name === "crud") {
    return (
      <Svg className={className}>
        <path d="M4 5h16" />
        <path d="M4 12h16" />
        <path d="M4 19h16" />
        <circle cx="7" cy="5" r="1" fill="currentColor" />
        <circle cx="7" cy="12" r="1" fill="currentColor" />
        <circle cx="7" cy="19" r="1" fill="currentColor" />
      </Svg>
    );
  }

  return (
    <Svg className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </Svg>
  );
}
