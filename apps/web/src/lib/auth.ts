import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  appUserRoles,
  type AppSessionRecord,
  type AppUserRole,
  createAppSessionForUser,
  endAppSession,
  getAppSessionById,
  getBuildingById,
  switchAppSessionMembership
} from "@airwise/database";

const sessionCookieName = "airwise_session";

export { appUserRoles };
export type { AppUserRole };

export async function getCurrentSession(): Promise<AppSessionRecord | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(sessionCookieName)?.value;

  if (!sessionId) {
    return null;
  }

  return getAppSessionById(sessionId);
}

export async function setCurrentSession(sessionId: string) {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/"
  });
}

export async function clearCurrentSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(sessionCookieName)?.value;

  if (sessionId) {
    endAppSession(sessionId);
  }

  cookieStore.delete(sessionCookieName);
}

export async function loginWithEmail(email: string, membershipId?: string) {
  const session = createAppSessionForUser({ email, membershipId });
  if (!session) {
    throw new Error(`Could not create a session for ${email}.`);
  }

  await setCurrentSession(session.id);
  return session;
}

export async function switchCurrentMembership(membershipId: string) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(sessionCookieName)?.value;

  if (!sessionId) {
    throw new Error("No active session exists.");
  }

  const session = switchAppSessionMembership({ sessionId, membershipId });
  if (!session) {
    throw new Error("Could not switch the active membership.");
  }

  return session;
}

export async function requireAuthenticatedSession() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireActiveRole(allowedRoles: AppUserRole[]) {
  const session = await requireAuthenticatedSession();
  const activeRole = session.activeRole;

  if (!activeRole || !allowedRoles.includes(activeRole)) {
    throw new Error(
      `Current membership role ${activeRole ?? "none"} is not allowed to perform this action.`
    );
  }

  return {
    session,
    role: activeRole
  };
}

export async function requirePortfolioAccess(portfolioId: string, allowedRoles?: AppUserRole[]) {
  const session = await requireAuthenticatedSession();
  const membership = session.memberships.find((item) => item.portfolioId === portfolioId);

  if (!membership) {
    throw new Error(`Current user does not have access to portfolio ${portfolioId}.`);
  }

  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    throw new Error(`Current user role ${membership.role} is not allowed for portfolio ${portfolioId}.`);
  }

  return {
    session,
    membership
  };
}

export async function requireBuildingAccess(buildingId: string, allowedRoles?: AppUserRole[]) {
  const building = getBuildingById(buildingId);
  const access = await requirePortfolioAccess(building.portfolioId, allowedRoles);

  return {
    ...access,
    building
  };
}

export function isValidAppRole(value: string): value is AppUserRole {
  return appUserRoles.includes(value as AppUserRole);
}
