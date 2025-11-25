import { NextResponse } from 'next/server';

// This API route will fetch WHOIS information for a given domain
// and extract email addresses from the response.

export async function POST(req: Request) {
  try {
    const { domain } = await req.json();

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required for WHOIS lookup' },
        { status: 400 }
      );
    }

    console.log(`WHOIS lookup request received for domain: ${domain}`);

    // --- IMPORTANT: Using a free WHOIS API for demonstration. ---
    // For production use, consider a more robust, possibly paid, WHOIS API
    // or a self-hosted WHOIS client for better reliability and rate limits.
    // Example using whoisjson.com (they offer a free demo key, but it's rate-limited)
    // Replace 'YOUR_WHOISJSON_API_KEY' with an actual key if you sign up.
    // For this example, we'll use a public, no-auth WHOIS API if available, or simulate.
    // Let's use a generic WHOIS API that doesn't require a key for this example.
    // Note: Public, no-auth WHOIS APIs can be unreliable or rate-limited.
    const whoisApiUrl = `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=WHOIS_API_KEY`; // Placeholder for a real API key

    // Since we don't have a direct free API key for whoisxmlapi,
    // and to ensure the example is runnable, I will simulate a response.
    // In a real application, you would replace this with an actual fetch.

    let whoisData: any;
    try {
        // In a real scenario, you would fetch from a WHOIS API like this:
        // const response = await fetch(whoisApiUrl);
        // if (!response.ok) {
        //   const errorText = await response.text();
        //   throw new Error(`WHOIS API failed with status ${response.status}: ${errorText}`);
        // }
        // whoisData = await response.json();

        // --- Simulated WHOIS Data for Demonstration ---
        whoisData = {
            "WhoisRecord": {
                "registrant": {
                    "email": `registrant@${domain}`
                },
                "administrativeContact": {
                    "email": `admin@${domain}`
                },
                "technicalContact": {
                    "email": `tech@${domain}`
                },
                "rawText": `
                    Domain Name: ${domain}
                    Registrar WHOIS Server: whois.example.com
                    Registrar URL: http://www.example.com
                    Updated Date: 2023-01-01T12:00:00Z
                    Creation Date: 2022-01-01T12:00:00Z
                    Registrar Registration Expiration Date: 2024-01-01T12:00:00Z
                    Registrar: Example Registrar, Inc.
                    Registrar IANA ID: 9999
                    Registrar Abuse Contact Email: abuse@example.com
                    Registrar Abuse Contact Phone: +1.1234567890
                    Domain Status: clientTransferProhibited https://icann.org/epp#clientTransferProhibited
                    Name Server: ns1.example.com
                    Name Server: ns2.example.com
                    DNSSEC: unsigned
                    URL of the ICANN Whois Inaccuracy Complaint Form: https://www.icann.org/wicf/
                    >>> Last update of WHOIS database: 2023-10-27T12:34:56Z <<<

                    For more information on Whois status codes, please visit https://icann.org/epp

                    Registrant Organization: Example Org
                    Registrant Street: 123 Example St
                    Registrant City: Exampleville
                    Registrant State/Province: CA
                    Registrant Postal Code: 90210
                    Registrant Country: US
                    Registrant Phone: +1.9876543210
                    Registrant Email: contact@${domain}

                    Admin Email: support@${domain}
                    Tech Email: webmaster@${domain}
                `
            }
        };
        // End of simulated data
    } catch (apiError: any) {
        console.error(`WHOIS API fetch error for ${domain}:`, apiError.message);
        // Return an empty array of emails if the API call fails
        return NextResponse.json({ emails: [] });
    }

    const foundEmails: Set<string> = new Set();

    // Attempt to extract emails from structured fields (if API provides them)
    const record = whoisData?.WhoisRecord;
    if (record) {
      if (record.registrant?.email) foundEmails.add(record.registrant.email.toLowerCase());
      if (record.administrativeContact?.email) foundEmails.add(record.administrativeContact.email.toLowerCase());
      if (record.technicalContact?.email) foundEmails.add(record.technicalContact.email.toLowerCase());
    }

    // Also attempt to extract emails from the raw text, which is more robust
    const rawText = record?.rawText;
    if (rawText) {
      // Regex to find email addresses in the raw text
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      let match;
      while ((match = emailRegex.exec(rawText)) !== null) {
        foundEmails.add(match[0].toLowerCase());
      }
    }

    const emailsArray = Array.from(foundEmails);
    console.log(`Found ${emailsArray.length} emails from WHOIS for ${domain}:`, emailsArray);

    return NextResponse.json({ emails: emailsArray });

  } catch (error: any) {
    console.error('WHOIS API route error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during WHOIS lookup' },
      { status: 500 }
    );
  }
}
