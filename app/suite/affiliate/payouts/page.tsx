import { redirect } from "next/navigation";

export default function AffiliatePayoutsRedirect() {
  redirect("/suite?view=affiliates");
}
