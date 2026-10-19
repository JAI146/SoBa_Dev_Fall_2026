"use client";

import { useEffect, useId, useRef, useState } from "react";
import { SidebarChevron } from "@/components/dashboard/sidebar-nav-icons";
import analyticsStyles from "./analytics.module.css";

export type HeaderSelectOption<T extends string> = { value: T; label: string };

/**
 * A dropdown: a button that opens a listbox directly below it, at its width.
 * Focus moves to the list while open, and arrows, Home, End, Enter, Space,
 * Escape and Tab behave like a native select.
 */
export function HeaderSelect<T extends string>({
  value,
  options,
  onChange,
  labelId,
}: {
  value: T;
  options: readonly HeaderSelectOption<T>[];
  onChange: (value: T) => void;
  /** The visible label's id, read together with the current choice. */
  labelId: string;
}) {
  const id = useId();
  const buttonId = `${id}-button`;
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  function show() {
    setActive(selectedIndex);
    setOpen(true);
  }

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  }

  function choose(index: number) {
    const next = options[index];
    if (next && next.value !== value) onChange(next.value);
    close(true);
  }

  // Move focus into the list when it opens so its keys go to it.
  useEffect(() => {
    if (open) list.current?.focus();
  }, [open]);

  // Close on a press anywhere outside the dropdown.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={root} className={analyticsStyles.headerSelect}>
      <button
        ref={button}
        id={buttonId}
        type="button"
        className={analyticsStyles.headerSelectButton}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={`${labelId} ${buttonId}`}
        onClick={() => (open ? close(true) : show())}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            show();
          }
        }}
      >
        <span>{options[selectedIndex]?.label}</span>
        <SidebarChevron className={analyticsStyles.headerSelectChevron} />
      </button>
      <ul
        ref={list}
        id={listId}
        role="listbox"
        tabIndex={-1}
        aria-labelledby={labelId}
        aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        className={analyticsStyles.headerSelectList}
        hidden={!open}
        onKeyDown={(event) => {
          const last = options.length - 1;
          const moves: Record<string, number> = {
            ArrowDown: Math.min(last, active + 1),
            ArrowUp: Math.max(0, active - 1),
            Home: 0,
            End: last,
          };
          if (event.key in moves) {
            event.preventDefault();
            setActive(moves[event.key]!);
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            choose(active);
          } else if (event.key === "Escape") {
            event.preventDefault();
            close(true);
          } else if (event.key === "Tab") {
            close(false);
          }
        }}
      >
        {options.map((option, index) => (
          <li
            key={option.value}
            id={`${id}-option-${index}`}
            role="option"
            aria-selected={option.value === value}
            data-active={index === active || undefined}
            onPointerEnter={() => setActive(index)}
            onClick={() => choose(index)}
          >
            {option.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
