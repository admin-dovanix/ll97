import { Badge } from "@airwise/ui";
import { getCurrentRole } from "../lib/auth";

export async function DevSessionBadge() {
  const role = await getCurrentRole();
  return <Badge label={`Role: ${role}`} />;
}
