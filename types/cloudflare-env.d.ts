import type { CloudflareAI } from "@/lib/ai/cloudflare-worker-ai";

declare global {
  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    first<T = Record<string, unknown>>(): Promise<T | null>;
    all<T = Record<string, unknown>>(): Promise<{ results?: T[]; success: boolean }>;
    run(): Promise<{ success: boolean; meta?: unknown }>;
  }

  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    exec(query: string): Promise<{ count: number; duration: number }>;
  }

  interface R2ObjectBody {
    key: string;
    size: number;
    uploaded: Date;
    httpEtag: string;
  }

  interface R2Bucket {
    put(key: string, value: ArrayBuffer | ArrayBufferView | string | ReadableStream, options?: Record<string, unknown>): Promise<R2ObjectBody>;
    get(key: string): Promise<R2ObjectBody | null>;
    delete(key: string): Promise<void>;
  }

  interface CloudflareEnv {
    DB?: D1Database;
    DOCUMENTS_BUCKET?: R2Bucket;
    UPLOADS_BUCKET?: R2Bucket;
    ASSETS_BUCKET?: R2Bucket;
    AI?: CloudflareAI;
    ADGA_AI_MODEL?: string;
    ADGA_ADMIN_EMAIL?: string;
    ADGA_ADMIN_EMAILS?: string;
    ADGA_LOCAL_ADMIN_BYPASS?: string;
    POSTMARK_SERVER_TOKEN?: string;
    POSTMARK_FROM_EMAIL?: string;
    SMS_GATEWAY_URL?: string;
    SMS_GATEWAY_API_KEY?: string;
    SMS_GATEWAY_PROVIDER?: string;
    WHOP_API_KEY?: string;
    WHOP_WEBHOOK_SECRET?: string;
    WHOP_COMPANY_ID?: string;
    WHOP_REDIRECT_URL?: string;
    SESSION_SECRET?: string;
  }
}

export {};
