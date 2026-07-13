import { useParams, usePathname } from "next/navigation";

export function useRouteParam(
  name: string,
  options?: { pathnamePattern?: RegExp },
): string | null {
  const params = useParams<Record<string, string | string[] | undefined>>();
  const pathname = usePathname();
  const value = params[name];

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (Array.isArray(value) && value[0]?.trim()) {
    return value[0];
  }

  if (options?.pathnamePattern && pathname) {
    const match = pathname.match(options.pathnamePattern);
    return match?.[1] ?? null;
  }

  return null;
}
