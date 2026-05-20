import { json } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { getSuiteState } from "@/lib/server/repository";

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  const state = await getSuiteState(context.env.DB);

  return json({
    ok: true,
    user: context.user,
    ...state,
  });
}
