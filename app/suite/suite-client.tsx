"use client";

import dynamic from "next/dynamic";

const AdgaSuite = dynamic(() => import("@/components/adga/AdgaSuite"), {
  ssr: false,
});

export default function SuiteClient({ bootstrap = null }: { bootstrap?: any }) {
  return <AdgaSuite bootstrap={bootstrap} />;
}
