"use client";

interface ScratchpadPanelProps {
  value: string;
  onChange: (text: string) => void;
  collapsed: boolean;
  onToggleCollapsed: (collapsed: boolean) => void;
}

const PLACEHOLDER = `# clarifying questions
- ...

# user segment
- ...

# jobs-to-be-done
- ...

# solution sketch
- ...

# metric / success
- ...`;

export function ScratchpadPanel({
  value,
  onChange,
  collapsed,
  onToggleCollapsed,
}: ScratchpadPanelProps) {
  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      data-testid="scratchpad-panel"
      data-collapsed={collapsed}
    >
      <div className="border-b border-ink/[0.06] px-5 py-3.5">
        <div className="ascii-rule mb-2">
          ── SCRATCHPAD ──────────────────────────────────
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-mute">
            your notes
          </span>
          <button
            type="button"
            onClick={() => onToggleCollapsed(!collapsed)}
            className="font-mono text-[11px] text-mute hover:text-ink"
            aria-pressed={collapsed}
            aria-label={
              collapsed ? "Expand scratchpad" : "Collapse scratchpad"
            }
          >
            {collapsed ? "expand ↗" : "collapse →"}
          </button>
        </div>
      </div>
      {!collapsed && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={PLACEHOLDER}
          className="flex-1 resize-none border-0 bg-transparent px-5 py-4 font-mono text-[12.5px] leading-[1.7] text-ink placeholder:text-mute focus:outline-none"
          data-testid="scratchpad-textarea"
        />
      )}
    </div>
  );
}
