import { NextResponse } from 'next/server';
import punycode from 'node:punycode'; // Import Node.js's built-in punycode module

// Helper function to check if a string is a valid IPv4 address
function isValidIpAddress(ip: string): boolean {
  // Regex to validate IPv4 address format
  // Corrected regex: removed the inner redundant non-capturing group and duplicate '?'
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv4Regex.test(ip);
}

/**
 * Normalizes a domain name for DNS resolution.
 * - Converts IDNs (internationalized domain names) to Punycode.
 * - Filters out domains with invalid structures (e.g., consecutive dots).
 * @param domain The domain string to normalize.
 * @returns The normalized domain string, or null if it's invalid.
 */
function normalizeDomainForDNS(domain: string): string | null {
    // 1. Basic check for consecutive dots, which are invalid in domain names
    if (domain.includes('..')) {
        return null;
    }

    // 2. Attempt Punycode conversion for Internationalized Domain Names (IDN)
    try {
        const punycodeDomain = punycode.toASCII(domain);
        // Basic validation after Punycode conversion to ensure it's not empty or malformed
        if (!punycodeDomain || punycodeDomain.includes('..') || punycodeDomain.startsWith('-') || punycodeDomain.endsWith('-')) {
            return null;
        }
        return punycodeDomain;
    } catch (e: any) {
        // Punycode conversion can throw errors for malformed IDNs
        return null;
    }
}


/**
 * Attempts to resolve a domain to an IP address using Cloudflare DNS.
 * Includes a timeout for the fetch request.
 * @param domain The domain string to resolve (assumed to be normalized or valid for Punycode conversion).
 * @returns The resolved IP address as a string, or null if resolution fails.
 */
async function attemptResolveDomainToIP(domain: string): Promise<string | null> {
  // If the "domain" is already an IP address, return it directly
  if (isValidIpAddress(domain)) {
    return domain;
  }

  // Normalize the domain before attempting DNS resolution
  const normalizedDomain = normalizeDomainForDNS(domain);
  if (!normalizedDomain) {
      return null;
  }

  try {
    const dnsResponse = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${normalizedDomain}&type=A`,
      { 
        headers: { 'accept': 'application/dns-json' },
        signal: AbortSignal.timeout(15000) // Increased timeout to 15 seconds
      }
    );
    
    if (!dnsResponse.ok) {
      const errorText = await dnsResponse.text();
      console.error(`DNS resolution failed for ${domain} (normalized: ${normalizedDomain}) with status: ${dnsResponse.status} ${dnsResponse.statusText}. Response text: ${errorText}`);
      return null;
    }
    const dnsData = await dnsResponse.json();
    return dnsData.Answer?.[0]?.data || null;
  } catch (error: any) {
    if (error.name === 'TimeoutError') {
      console.error(`Error resolving domain ${domain} (normalized: ${normalizedDomain}): DNS resolution timed out.`);
    } else if (error.code === 'UND_ERR_CONNECT_TIMEOUT' || (error.cause && error.cause.code === 'ECONNRESET')) {
      // Catch specific connection timeout/reset errors from Node.js fetch
      console.error(`Error resolving domain ${domain} (normalized: ${normalizedDomain}): Connect Timeout or Connection Reset. Details: ${error.message}.`);
      throw error; // Re-throw for retry logic
    } else if (error instanceof TypeError && error.message === 'fetch failed') {
      // Catch generic 'fetch failed' TypeErrors that often wrap underlying network issues
      console.error(`Error resolving domain ${domain} (normalized: ${normalizedDomain}): Fetch failed due to network issue. Details: ${error.message}.`);
      throw error; // Re-throw for retry logic
    } else {
      console.error(`Error resolving domain ${domain} (normalized: ${normalizedDomain}): ${error.message || 'Unknown error'}.`);
    }
    throw error; // Re-throw the error so retry logic can catch it
  }
}

/**
 * Resolves a domain to an IP address with retry logic for transient errors.
 * @param domain The domain string to resolve.
 * @param maxRetries Maximum number of retries.
 * @param retryDelayMinMs Minimum delay between retries in milliseconds.
 * @param retryDelayMaxMs Maximum delay between retries in milliseconds.
 * @returns The resolved IP address as a string, or null if all attempts fail.
 */
async function resolveDomainToIP(domain: string, maxRetries: number = 5, retryDelayMinMs: number = 1000, retryDelayMaxMs: number = 5000): Promise<string | null> {
    const normalizedDomain = normalizeDomainForDNS(domain);
    if (!normalizedDomain) {
        console.warn(`Skipping DNS resolution for invalid/un-normalizable domain: ${domain}`);
        return null;
    }

    for (let i = 0; i <= maxRetries; i++) {
        try {
            const ip = await attemptResolveDomainToIP(domain);
            return ip; // Successfully resolved
        } catch (error: any) {
            // Only retry for specific transient errors: TimeoutError, ECONNRESET, UND_ERR_CONNECT_TIMEOUT, or generic 'fetch failed' TypeError
            if (i < maxRetries && (
                error.name === 'TimeoutError' || 
                (error.cause && error.cause.code === 'ECONNRESET') || 
                error.code === 'UND_ERR_CONNECT_TIMEOUT' ||
                (error instanceof TypeError && error.message === 'fetch failed')
            )) {
                const delay = Math.floor(Math.random() * (retryDelayMaxMs - retryDelayMinMs + 1)) + retryDelayMinMs;
                console.warn(`Retrying DNS resolution for ${domain} (attempt ${i + 1}/${maxRetries}) after ${delay}ms delay...`);
                await new Promise(res => setTimeout(res, delay));
            } else {
                // For other errors or after max retries, return null
                console.error(`Failed to resolve domain ${domain} after ${i + 1} attempts.`);
                return null;
            }
        }
    }
    return null; // Should not be reached, but as a fallback
}


// ======================================================================
// Functions to fetch real phishing domain lists from free sources
// ======================================================================

// Source 1: CERT Polska Dangerous Websites Warning List
async function fetchCertPolskaDomains(): Promise<Set<string>> {
  const url = 'https://hole.cert.pl/domains/v2/domains.txt';
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      console.warn(`Failed to fetch from CERT Polska: ${response.status} ${response.statusText}`);
      return new Set();
    }
    const text = await response.text();
    // Normalize and filter domains as they are loaded
    const domains = new Set<string>();
    text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'))
        .forEach(d => {
            const normalized = normalizeDomainForDNS(d);
            if (normalized) domains.add(normalized);
        });
    console.log(`Fetched ${domains.size} domains from CERT Polska (after normalization).`);
    return domains;
  } catch (error) {
    console.error('Error fetching from CERT Polska:', error);
    return new Set();
  }
}

// Source 2: URLhaus (by abuse.ch)
async function fetchUrlhausDomains(): Promise<Set<string>> {
  const url = 'https://urlhaus.abuse.ch/downloads/csv_online/';
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      console.warn(`Failed to fetch from URLhaus: ${response.status} ${response.statusText}`);
      return new Set();
    }
    const text = await response.text();
    const domains = new Set<string>();
    text.split('\n').forEach(line => {
      if (line.startsWith('#') || line.trim() === '') {
        return;
      }
      const parts = line.split(',');
      if (parts.length > 2) {
        const urlString = parts[2].trim().replace(/^"|"$/g, ''); 
        try {
          const hostname = new URL(urlString).hostname;
          const normalized = normalizeDomainForDNS(hostname);
          if (normalized) domains.add(normalized);
        } catch (e) {
          // console.error(`Invalid URL from URLhaus (parsing hostname): ${urlString}`, e);
        }
      }
    });
    console.log(`Fetched ${domains.size} domains from URLhaus (after normalization).`);
    return domains;
  } catch (error) {
    console.error('Error fetching from URLhaus:', error);
    return new Set();
  }
}

// Source 3: OpenPhish Free Live Feed
async function fetchOpenPhishDomains(): Promise<Set<string>> {
  const url = 'https://openphish.com/feed.txt';
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      console.warn(`Failed to fetch from OpenPhish: ${response.status} ${response.statusText}`);
      return new Set();
    }
    const text = await response.text();
    const domains = new Set<string>();
    text.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.length > 0) {
        try {
          const urlObj = new URL(trimmedLine);
          const normalized = normalizeDomainForDNS(urlObj.hostname);
          if (normalized) domains.add(normalized);
        } catch (e) {
          // If it's not a valid URL, assume it's just a domain name and try to normalize
          const normalized = normalizeDomainForDNS(trimmedLine);
          if (normalized) domains.add(normalized);
        }
      }
    });
    console.log(`Fetched ${domains.size} domains from OpenPhish (after normalization).`);
    return new Set(domains);
  } catch (error) {
    console.error('Error fetching from OpenPhish:', error);
    return new Set();
  }
}

// ======================================================================
// Domain Variation Generation (dnstwist-like logic)
// ======================================================================

function generateDomainVariations(originalDomain: string): { variant: string; type: string }[] {
  const variations: { variant: string; type: string }[] = [];
  const parts = originalDomain.split('.');
  if (parts.length < 2) {
    return [];
  }
  const tld = parts.pop()!;
  let baseDomain = parts.join('.');
  baseDomain = baseDomain.toLowerCase();

  const addVariant = (variant: string, type: string) => {
    // Normalize and validate the variant before adding
    const normalizedVariant = normalizeDomainForDNS(variant);
    if (normalizedVariant && normalizedVariant !== originalDomain && !variations.some(v => v.variant === normalizedVariant)) {
      variations.push({ variant: normalizedVariant, type });
    }
  };

  const keyboardLayout = {
    'q': 'wa', 'w': 'qeas', 'e': 'wrdx', 'r': 'etfcd', 't': 'ryfgv',
    'y': 'tughb', 'u': 'yihjn', 'i': 'uojkm', 'o': 'ipkl', 'p': 'ol',
    'a': 'qwsz', 's': 'qazxcdew', 'd': 'wsxcvfrt', 'f': 'edcvgbhy', 'g': 'rfvbhnuj',
    'h': 'gtbnmjui', 'j': 'hyhnmkio', 'k': 'juimlkp', 'l': 'kiop',
    'z': 'asx', 'x': 'zsdcv', 'c': 'xfvbn', 'v': 'cdgbn', 'b': 'vfghn',
    'n': 'bhmju', 'm': 'njkiu',
    '1': 'q2', '2': '1q3w', '3': '2we4', '4': '3er5', '5': '4rt6', '6': '5ty7',
    '7': '6yu8', '8': '7ui9', '9': '8io0', '0': '9po'
  };

  for (let i = 0; i < baseDomain.length; i++) {
    const char = baseDomain[i];

    const omissionVariant = `${baseDomain.substring(0, i)}${baseDomain.substring(i + 1)}.${tld}`;
    if (omissionVariant.length > 0) addVariant(omissionVariant, 'omission');

    if (keyboardLayout[char as keyof typeof keyboardLayout]) {
        for (const adjacentChar of keyboardLayout[char as keyof typeof keyboardLayout]) {
            addVariant(`${baseDomain.substring(0, i + 1)}${adjacentChar}${baseDomain.substring(i + 1)}.${tld}`, 'insertion');
        }
    }
    addVariant(`${baseDomain.substring(0, i + 1)}0${baseDomain.substring(i + 1)}.${tld}`, 'insertion (digit-o)');
    addVariant(`${baseDomain.substring(0, i + 1)}1${baseDomain.substring(i + 1)}.${tld}`, 'insertion (digit-l/i)');
    addVariant(`${baseDomain.substring(0, i + 1)}3${baseDomain.substring(i + 1)}.${tld}`, 'insertion (digit-e)');
    addVariant(`${baseDomain.substring(0, i + 1)}@${baseDomain.substring(i + 1)}.${tld}`, 'insertion (symbol-a)');


    addVariant(`${baseDomain.substring(0, i + 1)}${char}${baseDomain.substring(i + 1)}.${tld}`, 'repetition');

    if (keyboardLayout[char as keyof typeof keyboardLayout]) {
      for (const adjacentChar of keyboardLayout[char as keyof typeof keyboardLayout]) {
        addVariant(`${baseDomain.substring(0, i)}${adjacentChar}${baseDomain.substring(i + 1)}.${tld}`, 'substitution (keyboard)');
      }
    }
    addVariant(`${baseDomain.substring(0, i)}0${baseDomain.substring(i + 1)}.${tld}`, 'substitution (digit-o)');
    addVariant(`${baseDomain.substring(0, i)}1${baseDomain.substring(i + 1)}.${tld}`, 'substitution (digit-l/i)');
    addVariant(`${baseDomain.substring(0, i)}3${baseDomain.substring(i + 1)}.${tld}`, 'substitution (digit-e)');
    addVariant(`${baseDomain.substring(0, i)}@${baseDomain.substring(i + 1)}.${tld}`, 'substitution (symbol-a)');
  }

  for (let i = 0; i < baseDomain.length - 1; i++) {
    const transposed = baseDomain.split('');
    [transposed[i], transposed[i + 1]] = [transposed[i + 1], transposed[i]];
    addVariant(`${transposed.join('')}.${tld}`, 'transposition');
  }

  const homoglyphs: { [key: string]: string[] } = {
    'a': ['а'], 'e': ['е'], 'o': ['о'], 'i': ['і', 'l'], 'l': ['1', 'i'],
    'c': ['с'], 'p': ['р'], 'x': ['х'], 'v': ['ν'],
  };

  for (let i = 0; i < baseDomain.length; i++) {
    const char = baseDomain[i];
    if (homoglyphs[char]) {
      for (const homoglyphChar of homoglyphs[char]) {
        const homoglyphVariant = `${baseDomain.substring(0, i)}${homoglyphChar}${baseDomain.substring(i + 1)}.${tld}`;
        addVariant(homoglyphVariant, 'homoglyph');
      }
    }
  }

  if (baseDomain.includes('.')) {
    const subParts = baseDomain.split('.');
    if (subParts.length > 1) {
      addVariant(`${subParts.join('-')}.${tld}`, 'hyphenation');
    }
  } else {
    for (let i = 1; i < baseDomain.length; i++) {
      addVariant(`${baseDomain.substring(0, i)}-${baseDomain.substring(i)}.${tld}`, 'hyphenation');
    }
  }

  const commonSubdomains = ['www', 'mail', 'blog', 'login', 'secure', 'admin', 'dev'];
  commonSubdomains.forEach(sub => {
    addVariant(`${sub}.${baseDomain}.${tld}`, 'subdomain addition');
    if (baseDomain.startsWith(sub + '.')) {
        addVariant(`${baseDomain.substring(sub.length + 1)}.${tld}`, 'subdomain removal');
    }
  });

  const commonTlds = ['com', 'org', 'net', 'info', 'biz', 'co', 'io', 'ai', 'xyz'];
  const typoTlds = {
    'com': ['coom', 'cm', 'con', 'cmo'],
    'net': ['nett', 'nt'],
    'org': ['orq', 'ogr'],
    'info': ['infor']
  };

  commonTlds.forEach(altTld => {
    if (altTld !== tld) {
      addVariant(`${baseDomain}.${altTld}`, 'TLD substitution (common)');
    }
  });

  if (typoTlds[tld as keyof typeof typoTlds]) {
    typoTlds[tld as keyof typeof typoTlds].forEach(typoTld => {
      addVariant(`${baseDomain}.${typoTld}`, 'TLD substitution (typo)');
    });
  }

  addVariant(`${baseDomain}${tld}`, 'dot removal');
  if (baseDomain.length > 2) {
      addVariant(`${baseDomain.substring(0,1)}.${baseDomain.substring(1)}.${tld}`, 'dot insertion');
  }

  return variations;
}


// ======================================================================
// Main POST handler
// ======================================================================

export async function POST(req: Request) {
  const { domain } = await req.json();

  if (!domain) {
    return NextResponse.json(
      { error: 'Domain is required for phishing scan' },
      { status: 400 }
    );
  }

  // Normalize the original domain upfront as well
  const normalizedOriginalDomain = normalizeDomainForDNS(domain);
  if (!normalizedOriginalDomain) {
      return NextResponse.json(
          { error: `Invalid original domain format: ${domain}` },
          { status: 400 }
      );
  }

  const originalIp = await resolveDomainToIP(normalizedOriginalDomain); // Now uses retry logic

  const textEncoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        // Fetch threat feeds into separate Sets (these are still in memory for lookups)
        const [certPolskaDomains, urlhausDomains, openPhishDomains] = await Promise.all([
          fetchCertPolskaDomains(),
          fetchUrlhausDomains(),
          fetchOpenPhishDomains(),
        ]);

        // Generate variants related to the *user's input domain*
        // generateDomainVariations now handles normalization internally for its output.
        const generatedVariants = generateDomainVariations(domain); 

        // Create a list of domains to perform DNS lookups and checks on.
        // This list will ONLY contain the original domain (normalized) and its generated variants,
        // significantly reducing the number of DNS lookups and the size of the processing queue.
        const domainsToProcess: { variant: string; type: string; isDirectlyRelatedToSearch: boolean }[] = [];

        // Add the normalized original domain to process
        domainsToProcess.push({ variant: normalizedOriginalDomain, type: 'original', isDirectlyRelatedToSearch: true });

        // Add all generated variants
        generatedVariants.forEach(({ variant, type }) => {
            domainsToProcess.push({ variant, type, isDirectlyRelatedToSearch: true });
        });

        console.log(`Checking ${domainsToProcess.length} directly related domains (original + generated variants)...`);

        const concurrencyLimit = 10;
        let activePromises: Promise<void>[] = [];

        for (const { variant, type } of domainsToProcess) {
          const promise = (async () => {
            // Introduce a random delay before each DNS lookup
            const randomDelay = Math.floor(Math.random() * (1000 - 200 + 1)) + 200; // 200ms to 1000ms delay
            await new Promise(resolve => setTimeout(resolve, randomDelay));

            const ip = await resolveDomainToIP(variant); // resolveDomainToIP now handles internal normalization and invalid checks
            const resolved = ip !== null;
            let isPhishing = false;
            let scanSource = '';
            let note = '';

            // Check if this variant exists in any of the *pre-loaded threat feed sets*
            // Note: The sets already contain normalized (Punycode) domains if applicable.
            let sourceIndicators = [];
            if (certPolskaDomains.has(variant)) sourceIndicators.push('CERT Polska');
            if (urlhausDomains.has(variant)) sourceIndicators.push('URLhaus');
            if (openPhishDomains.has(variant)) sourceIndicators.push('OpenPhish');

            if (sourceIndicators.length > 0) {
              // This domain is explicitly listed in a known threat feed
              isPhishing = true;
              scanSource = sourceIndicators.join(' / ') + ' (Known Threat Feed)';
              note = `Identified as a known phishing domain from ${scanSource}.`;
              if (resolved) {
                  note += ` Resolves to IP: ${ip}.`;
              } else {
                  note += ` Currently does not resolve.`;
              }
            } else if (variant === normalizedOriginalDomain) { // Check against the normalized original domain
                // The original domain is not considered phishing by default unless found in a feed
                isPhishing = false; // Default for original domain if not in feeds
                scanSource = 'Original Domain Lookup';
                note = `Original domain lookup.`;
                if (resolved) {
                    note += ` Resolves to IP: ${ip}.`;
                } else {
                    note += ` Does not resolve.`;
                }
            } else { // It's a generated variant, not found in direct threat feeds
              const resolvesToOriginalIp = resolved && ip === originalIp;

              // A generated variant is considered phishing if it resolves to the original IP
              // AND its type is a common phishing technique.
              isPhishing = resolvesToOriginalIp && (
                type === 'homoglyph' ||
                type === 'dot removal' ||
                type.startsWith('TLD substitution') ||
                type.includes('(digit)') ||
                type.includes('(symbol)') ||
                type === 'hyphenation' ||
                type === 'subdomain addition' ||
                type === 'subdomain removal' ||
                type === 'transposition' ||
                type === 'repetition' ||
                type === 'omission' ||
                type.includes('insertion') ||
                type.includes('substitution')
              );

              scanSource = 'Generated Variant (DNS Lookup)'; 
              if (isPhishing) {
                  note = `Potential Phishing (type: ${type}) - Resolves to original IP.`;
              } else if (resolved) {
                  note = `Resolved to IP: ${ip} (type: ${type}).`;
              } else {
                  note = `Does not resolve (type: ${type})`;
              }
            }

            const result = {
              variant,
              ip,
              isPhishing,
              resolved,
              note,
              type,
              scanSource,
              isDirectlyRelatedToSearch: true // All items in domainsToProcess are directly related to the user's search
            };

            // ONLY send the result if it is resolved, as per user's request.
            // The frontend will now filter/display based on isPhishing.
            if (result.resolved) { 
              controller.enqueue(textEncoder.encode(`data: ${JSON.stringify(result)}\n\n`));
              await new Promise(resolve => setTimeout(resolve, 0)); // Small delay to yield to event loop
            }
          })();

          activePromises.push(promise);

          // Manage concurrency: wait if we have too many active DNS lookups
          if (activePromises.length >= concurrencyLimit) {
            await Promise.race(activePromises);
            // Remove promises that have completed
            activePromises = activePromises.filter(p => {
              return Promise.race([p, Promise.resolve(false)]).then(val => val === false);
            });
          }
        }

        // Wait for all remaining DNS lookups and processing to complete
        await Promise.allSettled(activePromises);

        // Signal end of stream
        controller.close();

      } catch (error: any) {
        console.error('Phishing scan API error:', error);
        // Send an error event to the frontend
        controller.enqueue(textEncoder.encode(`event: error\ndata: ${JSON.stringify({ error: error.message || 'Failed to perform phishing scan.' })}\n\n`));
        controller.close();
      }
    },
    cancel() {
      // Handle client disconnecting if needed
      console.log('Client disconnected from SSE stream.');
    }
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
