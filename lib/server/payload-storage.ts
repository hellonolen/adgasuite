import { createStorageObject } from "@/lib/server/repository";

type PayloadBucketName = "documents" | "uploads";

export type StoredJsonPayload = {
  r2_key: string;
  storage_object_id: string | null;
  bucket: PayloadBucketName;
  sha256: string;
  size_bytes: number;
};

type StoreJsonPayloadInput = {
  env: CloudflareEnv;
  db?: D1Database;
  organization_id: string;
  resource_type: string;
  resource_id: string;
  payload: Record<string, unknown>;
  created_by?: string | null;
  folder?: string;
  file_name?: string;
};

function payloadBucket(env: CloudflareEnv): { bucket: R2Bucket; name: PayloadBucketName } | null {
  if (env.UPLOADS_BUCKET) return { bucket: env.UPLOADS_BUCKET, name: "uploads" };
  if (env.DOCUMENTS_BUCKET) return { bucket: env.DOCUMENTS_BUCKET, name: "documents" };
  return null;
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function storeJsonPayload(input: StoreJsonPayloadInput): Promise<StoredJsonPayload> {
  const target = payloadBucket(input.env);
  if (!target) throw new Error("R2 payload storage is not configured.");

  const folder = input.folder || "payloads";
  const key = `${folder}/${input.resource_type}/${input.resource_id}.json`;
  const body = JSON.stringify(input.payload);
  const bytes = new TextEncoder().encode(body);
  const sha256 = await sha256Hex(body);

  await target.bucket.put(key, body, {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
    customMetadata: {
      organization_id: input.organization_id,
      resource_type: input.resource_type,
      resource_id: input.resource_id,
      sha256,
    },
  });

  const storageObject = await createStorageObject(input.db, {
    organization_id: input.organization_id,
    bucket: target.name,
    r2_key: key,
    file_name: input.file_name || `${input.resource_type}-${input.resource_id}.json`,
    mime_type: "application/json",
    size_bytes: bytes.byteLength,
    sha256,
    category: "upload",
    resource_type: input.resource_type,
    resource_id: input.resource_id,
    visibility: "workspace",
    created_by: input.created_by || null,
  });

  return {
    r2_key: key,
    storage_object_id: storageObject.id,
    bucket: target.name,
    sha256,
    size_bytes: bytes.byteLength,
  };
}

export async function readJsonPayload<T = Record<string, unknown>>(env: CloudflareEnv, r2Key: string | null | undefined): Promise<T | null> {
  if (!r2Key) return null;
  const target = payloadBucket(env);
  if (!target) return null;

  const object = await target.bucket.get(r2Key);
  if (!object) return null;

  try {
    return JSON.parse(await object.text()) as T;
  } catch {
    return null;
  }
}
