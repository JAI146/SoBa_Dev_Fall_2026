import type { ReactNode } from "react";

export type SidebarNavIconName = "overview" | "pathways" | "users" | "upgrades";

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
  if (name === "pathways") {
    return (
      <Svg className={className}>
        <path d="M4 19V5" />
        <path d="M4 6h11l-2 4 2 4H4" />
      </Svg>
    );
  }

  if (name === "users") {
    return (
      <Svg className={className}>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21a7 7 0 0 1 14 0" />
        <path d="M16 4a4 4 0 0 1 0 8" />
        <path d="M19 15a6 6 0 0 1 3 6" />
      </Svg>
    );
  }

  if (name === "upgrades") {
    return (
      <Svg className={className}>
        <path d="m12 3 7 7h-4v8H9v-8H5z" />
        <path d="M5 21h14" />
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
