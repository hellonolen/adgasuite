import { NextResponse } from "next/server";
import {
  FIVE_SECRETS_ACCESS_COOKIE,
  createFiveSecretsAccessToken,
  fiveSecretsAccessCookieOptions,
  validateFiveSecretsToken,
} from "@/lib/server/five-secrets-access";
import { createEvent } from "@/lib/server/repository";
import { getRuntimeContext } from "@/lib/server/runtime";

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  const url = new URL(request.url);
  const email = await validateFiveSecretsToken(url.searchParams.get("token"), "five-secrets-magic", context.env);

  if (!email) {
    return NextResponse.redirect(new URL("/5-secrets?access=expired", request.url));
  }

  const accessToken = await createFiveSecretsAccessToken(email, context.env);
  const response = NextResponse.redirect(new URL("/5-secrets/access", request.url));
  response.cookies.set(FIVE_SECRETS_ACCESS_COOKIE, accessToken, fiveSecretsAccessCookieOptions(request.url));

  await createEvent(context.env.DB, {
    organization_id: "org_adga_primary",
    event_type: "lead_magnet.five_secrets.access_granted",
    actor_type: "system",
    actor_id: "five-secrets-magic-link",
    resource_type: "lead_magnet_access",
    resource_id: email,
    payload: {
      lead_magnet: "five-secrets",
    },
  });

  return response;
}
