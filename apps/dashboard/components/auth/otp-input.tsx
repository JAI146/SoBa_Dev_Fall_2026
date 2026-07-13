"use client";

import { ClipboardEvent, KeyboardEvent, useRef } from "react";
import styles from "../../app/auth.module.css";

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const LENGTH = 6;

export function OtpInput({ value, onChange, disabled }: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");

  function updateDigit(index: number, digit: string) {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join("").slice(0, LENGTH));
  }

  function handleChange(index: number, raw: string) {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) {
      updateDigit(index, "");
      return;
    }
    if (cleaned.length === 1) {
      updateDigit(index, cleaned);
      inputsRef.current[index + 1]?.focus();
      return;
    }
    const merged = (digits.join("") + cleaned).replace(/\D/g, "").slice(0, LENGTH);
    onChange(merged);
    const focusIndex = Math.min(merged.length, LENGTH - 1);
    inputsRef.current[focusIndex]?.focus();
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;
    onChange(pasted);
    const focusIndex = Math.min(pasted.length, LENGTH - 1);
    inputsRef.current[focusIndex]?.focus();
  }

  return (
    <div className={styles["otp-input-row"]}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          className={styles["otp-input-cell"]}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={LENGTH}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
