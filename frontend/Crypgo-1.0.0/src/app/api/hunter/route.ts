// src/app/api/hunter/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { domain } = await req.json();

    if (!domain) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 });
    }

    const apiKey = process.env.HUNTER_API_KEY;
    const limit = 10;
    let offset = 0;
    let total = 0;
    let allEmails: string[] = [];

    do {
      const url = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({ error: `Hunter API error: ${errorText}` }, { status: response.status });
      }

      const data = await response.json();
      const emails = (data.data.emails ?? []).map((entry: any) => entry.value);
      allEmails.push(...emails);

      total = data.data.total ?? 0;
      offset += limit;
    } while (offset < total);

    return NextResponse.json({ emails: Array.from(new Set(allEmails)) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Internal Server Error" }, { status: 500 });
  }
}
