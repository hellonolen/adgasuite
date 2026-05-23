import { redirect } from "next/navigation";

export default function SettingsIntegrationsRedirect() {
  redirect("/suite?view=settings");
}
