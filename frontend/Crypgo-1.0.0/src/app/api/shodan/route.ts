// src/app/api/shodan/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { ip } = await req.json();

    if (!ip) {
      return NextResponse.json({ error: "IP address is required" }, { status: 400 });
    }

    const apiKey = process.env.SHODAN_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing Shodan API key" }, { status: 500 });
    }

    const response = await fetch(`https://api.shodan.io/shodan/host/${ip}?key=${apiKey}`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ 
        error: `Shodan API error: ${text}` 
      }, { status: response.status });
    }

    const data = await response.json();
    
    // Extract relevant port information
    const ports = data.ports || [];
    const services = (data.data || []).map((service: any) => ({
      port: service.port,
      protocol: service.transport,
      product: service.product || 'Unknown',
      version: service.version || null,
      cpe: service.cpe || null
    }));

    return NextResponse.json({ 
      ip,
      ports,
      services,
      isp: data.isp,
      org: data.org,
      lastSeen: data.last_update
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || "Internal Server Error" 
    }, { status: 500 });
  }
}