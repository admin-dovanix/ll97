import { redirect } from "next/navigation";
import { requireAuthenticatedSession } from "../lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await requireAuthenticatedSession();
  redirect("/portfolios");
}
