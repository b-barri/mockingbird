"use client";

interface ScratchpadPanelProps {
  value: string;
  onChange: (text: string) => void;
  collapsed: boolean;
  onToggleCollapsed: (collapsed: boolean) => void;
}

const PLACEHOLDER = `Clarifying questions
- ...

User
- ...

Jobs-to-be-done
- ...

Solution sketch
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
      <div className="flex items-center justify-between border-b border-ink/[0.06] px-5 py-3.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-mute">
          Scratchpad
        </span>
        <button
          type="button"
          onClick={() => onToggleCollapsed(!collapsed)}
          className="font-sans text-xs text-mute hover:text-ink"
          aria-pressed={collapsed}
          aria-label={
            collapsed ? "Expand scratchpad" : "Collapse scratchpad"
          }
        >
          {collapsed ? "Expand ↗" : "Collapse →"}
        </button>
      </div>
      {!collapsed && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={PLACEHOLDER}
          className="flex-1 resize-none border-0 bg-transparent px-5 py-4 font-sans text-sm leading-relaxed text-ink placeholder:text-mute focus:outline-none"
          data-testid="scratchpad-textarea"
        />
      )}
    </div>
  );
}
