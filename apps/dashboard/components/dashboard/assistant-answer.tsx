"use client";

import { useMemo } from "react";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import styles from "./assistant-answer.module.css";

type AnswerTable = { headings: string[]; align: string[]; rows: string[][] };

// Recognize pipe tables in saved replies too, including escaped outer borders.
function cells(line = "") {
  const row = line.trim().replace(/^\\\|/, "|").replace(/\|\\$/, "|");
  if (!row.includes("|")) return [];
  return row
    .replace(/^\|/, "")
    .replace(/(?<!\\)\|$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

function parseAnswer(text: string) {
  const lines = text.split(/\r?\n/);
  const parts: (string | AnswerTable)[] = [];
  let start = 0;
  let fence: string | undefined;
  for (let line = 0; line < lines.length; line++) {
    const marker = lines[line]?.trimStart().match(/^(`{3,}|~{3,})/)?.[0];
    if (marker) {
      if (!fence) fence = marker;
      else if (marker.startsWith(fence)) fence = undefined;
      continue;
    }
    if (fence) continue;
    const divider = cells(lines[line]);
    if (!divider.length || !divider.every((s) => /^:?-{3,}:?$/.test(s)))
      continue;
    const previous = line > start ? cells(lines[line - 1]) : [];
    const hasHeadings = previous.length === divider.length;
    const rows: string[][] = [];
    let end = line + 1;
    while (end < lines.length) {
      const row = cells(lines[end]);
      if (
        row.length !== divider.length ||
        row.every((s) => /^:?-{3,}:?$/.test(s))
      )
        break;
      rows.push(row);
      end++;
    }
    if (!rows.length) continue;
    const intro = lines
      .slice(start, hasHeadings ? line - 1 : line)
      .join("\n")
      .trim();
    if (intro) parts.push(intro);
    parts.push({
      headings: hasHeadings
        ? previous
        : divider.map((_, i) => `Column ${i + 1}`),
      align: divider,
      rows,
    });
    start = end;
    line = end - 1;
  }
  const rest = lines.slice(start).join("\n").trim();
  if (rest) parts.push(rest);
  return parts;
}

function inline(text: string) {
  return text
    .split(/(\*\*[^*\n]+\*\*)/g)
    .map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        part
      ),
    );
}

// Percentages, USD amounts, and counts such as "3 (2)" sort by their displayed number.
function numericValue(cell = "") {
  const match = cell
    .replaceAll("**", "")
    .match(/^([-+]?\$?[\d,]+(?:\.\d+)?)(?:%|\s*\([\d,]+\))?$/);
  if (!match) return undefined;
  const n = Number(match[1]!.replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function ResultTable({ block }: { block: AnswerTable }) {
  const columns = useMemo<ColumnDef<string[]>[]>(
    () =>
      block.headings.map((heading, i) => {
        const numeric =
          block.rows.some((row) => numericValue(row[i]) !== undefined) &&
          block.rows.every(
            (row) =>
              numericValue(row[i]) !== undefined ||
              /^(?:unknown|n\/a|not available|—|-)?$/i.test(row[i] ?? ""),
          );
        return {
          id: String(i),
          header: heading,
          accessorFn: (row) => (numeric ? numericValue(row[i]) : row[i]),
          sortUndefined: "last",
          sortingFn: numeric ? "basic" : "alphanumeric",
          sortDescFirst: numeric,
        };
      }),
    [block],
  );
  const table = useReactTable({
    data: block.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const align = (i: number) =>
    block.align[i]?.startsWith(":") && block.align[i]?.endsWith(":")
      ? "center"
      : block.align[i]?.endsWith(":") || columns[i]?.sortingFn === "basic"
        ? "right"
        : "left";
  return (
    <div
      className={styles.scroll}
      role="region"
      aria-label="Assistant results table"
      tabIndex={0}
    >
      <table aria-label="Assistant results">
        <thead>
          <tr>
            {table.getFlatHeaders().map((header, i) => {
              const sort = header.column.getIsSorted();
              return (
                <th
                  key={header.id}
                  scope="col"
                  style={{ textAlign: align(i) }}
                  aria-sort={
                    sort === "asc"
                      ? "ascending"
                      : sort === "desc"
                        ? "descending"
                        : "none"
                  }
                >
                  <button
                    type="button"
                    onClick={header.column.getToggleSortingHandler()}
                    title={`Sort by ${block.headings[i]}`}
                  >
                    {inline(block.headings[i] ?? "")}{" "}
                    <span aria-hidden="true">
                      {sort === "asc" ? "↑" : sort === "desc" ? "↓" : "↕"}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.original.map((cell, i) => (
                <td key={i} style={{ textAlign: align(i) }}>
                  {inline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AssistantAnswer({ text }: { text: string }) {
  const parts = useMemo(() => parseAnswer(text), [text]);
  return (
    <div className={styles.answer}>
      {parts.map((part, i) =>
        typeof part === "string" ? (
          <p key={i}>{inline(part)}</p>
        ) : (
          <ResultTable key={i} block={part} />
        ),
      )}
    </div>
  );
}
