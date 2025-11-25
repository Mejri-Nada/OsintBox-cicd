import { NextResponse } from 'next/server';
import net from 'net'; // Import Node.js net module for raw TCP checks

export async function POST(req: Request) {
  try {
    const { target } = await req.json();

    // 1. Validate input: Ensure a target is provided.
    if (!target) {
      console.log('API call received with no target.');
      return NextResponse.json(
        { error: 'Target is required (domain or IP)' },
        { status: 400 }
      );
    }

    console.log(`Port scan request received for target: ${target}`);

    // 2. Resolve domain to IP if a domain name is provided.
    let ip = target;
    const isIpAddress = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(target);
    if (!isIpAddress) {
      console.log(`Attempting to resolve domain: ${target}`);
      try {
        const dnsResponse = await fetch(
          `https://cloudflare-dns.com/dns-query?name=${target}&type=A`,
          { headers: { 'accept': 'application/dns-json' } }
        );
        if (!dnsResponse.ok) {
          const errorDetail = await dnsResponse.text();
          throw new Error(`DNS resolution failed with status: ${dnsResponse.status} - ${errorDetail}`);
        }
        const dnsData = await dnsResponse.json();
        if (dnsData.Answer && dnsData.Answer.length > 0) {
            ip = dnsData.Answer[0].data;
            console.log(`Resolved ${target} to IP: ${ip}`);
        } else {
            console.warn(`DNS resolution found no A records for ${target}. Proceeding with original target string.`);
            ip = target;
        }
      } catch (dnsError: any) {
        console.error(`DNS resolution error for ${target}:`, dnsError.message);
        return NextResponse.json(
            {
                status: 'error',
                error: `Could not resolve domain to IP: ${dnsError.message}.`,
                note: 'DNS resolution failed. Scan cannot proceed without a valid IP.'
            },
            { status: 500 }
        );
      }
    } else {
        console.log(`Target is already an IP address: ${ip}`);
    }

    // 3. Directly run the local port check. All external API calls have been removed.
    console.log('Running local check for open ports.');
    let scanResult;
    try {
        scanResult = await localPortCheck(ip);
        console.log(`Local check found ${scanResult.ports.length} open ports.`);
    } catch (localError: any) {
        console.error('Local port check failed:', localError.message);
        scanResult = { ports: [], services: [], note: 'Local scan failed' };
    }

    // 4. Return the final, simplified result.
    return NextResponse.json({
      status: 'success',
      target,
      ip,
      source: 'local-check',
      ports: scanResult.ports || [],
      services: scanResult.services || [],
      note: scanResult.note || 'Local scan completed'
    });

  } catch (error: any) {
    console.error('Overall API error in POST handler:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error.message ?? 'Scan failed unexpectedly',
        note: 'An unhandled error occurred during the scan process.'
      },
      { status: 500 }
    );
  }
}

// ======================
// Local Fallback Checker (Using Node.js 'net' module for reliability)
// ======================

async function localPortCheck(ip: string) {
  // Common ports to check. This list can be expanded or modified.
  const commonPorts = [
    21, 22, 23, 25, 53, 80, 110, 143,
    443, 465, 587, 993, 995, 3306, 3389,
    8080, 8443,
    4000, 4500, 5000, 5400
  ];
  console.log(`Starting local port check for IP: ${ip} on common ports.`);

  // Check all ports concurrently using Promise.all for speed.
  const results = await Promise.all(
    commonPorts.map(port => checkSinglePort(ip, port))
  );

  const openPorts = results.filter(r => r.open).map(r => r.port);
  const services = results.filter(r => r.open).map(r => {
      let protocol = 'tcp';
      let service: string;
      switch (r.port) {
        case 21: service = 'ftp'; break;
        case 22: service = 'ssh'; break;
        case 23: service = 'telnet'; break;
        case 25: service = 'smtp'; break;
        case 53: service = 'dns'; break;
        case 80: service = 'http'; protocol = 'http'; break;
        case 110: service = 'pop3'; break;
        case 143: service = 'imap'; break;
        case 443: service = 'https'; protocol = 'https'; break;
        case 465: service = 'smtps'; protocol = 'ssl/tls'; break;
        case 587: service = 'submission'; protocol = 'smtp'; break;
        case 993: service = 'imaps'; protocol = 'ssl/tls'; break;
        case 995: service = 'pop3s'; protocol = 'ssl/tls'; break;
        case 3306: service = 'mysql'; break;
        case 3389: service = 'rdp'; break;
        case 8080: service = 'http-alt'; protocol = 'http'; break;
        case 8443: service = 'https-alt'; protocol = 'https'; break;
        case 4000: service = 'http-alt-4000'; protocol = 'http'; break;
        case 4500: service = 'ipsec-nat-t'; break;
        case 5000: service = 'upnp-http'; protocol = 'http'; break;
        case 5400: service = 'collab'; break;
        default: service = 'unknown'; break;
      }
      return {
        port: r.port,
        protocol,
        service
      };
    });

  console.log(`Local port check completed for ${ip}. Found ${openPorts.length} open ports.`);
  return {
    source: 'local-check',
    ports: openPorts,
    services: services,
    note: 'Performed local check on common ports.'
  };
}

// Helper function to check a single port using a raw TCP connection.
async function checkSinglePort(ip: string, port: number): Promise<{ port: number, open: boolean }> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 2000; // 2 seconds timeout for each port

    socket.setTimeout(timeout);

    socket.once('connect', () => {
      console.log(`Port ${port} on ${ip} is OPEN (local check).`);
      socket.destroy(); // Close the socket immediately
      resolve({ port, open: true });
    });

    socket.once('timeout', () => {
      socket.destroy();
      resolve({ port, open: false });
    });

    socket.once('error', () => {
      socket.destroy();
      resolve({ port, open: false });
    });

    socket.connect(port, ip);
  });
}
