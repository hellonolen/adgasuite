import { redirect } from "next/navigation";

export default function AdminWorkspaceRedirect() {
  redirect("/suite?view=admin");
}
