import { redirect } from "next/navigation";

export default function AffiliateLeaderboardRedirect() {
  redirect("/suite?view=affiliates");
}
