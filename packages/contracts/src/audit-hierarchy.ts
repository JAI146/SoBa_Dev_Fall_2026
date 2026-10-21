import type { AuditStaffNode } from "./audit";

export type HierarchyWarning = { origin: string; step: number; hops: number };

export function hierarchyWarningRoutes(
  users: AuditStaffNode[],
  detected: Set<string>,
) {
  const byId = new Map(users.map((user) => [user.id, user]));
  const routes = new Map<string, HierarchyWarning[]>();
  for (const origin of detected) {
    const children: string[] = [];
    const visited = new Set<string>();
    let current = byId.get(origin);
    while (
      current &&
      current.role !== "super_admin" &&
      current.reportsToUserId
    ) {
      visited.add(current.id);
      const parent = byId.get(current.reportsToUserId);
      if (!parent || visited.has(parent.id)) break;
      children.push(current.id);
      current = parent;
    }
    children.forEach((child, step) => {
      const signals = routes.get(child) ?? [];
      signals.push({ origin, step, hops: children.length });
      routes.set(child, signals);
    });
  }
  return routes;
}

export function hierarchyHighlights(
  users: AuditStaffNode[],
  enabled: boolean,
  name: string,
) {
  const detected = new Set(
    users
      .filter(
        (user) =>
          enabled &&
          user.matchCount > 0 &&
          user.name.toLowerCase().includes(name.toLowerCase()),
      )
      .map((user) => user.id),
  );
  const ancestors = new Set<string>();
  const byId = new Map(users.map((user) => [user.id, user]));
  for (const id of detected) {
    let current = byId.get(id)?.reportsToUserId;
    const visited = new Set([id]);
    while (current && !visited.has(current)) {
      visited.add(current);
      ancestors.add(current);
      current = byId.get(current)?.reportsToUserId;
    }
  }
  return { detected, ancestors };
}
