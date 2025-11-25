// src/app/api/leaklookup/route.ts
import { NextRequest, NextResponse } from "next/server";

const LEAK_LOOKUP_API_KEY = process.env.LEAK_LOOKUP_API_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const res = await fetch("https://leak-lookup.com/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `key=${LEAK_LOOKUP_API_KEY}&type=email&query=${encodeURIComponent(email)}`,
    });

    const data = await res.json();

    if (!data.success || !data.found) {
      return NextResponse.json({ results: [] });
    }

    const result = data.result ?? [];
    return NextResponse.json({ results: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unexpected error" }, { status: 500 });
  }
}