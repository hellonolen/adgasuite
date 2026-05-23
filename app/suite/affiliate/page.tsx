import { redirect } from "next/navigation";

export default function AffiliateRedirectPage() {
  redirect("/suite?view=affiliates");
}
