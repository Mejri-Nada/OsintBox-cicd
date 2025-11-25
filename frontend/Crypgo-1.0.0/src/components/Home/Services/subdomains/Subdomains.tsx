"use client";

import React, { useState } from 'react'; // Ensure React is imported
// No need for Image import unless you add specific images within this component
// No need for Icon import unless you plan to use Iconify icons here

type ScanResult = {
  status: string;
  target: string;
  ip: string;
  source: string;
  ports: number[];
  services: {
    port: number;
    protocol: string;
    service: string;
  }[];
  error?: string;
  note?: string;
};

type SubdomainData = {
  subdomain: string;
  ip: string | null;
  scanResult?: ScanResult;
  loading?: boolean;
  error?: string;
};

const Subdomains = () => {
  const [domain, setDomain] = useState("");
  const [subdomains, setSubdomains] = useState<SubdomainData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchSubdomains = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSubdomains([]); // Clear previous subdomains on new scan

    try {
      const res = await fetch('/api/virustotal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch subdomains');

      setSubdomains(data.detailed.map((item: any) => ({
        subdomain: item.subdomain,
        ip: item.ip,
        scanResult: undefined,
        loading: false
      })));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch subdomains');
    } finally {
      setLoading(false);
    }
  };

  const scanPorts = async (subdomain: string, ip: string | null) => {
    if (!ip) {
      setSubdomains(prev => prev.map(s =>
        s.subdomain === subdomain
          ? { ...s, error: "No IP address available" }
          : s
      ));
      return;
    }

    setSubdomains(prev => prev.map(s =>
      s.subdomain === subdomain
        ? { ...s, loading: true, error: undefined }
        : s
    ));

    try {
      const res = await fetch('/api/portscan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: ip }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');

      setSubdomains(prev => prev.map(s =>
        s.subdomain === subdomain
          ? { ...s, scanResult: data, loading: false }
          : s
      ));
    } catch (err: any) {
      setSubdomains(prev => prev.map(s =>
        s.subdomain === subdomain
          ? { ...s, error: err.message, loading: false }
          : s
      ));
    }
  };

  return (
    // Outer container: Centers content, takes full height, relies on global background for main color/gradient
    <div className="min-h-screen flex items-center justify-center p-4 bg-darkmode bg-fixed bg-center bg-cover" style={{
      backgroundImage:
        "url('https://i.pinimg.com/originals/71/4f/e7/714fe796fe10e761f29ece0409a6f9c9.gif')",
      backgroundSize: "74%",
      backgroundPositionY: "40%",
    }}>

      {/* Inner container: Applies the semi-transparent background, blur, border, and shadows */}
      <div className="max-w-6xl w-full mx-auto backdrop-filter backdrop-blur-sm bg-black-800/80 rounded-xl shadow-lg p-8 my-8">
        <h1 className="text-4xl font-extrabold mb-6 text-center text-primary tracking-tight">
          Subdomain Port Scanner
        </h1>

        <form onSubmit={fetchSubdomains} className="mb-8 flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Enter domain (e.g., example.com)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="backdrop-blur-sm bg-white/15 backdrop-filter flex-grow p-3 rounded-xl shadow-sm focus:ring-primary focus:border-primary text-white placeholder-gray-400 transition duration-200 ease-in-out border border-gray-700"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-opacity-90 text-darkmode font-medium py-3 px-6 rounded-lg transition duration-300"
          >
            {loading ? "Searching..." : "Find Subdomains"}
          </button>
        </form>

        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded relative mb-6" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline ml-2">{error}</span>
          </div>
        )}

        {loading && subdomains.length === 0 && (
          <p className="text-center text-gray-300">Searching for subdomains...</p>
        )}

        {subdomains.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-primary">
                Discovered Subdomains ({subdomains.length})
              </h2>
              <div className="text-sm text-gray-300">
                Click IP to scan ports
              </div>
            </div>

            {subdomains.map(({ subdomain, ip, scanResult, loading, error }) => (
              <div
                key={subdomain}
                className="bg-gray-700/50 rounded-lg border border-gray-600 overflow-hidden" // Changed to match the inner card style
              >
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center">
                    <span className="font-mono text-primary break-all"> {/* Changed to text-primary */}
                      {subdomain}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {ip ? (
                      <button
                        onClick={() => scanPorts(subdomain, ip)}
                        disabled={loading}
                        className={`px-3 py-1 rounded font-mono text-sm ${
                          loading
                            ? "bg-gray-700 text-gray-400"
                            : scanResult
                              ? "bg-primary/50 text-white" // Green when scanned
                              : "bg-gray-700 hover:bg-gray-600 text-primary" // Green for unscanned IP
                        }`}
                      >
                        {loading ? "Scanning..." : ip}
                      </button>
                    ) : (
                      <span className="text-gray-400 text-sm">No IP found</span>
                    )}
                  </div>
                </div>

                {(scanResult || error) && (
                  <div className="border-t border-gray-700 p-4 bg-gray-900/20">
                    {error ? (
                      <div className="text-red-400">{error}</div>
                    ) : scanResult ? (
                      <>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm text-gray-400">
                            Source: {scanResult.source}
                          </span>
                          {scanResult.note && (
                            <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                              {scanResult.note}
                            </span>
                          )}
                        </div>

                        {scanResult.ports?.length > 0 ? (
                          <>
                            <h3 className="font-medium mb-2 text-white">
                              Open Ports ({scanResult.ports.length})
                            </h3>
                            <div className="flex flex-wrap gap-2 mb-4">
                              {scanResult.ports.map(port => (
                                <span
                                  key={port}
                                  className="px-3 py-1 bg-primary/30 border border-primary/50 rounded-full text-sm font-mono text-white" // Green accents
                                >
                                  {port}
                                </span>
                              ))}
                            </div>

                            <h3 className="font-medium mb-2 text-white">Services</h3>
                            <div className="space-y-2">
                              {scanResult.services.map((service, i) => (
                                <div
                                  key={i}
                                  className="bg-gray-700/30 p-3 rounded border border-gray-600"
                                >
                                  <div className="flex flex-wrap items-center gap-2 mb-1 text-gray-200"> {/* Added text-gray-200 for default text color */}
                                    <span className="font-mono text-primary"> {/* Changed to text-primary */}
                                      {service.port}
                                    </span>
                                    <span className="text-gray-400">|</span>
                                    <span className="capitalize">
                                      {service.protocol}
                                    </span>
                                    {service.service && service.service !== "unknown" && (
                                      <>
                                        <span className="text-gray-400">|</span>
                                        <span>{service.service}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="text-yellow-400">
                            No open ports found
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Subdomains;
