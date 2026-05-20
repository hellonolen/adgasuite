import { json } from "@/lib/server/http";
import { listStorageObjects } from "@/lib/server/repository";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  requireAdmin(context);
  return json({
    ok: true,
    objects: await listStorageObjects(context.env.DB),
    storage_policy: {
      d1: "metadata only",
      r2: "files, exports, recordings, transcripts, and large artifacts",
    },
  });
}
