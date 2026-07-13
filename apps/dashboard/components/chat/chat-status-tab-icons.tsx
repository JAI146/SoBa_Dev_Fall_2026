import type { ReactNode } from "react";
import type { ChatMessageStatusTab } from "@/lib/chat-message-status";

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

function PendingIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </Svg>
  );
}

function ApprovedIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}

function RejectedIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Svg>
  );
}

function EscalatedIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </Svg>
  );
}

const ICONS: Record<ChatMessageStatusTab, (props: IconProps) => ReactNode> = {
  pending: PendingIcon,
  approved: ApprovedIcon,
  rejected: RejectedIcon,
  escalated: EscalatedIcon,
};

export function ChatStatusTabIcon({
  status,
  className,
}: {
  status: ChatMessageStatusTab;
  className?: string;
}) {
  const Icon = ICONS[status];
  return <Icon className={className} />;
}
