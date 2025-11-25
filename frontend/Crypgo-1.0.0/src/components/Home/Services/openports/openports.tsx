"use client";

import React, { useState } from "react";

// Define the shape of the data we expect from our API
type PortScanResult = {
  status: 'success' | 'error';
  target: string;
  ip: string;
  source: string;
  ports: number[];
  services: Array<{ port: number; protocol: string; service: string }>;
  note: string;
  error?: string;
};

const OpenPorts: React.FC = () => {
  const [target, setTarget] = useState('');
  const [scanResult, setScanResult] = useState<PortScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setScanResult(null); // Clear previous results

    try {
      // Use the internal Next.js API route, just like the subdomains component
      const response = await fetch('/api/portscan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });

      const data: PortScanResult = await response.json();

      if (!response.ok || data.status === 'error') {
        throw new Error(data.error || 'Failed to perform port scan.');
      }

      setScanResult(data);
    } catch (err: any) {
      console.error('Frontend fetch error:', err);
      setError(err.message || 'An error occurred during the port scan.');
    } finally {
      setLoading(false);
    }
  };

  return (
<div className="min-h-screen flex items-center justify-center p-4 bg-darkmode bg-fixed bg-center bg-cover" style={{
      backgroundImage:
        "url('https://i.pinimg.com/originals/71/4f/e7/714fe796fe10e761f29ece0409a6f9c9.gif')",
      backgroundSize: "74%",
      backgroundPositionY: "40%",
    }}>      {/* Inner container: Applies the semi-transparent background, blur, border, and shadows */}
      <div className="max-w-6xl w-full mx-auto backdrop-filter backdrop-blur-sm bg-black-800/80 rounded-xl shadow-lg p-8 my-8">
        <h1 className="text-4xl font-extrabold mb-6 text-center text-primary tracking-tight">
            Network Port Scanner
        </h1>

        <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-4 mb-8">
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Enter domain or IP (e.g., example.com or 8.8.8.8)"
            className="backdrop-blur-sm bg-white/15 backdrop-filter flex-grow p-3 rounded-xl shadow-sm focus:ring-primary focus:border-primary text-white placeholder-gray-400 transition duration-200 ease-in-out border border-gray-700"
            required
          />
          <button
            type="submit"
            disabled={loading || !target}
            className="bg-primary hover:bg-opacity-90 text-darkmode font-medium py-3 px-6 rounded-lg transition duration-300"
          >
            {loading ? 'Scanning...' : 'Scan Ports'}
          </button>
        </form>

        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded relative mb-6" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline ml-2">{error}</span>
          </div>
        )}

        {loading && !scanResult && (
          <p className="text-center text-gray-300">Performing port scan... this may take a moment.</p>
        )}

        {scanResult && (
          <div className="mt-8 p-4 bg-gray-800/50 rounded-xl border border-white/10 shadow-xl">
            <h2 className="text-2xl font-bold mb-4 text-gray-50">Scan Results for {scanResult.target}</h2>
            <p className="text-md text-gray-200 mb-2">Resolved IP: <span className="font-mono">{scanResult.ip || 'N/A'}</span></p>
            <p className="text-md text-gray-200 mb-4">Source: <span className="font-mono">{scanResult.source}</span></p>
            
            {scanResult.ports.length > 0 ? (
              <>
                <p className="text-lg font-semibold text-teal-400 mb-2">Open Ports ({scanResult.ports.length}):</p>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700 rounded-lg">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider rounded-tl-lg">Port</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Protocol</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider rounded-tr-lg">Service</th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                      {scanResult.services.map((service, index) => (
                        <tr key={`${service.port}-${service.protocol}-${index}`} className="hover:bg-gray-700/50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{service.port}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{service.protocol}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{service.service}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-lg font-semibold text-yellow-400">No open ports detected.</p>
            )}
            <p className="text-sm text-gray-400 mt-4">Note: {scanResult.note}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpenPorts;
