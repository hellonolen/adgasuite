import { redirect } from "next/navigation";

export default async function LegacyMapRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/suite/dealflow/${encodeURIComponent(id)}`);
}
