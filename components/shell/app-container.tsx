// Shared content container — one max-width + padding scale so every route frames
// its content identically (the app had a different width/padding per page before).
// Default is the standard reading column; `wide` is for grid-heavy pages.
export function AppContainer({
  children,
  wide = false,
  as: Tag = "main",
}: {
  children: React.ReactNode;
  wide?: boolean;
  as?: "main" | "div";
}) {
  return (
    <Tag
      className={`mx-auto w-full px-4 pt-10 pb-section sm:px-6 sm:pt-14 lg:px-8 lg:pt-16 ${
        wide ? "max-w-5xl" : "max-w-3xl"
      }`}
    >
      {children}
    </Tag>
  );
}
