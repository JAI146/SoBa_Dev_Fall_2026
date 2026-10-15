"use client";
export function WorkspaceTabs({
  id,
  items,
  value,
  onChange,
}: {
  id: string;
  items: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Page sections"
      className="workspace-tabs"
      onKeyDown={(event) => {
        const index = items.findIndex((item) => item.key === value);
        const next =
          event.key === "ArrowRight"
            ? (index + 1) % items.length
            : event.key === "ArrowLeft"
              ? (index - 1 + items.length) % items.length
              : event.key === "Home"
                ? 0
                : event.key === "End"
                  ? items.length - 1
                  : -1;
        if (next < 0) return;
        event.preventDefault();
        const item = items[next];
        if (!item) return;
        onChange(item.key);
        event.currentTarget
          .querySelectorAll<HTMLButtonElement>('[role="tab"]')
          [next]?.focus();
      }}
    >
      {items.map((item) => (
        <button
          type="button"
          role="tab"
          id={`${id}-tab-${item.key}`}
          aria-controls={`${id}-panel-${item.key}`}
          aria-selected={value === item.key}
          tabIndex={value === item.key ? 0 : -1}
          key={item.key}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
