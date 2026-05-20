import { NextResponse } from "next/server";
export function GET() {
  return NextResponse.json({
    ok: true,
    platform: "ADGA Suite",
    status: "ready",
  });
}
