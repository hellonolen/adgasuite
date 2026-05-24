import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";
import {
  FIVE_SECRETS_ACCESS_COOKIE,
  validateFiveSecretsToken,
} from "@/lib/server/five-secrets-access";
import { getRuntimeContext } from "@/lib/server/runtime";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FiveSecretsAccessClient } from "./FiveSecretsAccessClient";

export default async function FiveSecretsAccessPage() {
  const context = getRuntimeContext();
  const cookieStore = await cookies();
  const email = await validateFiveSecretsToken(
    cookieStore.get(FIVE_SECRETS_ACCESS_COOKIE)?.value,
    "five-secrets-access",
    context.env
  );

  if (!email) redirect("/5-secrets");

  return (
    <MarketingLayout>
      <FiveSecretsAccessClient />
    </MarketingLayout>
  );
}
