"use client";

import dynamic from "next/dynamic";

const AdgaSuite = dynamic(() => import("@/components/adga/AdgaSuite"), {
  ssr: false,
});

export default function SuiteClient() {
  return <AdgaSuite />;
}
