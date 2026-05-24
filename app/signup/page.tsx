import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const key of ["plan", "seats", "cadence"]) {
    const value = first(params[key]);
    if (value) query.set(key, value);
  }

  redirect(`/checkout${query.size ? `?${query.toString()}` : ""}`);
}
