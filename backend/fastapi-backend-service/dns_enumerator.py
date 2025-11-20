import re
import asyncio
import httpx
import socket
import json
import idna
from typing import Dict, List, Any, Optional

# ==========================================================
# DNS Enumeration Feature
# ==========================================================

# Simple wordlist for subdomain brute-forcing
COMMON_SUBDOMAINS = [
    "www", "mail", "ftp", "blog", "dev", "test", "admin", "api", "webmail",
    "secure", "vpn", "m", "portal", "shop", "store", "cpanel", "autodiscover",
    "docs", "support", "help", "app", "dashboard", "status", "forum", "news"
]

def normalizeDomainForDNS(domain: str) -> Optional[str]:
    """
    Normalizes a domain name for DNS resolution.
    - Converts IDNs (internationalized domain names) to Punycode.
    - Filters out domains with invalid structures (e.g., consecutive dots).
    @param domain The domain string to normalize.
    @returns The normalized domain string, or None if it's invalid.
    """
    # 1. Basic check for consecutive dots, which are invalid in domain names
    if ".." in domain:
        return None

    # 2. Attempt Punycode conversion for Internationalized Domain Names (IDN)
    try:
        # Use idna.encode to convert IDN to Punycode.
        punycode_domain = idna.encode(domain).decode('ascii').lower()

        # Basic validation after Punycode conversion to ensure it's not empty or malformed
        if not punycode_domain or ".." in punycode_domain or punycode_domain.startswith('-') or punycode_domain.endswith('-'):
            return None
        return punycode_domain
    except idna.core.IDNAError as e:
        print(f"IDNA encoding failed for {domain}: {e}")
        return None
    except Exception as e:
        print(f"An unexpected error during domain normalization for {domain}: {e}")
        return None

async def get_dns_records(domain: str) -> Dict[str, Any]:
    """
    Performs various DNS record lookups for a given domain.
    """
    records = {
        "A": [], "AAAA": [], "MX": [], "NS": [], "TXT": [], "CNAME": [], "SOA": None, "PTR": []
    }
    
    cloudflare_doh = "https://cloudflare-dns.com/dns-query"
    async with httpx.AsyncClient() as client:
        query_types = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA"]

        for q_type in query_types:
            try:
                print(f"  Attempting to fetch {q_type} record for {domain}...")
                response = await client.get(
                    f"{cloudflare_doh}?name={domain}&type={q_type}",
                    headers={"Accept": "application/dns-json"},
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()
                
                if data.get("Answer"):
                    for answer in data["Answer"]:
                        if q_type == "SOA":
                            records["SOA"] = answer["data"]
                            print(f"    Found SOA: {answer['data']}")
                        elif q_type == "CNAME":
                            records["CNAME"].append({"name": answer["name"], "target": answer["data"]})
                            print(f"    Found CNAME: {answer['name']} -> {answer['data']}")
                        else:
                            records[q_type].append(answer["data"])
                            print(f"    Found {q_type}: {answer['data']}")
                else:
                    print(f"    No {q_type} records found for {domain}.")
            except httpx.RequestError as e:
                print(f"  Error fetching {q_type} record for {domain}: {e}. (Is {cloudflare_doh} reachable?)")
            except json.JSONDecodeError:
                print(f"  JSON decode error from {cloudflare_doh} for {domain}. Response was not valid JSON or empty.")
            except Exception as e:
                print(f"  An unexpected error during {q_type} lookup for {domain}: {e}")
    
    return records

async def discover_subdomains_crtsh(domain: str) -> List[str]:
    """
    Discovers subdomains using Certificate Transparency logs via crt.sh.
    """
    subdomains = set()
    print(f"  Attempting to discover subdomains from crt.sh for {domain}...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://crt.sh/?q=%25.{domain}&output=json",
                timeout=45.0 # crt.sh can be very slow
            )
            response.raise_for_status()
            certs = response.json()
            if not certs:
                print(f"    crt.sh returned no certificates for %%.{domain}.")
            for cert in certs:
                if 'common_name' in cert:
                    cn = cert['common_name']
                    if cn.endswith(f".{domain}") or cn == domain:
                        if cn.startswith('*.') and cn != domain: # Handle wildcard entries
                            subdomains.add(cn.lower().replace('*.', ''))
                        else:
                            subdomains.add(cn.lower())
                if 'name_value' in cert:
                    names = cert['name_value'].split('\n')
                    for name in names:
                        name = name.strip()
                        if name.startswith('*.') and name.endswith(f".{domain}"):
                            subdomains.add(name.lower().replace('*.', ''))
                        elif name.endswith(f".{domain}") or name == domain:
                            subdomains.add(name.lower())
            print(f"  Discovered {len(subdomains)} subdomains from crt.sh.")
    except httpx.RequestError as e:
        print(f"  Error fetching subdomains from crt.sh for {domain}: {e}. (Is crt.sh reachable?)")
    except json.JSONDecodeError:
        print(f"  JSON decode error from crt.sh for {domain}. Response was not valid JSON or empty.")
    except Exception as e:
        print(f"  An unexpected error during crt.sh subdomain discovery for {domain}: {e}")
    
    return list(subdomains)

async def perform_reverse_dns_lookup(ip_address: str) -> Optional[str]:
    """
    Performs a reverse DNS lookup (IP to domain name).
    """
    try:
        # Use a non-blocking way to perform reverse DNS
        hostname, _, _ = await asyncio.to_thread(socket.gethostbyaddr, ip_address)
        print(f"  Reverse DNS lookup for {ip_address} found: {hostname}")
        return hostname
    except (socket.herror, socket.gaierror) as e:
        return None
    except Exception as e:
        print(f"  An unexpected error during reverse DNS lookup for {ip_address}: {e}")
        return None

async def run_dns_enum(domain: str) -> Dict[str, Any]:
    """
    Performs DNS enumeration for a given domain, including record lookups
    and subdomain discovery, and returns data suitable for graph visualization.
    """
    domain = domain.lower().strip()
    
    print(f"Starting DNS enumeration for domain: {domain}")

    nodes = []
    links = []
    
    node_map = {}
    next_node_id = 0

    def add_node(node_type: str, value: str, label: Optional[str] = None) -> int:
        nonlocal next_node_id
        normalized_value = value.lower().strip()
        if normalized_value not in node_map:
            node_id = next_node_id
            node_map[normalized_value] = node_id
            nodes.append({"id": node_id, "type": node_type, "value": normalized_value, "label": label or value})
            next_node_id += 1
        return node_map[normalized_value]

    main_domain_id = add_node("domain", domain, label=domain)
    print(f"Added main domain node: {domain} (ID: {main_domain_id})")

    main_dns_records = await get_dns_records(domain)
    print(f"Main DNS records for {domain} fetched: {main_dns_records}")

    for ip in main_dns_records["A"]:
        ip_id = add_node("ip_v4", ip)
        links.append({"source": main_domain_id, "target": ip_id, "type": "A_record"})
        print(f"  Linked {domain} (A) to IP {ip}")
        hostname = await perform_reverse_dns_lookup(ip)
        if hostname and hostname.lower() != domain:
            hostname_id = add_node("domain", hostname)
            links.append({"source": ip_id, "target": hostname_id, "type": "PTR_record"})
            print(f"    Linked IP {ip} (PTR) to domain {hostname}")

    for ip in main_dns_records["AAAA"]:
        ip_id = add_node("ip_v6", ip)
        links.append({"source": main_domain_id, "target": ip_id, "type": "AAAA_record"})
        print(f"  Linked {domain} (AAAA) to IP {ip}")

    for mx_record in main_dns_records["MX"]:
        mx_hostname_match = re.match(r'\d+\s+(.*)', mx_record)
        mx_hostname = mx_hostname_match.group(1).strip('.') if mx_hostname_match else mx_record.strip('.')
        mx_hostname = mx_hostname.lower()

        mx_id = add_node("mail_server", mx_hostname)
        links.append({"source": main_domain_id, "target": mx_id, "type": "MX_record"})
        print(f"  Linked {domain} (MX) to mail server {mx_hostname}")
        mx_ip = await run_port_scan_resolve_domain_to_ip(mx_hostname)
        if mx_ip:
            mx_ip_id = add_node("ip_v4", mx_ip)
            links.append({"source": mx_id, "target": mx_ip_id, "type": "A_record"})
            print(f"    Linked mail server {mx_hostname} (A) to IP {mx_ip}")
            hostname = await perform_reverse_dns_lookup(mx_ip)
            if hostname and hostname.lower() != mx_hostname:
                hostname_id = add_node("domain", hostname)
                links.append({"source": mx_ip_id, "target": hostname_id, "type": "PTR_record"})
                print(f"      Linked IP {mx_ip} (PTR) to domain {hostname}")


    for ns_record in main_dns_records["NS"]:
        ns_hostname = ns_record.strip('.').lower()
        ns_id = add_node("name_server", ns_hostname)
        links.append({"source": main_domain_id, "target": ns_id, "type": "NS_record"})
        print(f"  Linked {domain} (NS) to name server {ns_hostname}")
        ns_ip = await run_port_scan_resolve_domain_to_ip(ns_hostname)
        if ns_ip:
            ns_ip_id = add_node("ip_v4", ns_ip)
            links.append({"source": ns_id, "target": ns_ip_id, "type": "A_record"})
            print(f"    Linked name server {ns_hostname} (A) to IP {ns_ip}")
            hostname = await perform_reverse_dns_lookup(ns_ip)
            if hostname and hostname.lower() != ns_hostname:
                hostname_id = add_node("domain", hostname)
                links.append({"source": ns_ip_id, "target": hostname_id, "type": "PTR_record"})
                print(f"      Linked IP {ns_ip} (PTR) to domain {hostname}")


    if main_dns_records["TXT"]:
        txt_data = "\n".join(main_dns_records["TXT"])
        for node in nodes:
            if node["id"] == main_domain_id:
                node["txt_records"] = txt_data
                print(f"  Added TXT records to main domain node.")
                break

    for cname_entry in main_dns_records["CNAME"]:
        cname_name = cname_entry["name"].strip('.').lower()
        cname_target = cname_entry["target"].strip('.').lower()
        
        cname_origin_id = add_node("domain", cname_name)
        cname_target_id = add_node("domain", cname_target)
        
        links.append({"source": cname_origin_id, "target": cname_target_id, "type": "CNAME_record"})
        print(f"  Linked {cname_name} (CNAME) to {cname_target}")
        
        if cname_name == domain:
            links.append({"source": main_domain_id, "target": cname_origin_id, "type": "CNAME_alias"})
            print(f"    Added CNAME alias link from {domain} to {cname_name}")

        cname_target_ip = await run_port_scan_resolve_domain_to_ip(cname_target)
        if cname_target_ip:
            cname_target_ip_id = add_node("ip_v4", cname_target_ip)
            links.append({"source": cname_target_id, "target": cname_target_ip_id, "type": "A_record"})
            print(f"    Linked CNAME target {cname_target} (A) to IP {cname_target_ip}")


    print(f"Starting subdomain discovery for: {domain}")
    discovered_subdomains = set()

    for sub in COMMON_SUBDOMAINS:
        full_subdomain = f"{sub}.{domain}"
        if normalizeDomainForDNS(full_subdomain):
            discovered_subdomains.add(full_subdomain)
    
    crtsh_subdomains = await discover_subdomains_crtsh(domain)
    for sub in crtsh_subdomains:
        if sub != domain:
            if normalizeDomainForDNS(sub):
                discovered_subdomains.add(sub)
            
    for subdomain in discovered_subdomains:
        if subdomain != domain:
            subdomain_id = add_node("subdomain", subdomain)
            links.append({"source": main_domain_id, "target": subdomain_id, "type": "has_subdomain"})
            print(f"  Linked main domain to discovered subdomain: {subdomain}")

            sub_ip = await run_port_scan_resolve_domain_to_ip(subdomain)
            if sub_ip:
                sub_ip_id = add_node("ip_v4", sub_ip)
                links.append({"source": subdomain_id, "target": sub_ip_id, "type": "A_record"})
                print(f"    Linked subdomain {subdomain} (A) to IP {sub_ip}")
                hostname = await perform_reverse_dns_lookup(sub_ip)
                if hostname and hostname.lower() != subdomain:
                    hostname_id = add_node("domain", hostname)
                    links.append({"source": sub_ip_id, "target": hostname_id, "type": "PTR_record"})
                    print(f"      Linked IP {sub_ip} (PTR) to domain {hostname}")
            
            await asyncio.sleep(0.05)

    graph_data = {
        "nodes": nodes,
        "links": links
    }
    print(f"DNS enumeration completed for {domain}. Found {len(nodes)} nodes and {len(links)} links.")
    
    return graph_data

async def main():
    """Example usage of the run_dns_enum function."""
    print("Running DNS enumeration for 'google.com'...")
    results = await run_dns_enum("google.com")
    print("\n--- DNS Enumeration Results ---")
    print(f"Found {len(results['nodes'])} nodes.")
    print(f"Found {len(results['links'])} links.")
    print("Nodes:")
    for node in results['nodes'][:5]: # Print first 5 nodes for brevity
        print(f"  - {node['type']}: {node['value']} (ID: {node['id']})")
    print("...")
    print("Links:")
    for link in results['links'][:5]: # Print first 5 links for brevity
        print(f"  - Source: {link['source']}, Target: {link['target']}, Type: {link['type']}")
    print("...")
    print("--------------------")

if __name__ == "__main__":
    asyncio.run(main())
