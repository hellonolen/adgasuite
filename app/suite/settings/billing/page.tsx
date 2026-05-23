import { redirect } from "next/navigation";

export default function SettingsBillingRedirect() {
  redirect("/suite?view=billing");
}
