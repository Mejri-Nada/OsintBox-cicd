// src/app/api/breachdirectory/route.ts
import { NextRequest, NextResponse } from "next/server";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY!;
const RAPIDAPI_HOST = "breachdirectory.p.rapidapi.com";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const url = `https://breachdirectory.p.rapidapi.com/?func=auto&term=${encodeURIComponent(email)}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `BreachDirectory API error: ${err}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unexpected error" }, { status: 500 });
  }
}
