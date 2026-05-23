import { redirect } from "next/navigation";

export default function AffiliateLinksRedirect() {
  redirect("/suite?view=affiliates");
}
