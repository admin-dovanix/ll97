import { cookies } from "next/headers";

export const appRoles = ["owner", "operator", "rdp", "rcxa"] as const;

export type AppRole = (typeof appRoles)[number];

export async function getCurrentRole(): Promise<AppRole> {
  const cookieStore = await cookies();
  const role = cookieStore.get("airwise_role")?.value;
  return appRoles.includes(role as AppRole) ? (role as AppRole) : "owner";
}

export async function setCurrentRole(role: AppRole) {
  const cookieStore = await cookies();
  cookieStore.set("airwise_role", role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/"
  });
}

export async function requireRole(allowedRoles: AppRole[]) {
  const role = await getCurrentRole();

  if (!allowedRoles.includes(role)) {
    throw new Error(`Current role ${role} is not allowed to perform this action.`);
  }

  return role;
}
