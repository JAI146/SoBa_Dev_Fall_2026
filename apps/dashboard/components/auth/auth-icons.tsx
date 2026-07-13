type IconProps = { className?: string };

function Svg({ children, className }: { children: React.ReactNode; className?: string }) {
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

export function AuthLoginIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </Svg>
  );
}

export function AuthSignUpIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </Svg>
  );
}

export function AuthForgotPasswordIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15 8 5 5" />
    </Svg>
  );
}

export type AuthTitleIconName = "login" | "register" | "forgot";

const ICONS = {
  login: AuthLoginIcon,
  register: AuthSignUpIcon,
  forgot: AuthForgotPasswordIcon,
} as const;

export function AuthTitleIcon({
  name,
  className,
}: {
  name: AuthTitleIconName;
  className?: string;
}) {
  const Icon = ICONS[name];
  return <Icon className={className} />;
}
