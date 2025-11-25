// src/app/api/virustotal/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { domain } = await req.json();

    if (!domain) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 });
    }

    const apiKey = process.env.VIRUSTOTAL_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing VirusTotal API key" }, { status: 500 });
    }

    let subdomainsWithIPs: {subdomain: string, ip: string|null}[] = [];
    let url = `https://www.virustotal.com/api/v3/domains/${domain}/subdomains?limit=40`;

    while (url) {
      const response = await fetch(url, {
        headers: { "x-apikey": apiKey },
      });

      if (!response.ok) {
        const text = await response.text();
        return NextResponse.json({ error: `VirusTotal API error: ${text}` }, { status: response.status });
      }

      const data = await response.json();
      
      // Process each subdomain to get IP
      for (const entry of data.data || []) {
        const subdomain = entry.id;
        let ipAddress = null;
        
        // Get IP resolution if available
        const resolutions = entry.attributes?.last_dns_records?.filter(
          (r: any) => r.type === "A" || r.type === "AAAA"
        );
        
        if (resolutions?.length > 0) {
          ipAddress = resolutions[0].value;
        }
        
        subdomainsWithIPs.push({ subdomain, ip: ipAddress });
      }

      // Check if there's a next page
      url = data.links?.next || null;
    }

    return NextResponse.json({ 
      subdomains: subdomainsWithIPs.map(item => item.subdomain),
      ips: subdomainsWithIPs.map(item => item.ip),
      detailed: subdomainsWithIPs 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || "Internal Server Error" 
    }, { status: 500 });
  }
}