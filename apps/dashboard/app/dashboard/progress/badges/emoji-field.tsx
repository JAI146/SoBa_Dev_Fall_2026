"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { EmojiStyle } from "emoji-picker-react";
import { isSingleBadgeEmoji } from "@purposemint/contracts";
import { BadgeMedal } from "@/components/dashboard/badge-medal";
import styles from "./badges.module.css";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

export function EmojiField({
  value,
  onChange,
  onError,
}: {
  value: string;
  onChange: (emoji: string) => void;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  function accept(candidate: string) {
    if (candidate !== "" && !isSingleBadgeEmoji(candidate)) {
      onError(
        "Choose exactly one emoji. Text and multiple emojis are not allowed.",
      );
      return;
    }
    onChange(candidate);
    onError("");
  }
  return (
    <div
      className={styles.emojiField}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <div className={styles.iconEditor}>
        <BadgeMedal emoji={value} size={100} />
        <label>
          Center emoji
          <input
            autoFocus
            required
            value={value}
            maxLength={64}
            aria-label="Badge center emoji"
            aria-expanded={open}
            aria-controls={open ? "badge-emoji-picker" : undefined}
            autoComplete="off"
            spellCheck={false}
            onClick={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === "ArrowDown") {
                event.preventDefault();
                setOpen(true);
              }
            }}
            onChange={(event) => accept(event.target.value)}
            onPaste={(event) => {
              event.preventDefault();
              accept(event.clipboardData.getData("text"));
            }}
          />
        </label>
        {open && (
          <button
            type="button"
            className={styles.pickerClose}
            onClick={() => setOpen(false)}
            aria-label="Close emoji picker"
            title="Close emoji picker"
          >
            &#215;
          </button>
        )}
      </div>
      {open && (
        <div
          id="badge-emoji-picker"
          role="region"
          aria-label="Emoji picker"
          className={styles.emojiPicker}
        >
          <EmojiPicker
            width="100%"
            height={350}
            emojiStyle={"native" as EmojiStyle}
            previewConfig={{ showPreview: false }}
            onEmojiClick={(emoji) => {
              accept(emoji.emoji);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
