import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  experimental: {
    cpus: 1,
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 1000,
  },
};

export default function config(phase: string): NextConfig {
  if (phase === PHASE_DEVELOPMENT_SERVER && process.env.ADGA_CLOUDFLARE_DEV_PROXY === "1") {
    initOpenNextCloudflareForDev();
  }

  return nextConfig;
}
