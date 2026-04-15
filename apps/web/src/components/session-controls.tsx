import { Button } from "./ui/button";
import { StatusBadge } from "./ui/status-badge";
import { logoutAction, switchMembershipAction } from "../app/actions";
import { requireAuthenticatedSession } from "../lib/auth";

export async function SessionControls() {
  const session = await requireAuthenticatedSession();

  return (
    <section className="rounded-lg border border-border bg-panel shadow-inset">
      <div className="grid gap-4 px-panel py-4">
        <div className="space-y-1">
          <p className="eyebrow">Access context</p>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={`${session.user.name}`} tone="accent" />
            <StatusBadge label={session.activeRole ?? "No role"} tone="neutral" />
          </div>
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          {session.user.email}
          <br />
          {session.activePortfolioName ?? "No active portfolio"}
        </div>
        {session.memberships.length > 1 ? (
          <form action={switchMembershipAction} className="grid gap-2">
            <label>
              <span className="eyebrow">Membership</span>
              <select name="membershipId" defaultValue={session.activeMembershipId}>
                {session.memberships.map((membership) => (
                  <option key={membership.id} value={membership.id}>
                    {membership.portfolioName} · {membership.role}
                  </option>
                ))}
              </select>
            </label>
            <Button className="w-full" type="submit" variant="secondary">
              Switch access
            </Button>
          </form>
        ) : null}
        <form action={logoutAction}>
          <Button className="w-full" type="submit" variant="ghost">
            Sign out
          </Button>
        </form>
      </div>
    </section>
  );
}
