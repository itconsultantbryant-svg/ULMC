"use client";

import { useCallback, useRef, useState } from "react";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Undo2,
  Video,
} from "lucide-react";

type Command = {
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  run: () => void;
};

export function RichTextEditor({
  initialHtml,
  onChange,
  disabled,
  label = "Article body",
}: {
  initialHtml: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState(!initialHtml || initialHtml === "<p></p>");

  const sync = useCallback(() => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    setEmpty(!(ref.current.textContent ?? "").trim());
    onChange(html);
  }, [onChange]);

  function exec(command: string, value?: string) {
    if (disabled) return;
    ref.current?.focus();
    document.execCommand(command, false, value);
    sync();
  }

  function addLink() {
    if (disabled) return;
    const url = window.prompt("Link URL (https://…)");
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      window.alert("Use a full http:// or https:// address.");
      return;
    }
    exec("createLink", url);
  }

  function addMedia(type: "image" | "video") {
    if (disabled) return;
    const url = window.prompt(`Paste the ${type} URL or a Media Library path (/media/…)`);
    if (!url) return;
    const valid = /^https:\/\//i.test(url) || /^\/media\/[a-z0-9-]+$/i.test(url);
    if (!valid) {
      window.alert("Use an https:// URL or a /media/<asset-id> path from the Media Library.");
      return;
    }
    const html = type === "image" ? `<img src="${url}" alt="" />` : `<video controls src="${url}"></video>`;
    exec("insertHTML", html);
  }

  const commands: Command[] = [
    { label: "Bold", icon: Bold, run: () => exec("bold") },
    { label: "Italic", icon: Italic, run: () => exec("italic") },
    { label: "Heading 2", icon: Heading2, run: () => exec("formatBlock", "<h2>") },
    { label: "Heading 3", icon: Heading3, run: () => exec("formatBlock", "<h3>") },
    { label: "Bulleted list", icon: List, run: () => exec("insertUnorderedList") },
    { label: "Numbered list", icon: ListOrdered, run: () => exec("insertOrderedList") },
    { label: "Quote", icon: Quote, run: () => exec("formatBlock", "<blockquote>") },
    { label: "Link", icon: Link2, run: addLink },
    { label: "Insert image", icon: ImagePlus, run: () => addMedia("image") },
    { label: "Insert video", icon: Video, run: () => addMedia("video") },
    { label: "Clear formatting", icon: RemoveFormatting, run: () => exec("removeFormat") },
    { label: "Undo", icon: Undo2, run: () => exec("undo") },
    { label: "Redo", icon: Redo2, run: () => exec("redo") },
  ];

  return (
    <div className="rounded-lg border border-line bg-white">
      <div
        role="toolbar"
        aria-label="Formatting"
        className="flex flex-wrap items-center gap-0.5 border-b border-line bg-mist px-2 py-1.5"
      >
        {commands.map((command) => {
          const Icon = command.icon;
          return (
            <button
              key={command.label}
              type="button"
              title={command.label}
              aria-label={command.label}
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={command.run}
              className="rounded p-1.5 text-ink hover:bg-white hover:text-navy disabled:opacity-40"
            >
              <Icon className="h-4 w-4" aria-hidden />
            </button>
          );
        })}
      </div>

      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={sync}
        onBlur={sync}
        className="prose-editor"
        dangerouslySetInnerHTML={{ __html: initialHtml || "<p></p>" }}
        data-empty={empty ? "true" : "false"}
      />
      {empty ? (
        <p className="border-t border-line px-4 py-2 text-xs text-muted">
          Start writing the story. Use headings and short paragraphs for readability.
        </p>
      ) : null}
    </div>
  );
}
