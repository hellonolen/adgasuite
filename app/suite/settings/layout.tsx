import { headers } from "next/headers";
import { redirect } from "next/navigation";
import SettingsLayout from "@/components/suite/SettingsLayout";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";

export const dynamic = "force-dynamic";

export default async function SettingsRootLayout({ children }: { children: React.ReactNode }) {
  // Mirror /api/suite/state guard. Middleware already redirects unauth users in
  // production; this is a second line of defense if middleware is bypassed.
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie");
  const request = new Request("https://internal.local/suite/settings", {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });

  const context = getRuntimeContext(request);
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));

  if (!sessionUser && !context.user.isLocalAdminBypass) {
    redirect("/login?next=/suite/settings");
  }

  return (
    <main className="suite-shell adga-font-product min-h-screen bg-background text-foreground">
      {/* Re-establish shadcn primitive defaults that the global `button { ... }`
          reset in marketing.css / design-system.css strips inside .suite-shell.
          Scoped strictly to settings via the [data-settings-shell] attribute so
          it cannot affect the existing AdgaSuite monolith. */}
      <style>{`
        [data-settings-shell] [data-slot="button"][data-variant="default"] {
          background: var(--color-primary);
          color: var(--color-primary-foreground);
          padding: 0 1rem;
        }
        [data-settings-shell] [data-slot="button"][data-variant="default"]:hover {
          background: color-mix(in srgb, var(--color-primary) 90%, black 10%);
        }
        [data-settings-shell] [data-slot="button"][data-variant="outline"] {
          background: var(--color-background);
          border: 1px solid var(--color-border);
          padding: 0 1rem;
        }
        [data-settings-shell] [data-slot="button"][data-variant="outline"]:hover {
          background: var(--color-secondary);
        }
        [data-settings-shell] [data-slot="button"][data-variant="ghost"] { padding: 0 0.75rem; }
        [data-settings-shell] [data-slot="button"][data-variant="ghost"]:hover {
          background: var(--color-secondary);
        }
        [data-settings-shell] [data-slot="button"][data-size="sm"] { height: 2rem; padding: 0 0.75rem; }
        [data-settings-shell] [data-slot="switch"] {
          border: 1px solid var(--color-border);
        }
        [data-settings-shell] [data-slot="switch"][data-state="checked"] {
          background: var(--color-primary);
          border-color: var(--color-primary);
        }
        [data-settings-shell] [data-slot="switch"][data-state="unchecked"] {
          background: var(--color-input);
        }
      `}</style>
      <div data-settings-shell>
        <SettingsLayout>{children}</SettingsLayout>
      </div>
    </main>
  );
}
