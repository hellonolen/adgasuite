import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  reactStrictMode: true
};

export default function config(phase: string): NextConfig {
  if (phase === PHASE_DEVELOPMENT_SERVER && process.env.ADGA_CLOUDFLARE_DEV_PROXY === "1") {
    initOpenNextCloudflareForDev();
  }

  return nextConfig;
}
