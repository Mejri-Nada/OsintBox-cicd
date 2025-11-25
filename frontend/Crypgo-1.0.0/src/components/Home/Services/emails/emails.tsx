"use client";

import { useState } from "react";

export const Emails = () => {
  const [domain, setDomain] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [breachInfo, setBreachInfo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResults([]);
    setBreachInfo(null);
    setError("");

    try {
      // Use Promise.allSettled to allow all promises to resolve or reject independently
      const [hunterResult, skymemResult, whoisResult /*,scrapeResult*/] = await Promise.allSettled([
        fetch("/api/hunter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain }),
        }),
        fetch("/api/skymem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain }),
        }),
        fetch("/api/whois", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain }),
        }),
        // Add the new scraping endpoint to the list of promises
        //fetch("/api/scrape-emails", {
          //  method: "POST",
            //headers: { "Content-Type": "application/json" },
            //body: JSON.stringify({ domain }),
        //}),
      ]);

      const mergedEmails: Set<string> = new Set();
      const errors: string[] = [];

      // Process Hunter.io results
      if (hunterResult.status === 'fulfilled') {
        const hunterRes = hunterResult.value;
        const hunterData = await hunterRes.json();
        if (hunterRes.ok) {
          (hunterData.emails || []).forEach((email: string) => mergedEmails.add(email));
        } else {
          errors.push(hunterData.error || "Hunter.io API Error");
        }
      } else {
        errors.push(`Hunter.io fetch failed: ${hunterResult.reason}`);
      }

      // Process Skymem results
      if (skymemResult.status === 'fulfilled') {
        const skymemRes = skymemResult.value;
        const skymemData = await skymemRes.json();
        if (skymemRes.ok) {
          (skymemData.emails || []).forEach((email: string) => mergedEmails.add(email));
        } else {
          errors.push(skymemData.error || "Skymem API Error");
        }
      } else {
        errors.push(`Skymem fetch failed: ${skymemResult.reason}`);
      }

      // Process WHOIS results
      if (whoisResult.status === 'fulfilled') {
        const whoisRes = whoisResult.value;
        const whoisData = await whoisRes.json();
        if (whoisRes.ok) {
          (whoisData.emails || []).forEach((email: string) => mergedEmails.add(email));
        } else {
          errors.push(whoisData.error || "WHOIS API Error");
        }
      } else {
        errors.push(`WHOIS fetch failed: ${whoisResult.reason}`);
      }
      
      // Process the new scraping results
      //if (scrapeResult.status === 'fulfilled') {
        //  const scrapeRes = scrapeResult.value;
        //  const scrapeData = await scrapeRes.json();
        //  if (scrapeRes.ok) {
        //      (scrapeData.emails || []).forEach((email: string) => mergedEmails.add(email));
        //  } else {
        //      errors.push(scrapeData.error || "Scraping API Error");
        //  }
      //} else {
        //  errors.push(`Scraping fetch failed: ${scrapeResult.reason}`);
      //}

      // Set results from successful fetches
      setResults(Array.from(mergedEmails).sort());

      // Display errors if any occurred
      if (errors.length > 0) {
        setError(`Some sources failed: ${errors.join(" | ")}`);
      }

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during email search.");
    } finally {
      setLoading(false);
    }
  };

  const fetchBreachInfo = async (email: string) => {
    setCheckingEmail(true);
    setSelectedEmail(email);
    setBreachInfo(null);

    try {
      const res = await fetch("/api/breachdirectory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch breach info");
      }

      // Pretty print JSON response
      setBreachInfo(JSON.stringify(data.result, null, 2));
    } catch (err: any) {
      setBreachInfo(`Error: ${err.message || "No data found."}`);
    } finally {
      setCheckingEmail(false);
    }
  };

  return (
<div className="min-h-screen flex items-center justify-center p-4 bg-darkmode bg-fixed bg-center bg-cover"
style={{
      backgroundImage:
        "url('https://i.pinimg.com/originals/71/4f/e7/714fe796fe10e761f29ece0409a6f9c9.gif')",
      backgroundSize: "74%",
      backgroundPositionY: "40%",
    }}>      {/* Inner container: Applies the semi-transparent background, blur, border, and shadows */}
      <div className="max-w-6xl w-full mx-auto backdrop-filter backdrop-blur-sm bg-black-800/80 rounded-xl shadow-lg p-8 my-8">
        <h1 className="text-4xl font-extrabold mb-6 text-center text-primary tracking-tight">
          Email Finder
        </h1>

        <form onSubmit={handleSubmit} className="mb-8 flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Enter domain name (e.g. example.com)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            required
            className="backdrop-blur-sm bg-white/15 backdrop-filter flex-grow p-3 rounded-xl shadow-sm focus:ring-primary focus:border-primary text-white placeholder-gray-400 transition duration-200 ease-in-out border border-gray-700"
          />
          <button
            type="submit"
            className="bg-primary hover:bg-opacity-90 text-darkmode font-medium py-3 px-6 rounded-lg transition duration-300"
            disabled={loading}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {error && <div className="mt-6 text-red-500 text-center">{error}</div>}

        {loading && results.length === 0 && (
          <p className="text-center text-gray-300">Searching for emails... This may take a moment.</p>
        )}

        {results.length > 0 && (
          <div className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold mb-2 text-gray-100">Emails Found ({results.length}):</h2>
            <div className="bg-gray-800/50 shadow-lg rounded-lg overflow-hidden border border-white/10 p-4">
              <ul className="divide-y divide-gray-700">
                {results.map((email) => (
                  <li
                    key={email}
                    onClick={() => fetchBreachInfo(email)}
                    className="p-3 hover:bg-gray-700/60 transition duration-150 ease-in-out cursor-pointer text-blue-400 flex items-center justify-between"
                  >
                    <span>{email}</span>
                    {selectedEmail === email && checkingEmail && (
                      <span className="text-xs text-gray-400 ml-2">Checking breach info...</span>
                    )}
                  </li>
                ))}
                
              </ul>
            </div>
          </div>
        )}

        {selectedEmail && breachInfo && (
          <div className="mt-6 bg-gray-800/50 p-4 rounded-xl border border-white/10 shadow-lg">
            <h3 className="text-lg font-semibold mb-2 text-gray-100">
              Breach Info for <span className="text-blue-400">{selectedEmail}</span>
            </h3>
            <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-gray-900 p-3 rounded-md overflow-auto max-h-96">
              {breachInfo}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default Emails;
