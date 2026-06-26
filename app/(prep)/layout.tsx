import { SiteHeader } from "@/components/shell/site-header";
import { SiteFooter } from "@/components/shell/site-footer";

// Shared shell for the screening prep journey (/screen and /screen/brief/[id]).
export default function PrepLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
