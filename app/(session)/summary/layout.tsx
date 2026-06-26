import { SiteHeader } from "@/components/shell/site-header";
import { SiteFooter } from "@/components/shell/site-footer";

// Shared shell for the summary route only. The sibling live-session route in the
// (session) group deliberately has no group layout — it keeps its own slim
// in-session bar and runs full-screen.
export default function SummaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
