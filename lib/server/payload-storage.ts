import { createStorageObject, getStorageObjectById } from "@/lib/server/repository";

type PayloadBucketName = "assets" | "documents" | "uploads";

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

function storageBucket(env: CloudflareEnv, name: PayloadBucketName): R2Bucket | null {
  if (name === "uploads") return env.UPLOADS_BUCKET || null;
  if (name === "documents") return env.DOCUMENTS_BUCKET || null;
  if (name === "assets") return env.ASSETS_BUCKET || null;
  return null;
}

function payloadReadBuckets(env: CloudflareEnv, bucketName?: PayloadBucketName | null): R2Bucket[] {
  if (bucketName) {
    const bucket = storageBucket(env, bucketName);
    return bucket ? [bucket] : [];
  }

  const buckets = [payloadBucket(env)?.bucket, env.DOCUMENTS_BUCKET || null, env.UPLOADS_BUCKET || null, env.ASSETS_BUCKET || null];
  return buckets.filter((bucket, index): bucket is R2Bucket => Boolean(bucket) && buckets.indexOf(bucket) === index);
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
  const key = `${folder}/${input.organization_id}/${input.resource_type}/${input.resource_id}.json`;
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

export async function readJsonPayload<T = Record<string, unknown>>(
  env: CloudflareEnv,
  r2Key: string | null | undefined,
  bucketName?: PayloadBucketName | null,
): Promise<T | null> {
  if (!r2Key) return null;
  const buckets = payloadReadBuckets(env, bucketName);

  for (const bucket of buckets) {
    const object = await bucket.get(r2Key);
    if (!object) continue;
    try {
      return JSON.parse(await object.text()) as T;
    } catch {
      return null;
    }
  }
  return null;
}

export async function readStoredJsonPayload<T = Record<string, unknown>>(
  env: CloudflareEnv,
  db: D1Database | undefined,
  r2Key: string | null | undefined,
  storageObjectId: string | null | undefined,
  organizationId?: string | null,
): Promise<T | null> {
  const storageObject = await getStorageObjectById(db, storageObjectId);
  if (organizationId && storageObject && storageObject.organization_id !== organizationId) {
    return null;
  }
  return readJsonPayload<T>(env, storageObject?.r2_key || r2Key, storageObject?.bucket || null);
}
