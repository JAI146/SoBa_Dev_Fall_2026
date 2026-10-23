import type { ReactNode } from "react";

export type SidebarNavIconName =
  | "settings"
  | "coaching"
  | "notifications"
  | "health"
  | "overview"
  | "pathways"
  | "users"
  | "upgrades"
  | "progress"
  | "roles"
  | "kyc"
  | "incentives"
  | "support";

function Svg({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
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

/** Rotated by CSS when its group is open. */
export function SidebarChevron({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

export function SidebarNavIcon({
  name,
  className,
}: {
  name: SidebarNavIconName;
  className?: string;
}) {
  // Reuse the shared SVG wrapper to match the sidebar’s existing stroke and sizing.
  if (name === "settings")
    return (
      <Svg className={className}>
        <circle cx="12" cy="12" r="3" />
        <path d="m9 3 6 0 1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z" />
      </Svg>
    );
  if (name === "coaching")
    return (
      <Svg className={className}>
        <path d="M21 11a8 8 0 0 1-8 8H5l-4 3V11a8 8 0 0 1 8-8h4a8 8 0 0 1 8 8Z" />
        <path d="M7 10h10M7 14h6" />
      </Svg>
    );
  if (name === "notifications")
    return (
      <Svg className={className}>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </Svg>
    );
  if (name === "health")
    return (
      <Svg className={className}>
        <path d="M3 12h4l3-7 4 14 3-7h4" />
      </Svg>
    );
  if (name === "incentives") {
    return (
      <Svg className={className}>
        <rect x="3" y="8" width="18" height="4" rx="1" />
        <path d="M5 12v9h14v-9M12 8v13M12 8H8a3 3 0 1 1 3-3zM12 8h4a3 3 0 1 0-3-3z" />
      </Svg>
    );
  }
  if (name === "support") {
    // Lifebuoy: ring, hub, and four ties.
    return (
      <Svg className={className}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3.5" />
        <path d="m5.6 5.6 3.9 3.9" />
        <path d="m14.5 14.5 3.9 3.9" />
        <path d="m18.4 5.6-3.9 3.9" />
        <path d="m9.5 14.5-3.9 3.9" />
      </Svg>
    );
  }
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

  if (name === "progress") {
    return (
      <Svg className={className}>
        <path d="M4 19h16" />
        <path d="M6 16l5-5 3 3 5-7" />
        <path d="M16 7h3v3" />
      </Svg>
    );
  }

  if (name === "roles") {
    return (
      <Svg className={className}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20a6 6 0 0 1 12 0" />
        <path d="M16 11h5" />
        <path d="M18.5 8.5v5" />
      </Svg>
    );
  }

  if (name === "kyc") {
    return (
      <Svg className={className}>
        <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z" />
        <path d="m9 12 2 2 4-4" />
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
