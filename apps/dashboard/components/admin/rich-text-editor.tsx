"use client";

import { useCallback, useEffect, useRef } from "react";
import styles from "./rich-text-editor.module.css";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  label: string;
  dir?: "ltr" | "rtl";
  placeholder?: string;
  toolbarLabels: {
    bold: string;
    italic: string;
    underline: string;
    heading2: string;
    heading3: string;
    bulletList: string;
    numberedList: string;
    link: string;
    linkPrompt: string;
  };
};

export function RichTextEditor({
  value,
  onChange,
  label,
  dir = "ltr",
  placeholder,
  toolbarLabels,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const skipSyncRef = useRef(false);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || skipSyncRef.current) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value]);

  const syncContent = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    skipSyncRef.current = true;
    onChange(el.innerHTML);
    requestAnimationFrame(() => {
      skipSyncRef.current = false;
    });
  }, [onChange]);

  const exec = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    syncContent();
  };

  const insertLink = () => {
    const url = window.prompt(toolbarLabels.linkPrompt);
    if (url) exec("createLink", url);
  };

  return (
    <div className={styles.wrapper}>
      <span className={styles.label}>{label}</span>
      <div className={styles.toolbar} role="toolbar" aria-label={label}>
        <button type="button" onClick={() => exec("bold")} title={toolbarLabels.bold}>
          <b>B</b>
        </button>
        <button type="button" onClick={() => exec("italic")} title={toolbarLabels.italic}>
          <i>I</i>
        </button>
        <button
          type="button"
          onClick={() => exec("underline")}
          title={toolbarLabels.underline}
        >
          <u>U</u>
        </button>
        <span className={styles.divider} />
        <button
          type="button"
          onClick={() => exec("formatBlock", "h2")}
          title={toolbarLabels.heading2}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => exec("formatBlock", "h3")}
          title={toolbarLabels.heading3}
        >
          H3
        </button>
        <span className={styles.divider} />
        <button
          type="button"
          onClick={() => exec("insertUnorderedList")}
          title={toolbarLabels.bulletList}
        >
          •
        </button>
        <button
          type="button"
          onClick={() => exec("insertOrderedList")}
          title={toolbarLabels.numberedList}
        >
          1.
        </button>
        <span className={styles.divider} />
        <button type="button" onClick={insertLink} title={toolbarLabels.link}>
          🔗
        </button>
      </div>
      <div
        ref={editorRef}
        className={styles.editor}
        contentEditable
        dir={dir}
        onInput={syncContent}
        onBlur={syncContent}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    </div>
  );
}
