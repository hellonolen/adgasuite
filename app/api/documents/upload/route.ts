import { errorJson, json } from "@/lib/server/http";
import { createAgentJob, createDocumentMetadata, createEvent, createStorageObject } from "@/lib/server/repository";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";
import { newId } from "@/lib/server/id";

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  requireAdmin(context);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return errorJson("file is required.");
  const dealId = stringField(form.get("deal_id"));
  const companyId = stringField(form.get("company_id"));
  const companyName = stringField(form.get("company_name"));
  const contactName = stringField(form.get("contact_name"));
  const folder = stringField(form.get("folder")) || "general";

  const bucket = context.env.DOCUMENTS_BUCKET || context.env.UPLOADS_BUCKET;
  if (!bucket) {
    return errorJson("Document uploads are not available right now.", 503);
  }

  const bytes = await file.arrayBuffer();
  const hash = await sha256Hex(bytes);
  const key = `documents/${newId("doc")}/${file.name}`;
  await bucket.put(key, bytes, {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });

  const document = await createDocumentMetadata(context.env.DB, {
    title: file.name,
    type: documentTypeFromName(file.name),
    recipient_name: contactName || null,
    recipient_company: companyName || companyId || null,
    status: "stored",
    r2_key: key,
    created_by_user_id: null,
  });

  const storageObject = await createStorageObject(context.env.DB, {
    bucket: "documents",
    r2_key: key,
    file_name: file.name,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
    sha256: hash,
    category: "document",
    resource_type: dealId ? "deal" : "document",
    resource_id: dealId || document.id,
    visibility: "workspace",
    created_by: context.user.email,
  });

  const event = await createEvent(context.env.DB, {
    organization_id: "org_adga_primary",
    event_type: "document.uploaded",
    actor_type: "user",
    actor_id: context.user.email,
    resource_type: "document",
    resource_id: document.id,
    payload: {
      document_id: document.id,
      storage_object_id: storageObject.id,
      key,
      name: file.name,
      size: file.size,
      type: file.type,
      sha256: hash,
      deal_id: dealId,
      company_id: companyId,
      company_name: companyName,
      contact_name: contactName,
      folder,
    },
  });

  const job = await createAgentJob(context.env.DB, {
    agent: "documents",
    job_type: "document.ingested",
    input: {
      document_id: document.id,
      storage_object_id: storageObject.id,
      r2_key: key,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      deal_id: dealId,
      company_id: companyId,
      company_name: companyName,
      contact_name: contactName,
      folder,
      requested_by: context.user.email,
    },
  });

  return json({ ok: true, key, document, storage_object: storageObject, event, job });
}

async function sha256Hex(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function stringField(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function documentTypeFromName(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "PDF";
  if (ext === "doc" || ext === "docx") return "Document";
  if (ext === "xls" || ext === "xlsx" || ext === "csv") return "Spreadsheet";
  if (ext === "png" || ext === "jpg" || ext === "jpeg") return "Image";
  return "File";
}
