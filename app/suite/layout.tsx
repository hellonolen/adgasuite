import SuiteClient from "./suite-client";

// One shell mount for every /suite/* route. The wrapper carries the .suite-shell class
// that the legacy CSS in components/adga/*.css scopes to, plus the typography hooks.
// Children render inside the workspace area of the suite shell (currently AdgaSuite still
// owns the workspace render based on pathname — extraction into per-route components is
// staged for the next pass).
export default function SuiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="suite-shell adga-font-product adga-presence-crisp">
      <SuiteClient>{children}</SuiteClient>
    </main>
  );
}
