import { SiteHeader } from "@/components/shell/site-header";
import { SiteFooter } from "@/components/shell/site-footer";

// Shared shell for the onboarding journey (keys → case-select).
export default function OnboardingLayout({
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
