import { redirect } from "next/navigation";

export default function TemplatesRedirectPage() {
  redirect("/suite?view=knowledge");
}
