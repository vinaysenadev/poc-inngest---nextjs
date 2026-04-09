import { NextResponse } from "next/server";
import { resetAllLocks } from "@/lib/lock";

export async function POST() {
  await resetAllLocks();
  return NextResponse.json({ message: "Database cleaned! All locks released." });
}
