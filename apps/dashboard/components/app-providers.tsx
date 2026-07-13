"use client";

import { I18nProvider } from "@muakhah/i18n";
import { usePathname } from "next/navigation";
import { AuthLanguageBar } from "./auth-language-bar";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboard");

  return (
    <I18nProvider>
      {!isDashboard ? <AuthLanguageBar /> : null}
      {children}
    </I18nProvider>
  );
}
