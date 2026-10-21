"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./subscription-management.module.css";

type Option = { value: string; label: string; disabled?: boolean };

export function SearchableSelect({
  label,
  name,
  value,
  selectedLabel,
  search,
  onSearch,
  options,
  onSelect,
  loading,
  error,
}: {
  label: string;
  name: string;
  value: string;
  selectedLabel: string;
  search: string;
  onSearch: (value: string) => void;
  options: Option[];
  onSelect: (value: string) => void;
  loading: boolean;
  error: string | null;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open)
      list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);
  const choices =
    loading || error ? [] : options.filter((option) => !option.disabled);
  function choose(option: Option) {
    onSelect(option.value);
    onSearch("");
    setOpen(false);
  }
  return (
    <div className={styles["searchable-select"]}>
      <label htmlFor={id}>{label}</label>
      <input type="hidden" name={name} value={value} />
      <div className={styles["select-input"]}>
        <input
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-activedescendant={
            open && choices[active] ? `${id}-option-${active}` : undefined
          }
          autoComplete="off"
          required
          placeholder={`Search and select ${label.toLowerCase()}`}
          value={open ? search : selectedLabel}
          onFocus={() => {
            setOpen(true);
            setActive(0);
          }}
          onBlur={() => {
            setOpen(false);
            onSearch("");
          }}
          onChange={(event) => {
            onSelect("");
            onSearch(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActive((index) =>
                Math.max(
                  0,
                  Math.min(
                    choices.length - 1,
                    index + (event.key === "ArrowDown" ? 1 : -1),
                  ),
                ),
              );
            } else if (event.key === "Enter" && open) {
              event.preventDefault();
              if (choices[active]) choose(choices[active]);
            } else if (event.key === "Escape" && open) {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
              onSearch("");
            }
          }}
        />
        <span aria-hidden="true">⌄</span>
      </div>
      {open && (
        <div
          ref={list}
          id={`${id}-list`}
          role="listbox"
          aria-label={label}
          className={styles["select-options"]}
        >
          {choices.map((option, index) => (
            <button
              type="button"
              role="option"
              id={`${id}-option-${index}`}
              key={option.value}
              aria-selected={option.value === value}
              tabIndex={-1}
              className={index === active ? styles["option-active"] : undefined}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(option)}
            >
              {option.label}
            </button>
          ))}
          {!choices.length && (
            <p role={error ? "alert" : "status"}>
              {error || (loading ? "Loading…" : "No matches found.")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
