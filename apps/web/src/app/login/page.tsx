import { redirect } from "next/navigation";
import { listAppUsers } from "@airwise/database";
import { loginAction } from "../actions";
import { getCurrentSession } from "../../lib/auth";
import { ActionButton } from "../../components/ui/action-button";
import { StatusBadge } from "../../components/ui/status-badge";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getCurrentSession();

  if (session) {
    redirect("/");
  }

  const users = listAppUsers();

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground lg:px-6">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_28rem]">
        <section className="grid gap-6 rounded-lg border border-border bg-panel p-6 shadow-inset">
          <header className="grid gap-3 border-b border-border pb-5">
            <p className="eyebrow">AirWise access</p>
            <h1 className="text-3xl font-semibold tracking-tight">Sign in to the operating workspace</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Choose a seeded user or enter an email directly to enter the AirWise portfolio, compliance, monitoring,
              and command surfaces with the right tenant scope.
            </p>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-md border border-border bg-panelAlt p-4">
              <p className="eyebrow">Compliance</p>
              <p className="mt-2 text-sm text-muted-foreground">LL97 filing posture, evidence readiness, and penalty risk.</p>
            </div>
            <div className="rounded-md border border-border bg-panelAlt p-4">
              <p className="eyebrow">Monitoring</p>
              <p className="mt-2 text-sm text-muted-foreground">Gateway discovery, telemetry, issue detection, and recommendations.</p>
            </div>
            <div className="rounded-md border border-border bg-panelAlt p-4">
              <p className="eyebrow">Commands</p>
              <p className="mt-2 text-sm text-muted-foreground">Supervised BAS write-back with approval and lifecycle tracking.</p>
            </div>
          </div>

          <section className="rounded-md border border-border bg-panelAlt p-5">
            <p className="eyebrow">Manual sign-in</p>
            <form action={loginAction} className="mt-4 grid gap-3">
              <label>
                <span className="eyebrow">Email</span>
                <input name="email" placeholder="owner@airwise.local" required />
              </label>
              <label>
                <span className="eyebrow">Membership ID</span>
                <input name="membershipId" placeholder="Optional membership ID" />
              </label>
              <ActionButton type="submit">Start session</ActionButton>
            </form>
          </section>
        </section>

        <section className="grid gap-4">
          <div className="rounded-lg border border-border bg-panel p-6 shadow-inset">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Seeded users</p>
                <h2 className="text-lg font-semibold tracking-tight">Available access contexts</h2>
              </div>
              <StatusBadge label={`${users.length} users`} tone="accent" />
            </div>

            <div className="mt-5 grid gap-3">
              {users.map((user) => (
                <form key={user.id} action={loginAction} className="grid gap-3 rounded-md border border-border bg-panelAlt p-4">
                  <input name="email" type="hidden" value={user.email} />
                  {user.memberships[0] ? <input name="membershipId" type="hidden" value={user.memberships[0].id} /> : null}
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user.memberships.map((membership) => (
                      <StatusBadge key={membership.id} label={`${membership.portfolioName} · ${membership.role}`} tone="neutral" />
                    ))}
                  </div>
                  <ActionButton type="submit">Sign in as {user.name}</ActionButton>
                </form>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
