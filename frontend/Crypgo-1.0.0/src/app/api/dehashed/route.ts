// src/app/api/dehashed/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { domain } = await req.json();

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    const username = process.env.DEHASHED_USERNAME;
    const apiKey = process.env.DEHASHED_API_KEY;

    if (!username || !apiKey) {
      return NextResponse.json({ error: 'Missing DeHashed credentials' }, { status: 500 });
    }

    const query = encodeURIComponent(`domain:"${domain}"`);
    const url = `https://api.dehashed.com/search?query=${query}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${username}:${apiKey}`).toString('base64'),
        Accept: 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.message ?? 'DeHashed API error' }, { status: response.status });
    }

    const results = data.entries ?? [];
    const emails = results.map((entry: any) => entry.email).filter((email: string | null) => !!email);

    return NextResponse.json({ emails });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? 'Internal Server Error' }, { status: 500 });
  }
}
