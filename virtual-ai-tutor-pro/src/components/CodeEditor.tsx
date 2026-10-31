
import { useRef } from "react";

/**
 * Code editor with line numbers.
 * Uses visible plain text to ensure C/C++ headers
 * such as <stdio.h> and <iostream> display correctly.
 */
export function CodeEditor({
  value,
  onChange,
  language,
  ariaLabel = "Code editor",
  readOnly = false,
}: {
  value: string;
  onChange: (v: string) => void;
  language: string;
  ariaLabel?: string;
  readOnly?: boolean;
}) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const lines = value.split("\n").length;

  function handleTab(
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (e.key !== "Tab" || readOnly) return;

    e.preventDefault();

    const ta = e.currentTarget;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    onChange(
      value.slice(0, start) +
      "  " +
      value.slice(end)
    );

    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = start + 2;
    });
  }

  return (
    <div className="flex overflow-hidden rounded-xl border bg-muted/30">
      {/* Line numbers */}
      <div
        ref={gutterRef}
        aria-hidden="true"
        className="max-h-[420px] select-none overflow-hidden border-r bg-muted/50 py-3 pl-3 pr-2 text-right font-mono text-sm leading-[1.4rem] text-muted-foreground"
      >
        {Array.from(
          { length: Math.max(lines, 10) },
          (_, i) => (
            <div key={i}>{i + 1}</div>
          )
        )}
      </div>

      {/* Visible code editor */}
      <div className="relative min-w-0 flex-1">
        <textarea
          aria-label={ariaLabel}
          aria-description={`Programming language: ${language}`}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          onScroll={(e) => {
            if (gutterRef.current) {
              gutterRef.current.scrollTop =
                e.currentTarget.scrollTop;
            }
          }}
          onKeyDown={handleTab}
          spellCheck={false}
          wrap="off"
          className="block h-[260px] max-h-[420px] w-full resize-y overflow-auto bg-transparent px-3 py-3 font-mono text-sm leading-[1.4rem] text-foreground caret-foreground outline-none"
        />
      </div>
    </div>
  );
}
