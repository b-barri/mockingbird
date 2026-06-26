"use client";

interface ScratchpadPanelProps {
  value: string;
  onChange: (text: string) => void;
  collapsed: boolean;
  onToggleCollapsed: (collapsed: boolean) => void;
}

const PLACEHOLDER = `Clarifying questions

User segment

Jobs to be done

Solution sketch

Metric and success`;

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
      <div className="border-b border-white/[0.06] px-5 py-3.5">
        <div className="ascii-rule mb-2">Scratchpad</div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-mute">
            Your notes
          </span>
          <button
            type="button"
            onClick={() => onToggleCollapsed(!collapsed)}
            className="text-[12px] text-mute transition-colors hover:text-ink"
            aria-pressed={collapsed}
            aria-label={
              collapsed ? "Expand scratchpad" : "Collapse scratchpad"
            }
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </div>
      </div>
      {!collapsed && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={PLACEHOLDER}
          className="flex-1 resize-none border-0 bg-transparent px-5 py-4 text-[13.5px] leading-[1.7] text-ink placeholder:text-mute focus:outline-none"
          data-testid="scratchpad-textarea"
        />
      )}
    </div>
  );
}
