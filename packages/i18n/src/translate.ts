import type { TranslationParams, TranslationTree } from "./types";

function getByPath(tree: TranslationTree, path: string): string | undefined {
  const parts = path.split(".");
  let current: string | TranslationTree | undefined = tree;

  for (const part of parts) {
    if (!current || typeof current === "string") return undefined;
    current = current[part];
  }

  return typeof current === "string" ? current : undefined;
}

export function translate(
  tree: TranslationTree,
  key: string,
  params?: TranslationParams,
): string {
  const template = getByPath(tree, key) ?? key;

  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (_, token: string) =>
    String(params[token] ?? `{${token}}`),
  );
}

export function translateEnum(
  tree: TranslationTree,
  group: string,
  value: string,
): string {
  const key = `enums.${group}.${value}`;
  const label = getByPath(tree, key);
  if (label) return label;
  return value.replace(/_/g, " ");
}
