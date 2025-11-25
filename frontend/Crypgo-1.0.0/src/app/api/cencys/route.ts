// src/app/api/censys/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { ip } = await req.json();

    if (!ip) {
      return NextResponse.json({ error: "IP address is required" }, { status: 400 });
    }

    const apiId = process.env.CENSYS_API_ID;
    const apiSecret = process.env.CENSYS_API_SECRET;
    
    if (!apiId || !apiSecret) {
      return NextResponse.json({ error: "Censys API credentials not configured" }, { status: 500 });
    }

    // Fetch host data
    const hostResponse = await fetch(`https://search.censys.io/api/v2/hosts/${ip}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${apiId}:${apiSecret}`).toString('base64')}`,
      },
    });

    if (!hostResponse.ok) {
      const error = await hostResponse.json();
      return NextResponse.json({ error: error.error || "Censys API error" }, { status: hostResponse.status });
    }

    const hostData = await hostResponse.json();

    // Process services
    const services = hostData.result.services?.map((service: any) => ({
      port: service.port,
      transport_protocol: service.transport_protocol,
      service_name: service.service_name,
      banner: service.banner,
      software: service.software,
      certificates: service.certificates
    })) || [];

    // Process certificates
    const certificates = hostData.result.certificates?.map((cert: any) => ({
      fingerprint_sha256: cert.fingerprint_sha256,
      issuer_dn: cert.parsed.issuer_dn,
      subject_dn: cert.parsed.subject_dn,
      validity: {
        start: cert.parsed.validity.start,
        end: cert.parsed.validity.end
      },
      parsed: cert.parsed
    })) || [];

    // Process vulnerabilities
    const vulnerabilities = hostData.result.vulnerabilities?.map((vuln: any) => ({
      id: vuln.id,
      summary: vuln.summary,
      details: vuln.details
    })) || [];

    return NextResponse.json({
      ip,
      services,
      certificates,
      vulnerabilities,
      location: hostData.result.location,
      autonomous_system: hostData.result.autonomous_system,
      last_updated: hostData.result.last_updated
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || "Internal Server Error" 
    }, { status: 500 });
  }
}