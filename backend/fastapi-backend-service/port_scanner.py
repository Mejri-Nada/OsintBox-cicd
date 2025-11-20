import re
import asyncio
import httpx
from typing import Dict, List, Any, Optional

# ==========================================================
# Port Scanning Feature
# ==========================================================

# All external API sources have been commented out.
# SCAN_SOURCES = {
#     "HACKERTARGET": 'https://api.hackertarget.com/nmap/?q=',
#     "VIEWDNS": 'https://api.viewdns.info/portscan/?host=',
#     "WEBHACK": 'https://webhack.io/nmap-api?target='
# }

def is_valid_ipv4_address(ip: str) -> bool:
    """Helper to check if a string is a valid IPv4 address."""
    return bool(re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', ip))

async def resolve_domain_to_ip(domain: str) -> Optional[str]:
    """Resolves a domain name to an IP address using Cloudflare DNS over HTTPS."""
    if is_valid_ipv4_address(domain):
        return domain

    try:
        async with httpx.AsyncClient() as client:
            # Increased timeout for DNS resolution
            dns_response = await client.get(
                f"https://cloudflare-dns.com/dns-query?name={domain}&type=A",
                headers={'accept': 'application/dns-json'},
                timeout=10.0 # Increased timeout
            )
            dns_response.raise_for_status()
            dns_data = dns_response.json()
            if dns_data and dns_data.get('Answer') and len(dns_data['Answer']) > 0:
                ip = dns_data['Answer'][0]['data']
                print(f"Resolved {domain} to IP: {ip}")
                return ip
            print(f"DNS resolution found no A records for {domain}.")
            return None
    except httpx.HTTPStatusError as e:
        print(f"DNS resolution HTTP error for {domain}: {e.response.status_code} - {e.response.text}")
        return None
    except httpx.RequestError as e:
        print(f"DNS resolution request error for {domain}: {e}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred during DNS resolution for {domain}: {e}")
        return None

async def check_single_port_python(ip: str, port: int, timeout: float = 2.0) -> Dict[str, Any]:
    """Checks if a single TCP port is open."""
    try:
        _, writer = await asyncio.wait_for(
            asyncio.open_connection(ip, port),
            timeout=timeout
        )
        writer.close()
        await writer.wait_closed()
        print(f"Port {port} on {ip} is OPEN (local check).")
        return {"port": port, "open": True}
    except (asyncio.TimeoutError, ConnectionRefusedError, OSError) as e:
        return {"port": port, "open": False}
    except Exception as e:
        print(f"Error checking port {port} on {ip}: {e}")
        return {"port": port, "open": False}

async def local_port_check_python(ip: str) -> Dict[str, Any]:
    """Performs a local TCP port scan on common ports."""
    common_ports = [
        21, 22, 23, 25, 53, 80, 110, 143,
        443, 465, 587, 993, 995, 3306, 3389,
        8080, 8443
    ]
    print(f"Starting local port check for IP: {ip} on common ports.")

    # Run checks concurrently
    results = await asyncio.gather(
        *[check_single_port_python(ip, port) for port in common_ports]
    )
    
    open_ports = [r['port'] for r in results if r['open']]
    services = []
    for r in results:
        if r['open']:
            port = r['port']
            protocol = 'tcp'
            service_name = 'unknown'
            if port == 21: service_name = 'ftp'
            elif port == 22: service_name = 'ssh'
            elif port == 23: service_name = 'telnet'
            elif port == 25: service_name = 'smtp'
            elif port == 53: service_name = 'dns'
            elif port == 80: service_name = 'http'; protocol = 'http'
            elif port == 110: service_name = 'pop3'
            elif port == 143: service_name = 'imap'
            elif port == 443: service_name = 'https'; protocol = 'https'
            elif port == 465: service_name = 'smtps'; protocol = 'ssl/tls'
            elif port == 587: service_name = 'submission'; protocol = 'smtp'
            elif port == 993: service_name = 'imaps'; protocol = 'ssl/tls'
            elif port == 995: service_name = 'pop3s'; protocol = 'ssl/tls'
            elif port == 3306: service_name = 'mysql'
            elif port == 3389: service_name = 'rdp'
            elif port == 8080: service_name = 'http-alt'; protocol = 'http'
            elif port == 8443: service_name = 'https-alt'; protocol = 'https'
            services.append({"port": port, "protocol": protocol, "service": service_name})

    print(f"Local port check completed for {ip}. Found {len(open_ports)} open ports.")
    return {
        "source": "local-check",
        "ports": open_ports,
        "services": services,
        "note": "Performed local check on common ports."
    }

async def run_port_scan(target: str) -> Dict[str, Any]:
    """
    Receives a target (domain or IP) and performs a local port scan.
    """
    print(f"Port scan request received for target: {target}")

    # 1. Resolve domain to IP if needed
    ip = target
    if not is_valid_ipv4_address(target):
        print(f"Attempting to resolve domain: {target}")
        resolved_ip = await resolve_domain_to_ip(target)
        if resolved_ip:
            ip = resolved_ip
            print(f"Resolved {target} to IP: {ip}")
        else:
            error_msg = f"Could not resolve domain '{target}' to IP. Scan cannot proceed."
            print(error_msg)
            return {"status": "error", "error": error_msg, "note": "DNS resolution failed."}
    else:
        print(f"Target is already an IP address: {ip}")

    # Directly call the local port check
    scan_result = await local_port_check_python(ip)
    final_note = scan_result.get('note', 'Scan completed')

    return {
        "status": "success",
        "target": target,
        "ip": ip,
        "source": scan_result.get('source', 'local-check'),
        "ports": scan_result.get('ports', []),
        "services": scan_result.get('services', []),
        "note": final_note
    }

async def main():
    """Example usage of the run_port_scan function."""
    print("Running port scan for 'scanme.nmap.org'...")
    results = await run_port_scan("scanme.nmap.org")
    print("\n--- Scan Results ---")
    print(f"Status: {results['status']}")
    print(f"Target: {results['target']} (IP: {results['ip']})")
    print(f"Source: {results['source']}")
    print(f"Note: {results['note']}")
    print("Open Ports:")
    if results['ports']:
        for service in results['services']:
            print(f"  - Port: {service['port']}, Protocol: {service['protocol']}, Service: {service['service']}")
    else:
        print("  - No open ports found.")
    print("--------------------")

if __name__ == "__main__":
    asyncio.run(main())
