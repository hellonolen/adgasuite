import { redirect } from "next/navigation";

export default function AdminTeamRedirect() {
  redirect("/suite?view=admin");
}
