import { redirect } from "next/navigation";

export default function AdminAuditRedirect() {
  redirect("/suite?view=admin");
}
