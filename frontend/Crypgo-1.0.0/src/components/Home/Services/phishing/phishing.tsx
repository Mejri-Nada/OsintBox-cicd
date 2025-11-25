"use client";
import React, { useState, useEffect } from 'react';

// Define the type for a single scan result item
interface ScanResult {
  variant: string;
  ip: string | null;
  isPhishing: boolean;
  resolved: boolean;
  note: string;
  type: string;
  scanSource: string;
  isDirectlyRelatedToSearch: boolean;
}

export default function PhishingScanPage() {
  const [domain, setDomain] = useState('');
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    setScanResults([]); // Clear previous results
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/dnstwist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start scan.');
      }

      // Important: Use ReadableStreamDefaultReader to read chunks
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (!reader) {
        throw new Error('Failed to get readable stream reader.');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process potentially multiple events in the buffer
        let lastNewlineIndex;
        while ((lastNewlineIndex = buffer.indexOf('\n\n')) !== -1) {
          const eventString = buffer.substring(0, lastNewlineIndex);
          buffer = buffer.substring(lastNewlineIndex + 2); // +2 for '\n\n'

          if (eventString.startsWith('data: ')) {
            const jsonString = eventString.substring('data: '.length);
            try {
              const result: ScanResult = JSON.parse(jsonString);
              setScanResults(prevResults => {
                // Prevent duplicates if results might be sent multiple times due to retries or other logic
                if (prevResults.some(r => r.variant === result.variant)) {
                    return prevResults;
                }
                return [...prevResults, result].sort((a, b) => {
                  // Re-sort results as they come in to maintain relevance
                  // Primary sort: isPhishing (true comes before false)
                  if (a.isPhishing && !b.isPhishing) return -1;
                  if (!a.isPhishing && b.isPhishing) return 1;

                  // Secondary sort (if isPhishing is same): isDirectlyRelatedToSearch (true comes before false)
                  if (a.isPhishing === b.isPhishing) {
                      if (a.isDirectlyRelatedToSearch && !b.isDirectlyRelatedToSearch) return -1;
                      if (!a.isDirectlyRelatedToSearch && b.isDirectlyRelatedToSearch) return 1;

                      // Tertiary sort (if both are same): resolved status (true comes before false)
                      if (a.isDirectlyRelatedToSearch === b.isDirectlyRelatedToSearch) {
                          if (a.resolved && !b.resolved) return -1;
                          if (!a.resolved && b.resolved) return 1;

                          // Quaternary sort (if all above are same): alphabetical by variant
                          if (a.resolved === b.resolved) {
                              return a.variant.localeCompare(b.variant);
                          }
                      }
                  }
                  return 0; // Should ideally not be reached if all conditions cover differences
                });
              });
            } catch (parseError) {
              console.error('Error parsing JSON from SSE data:', parseError, 'Raw data:', jsonString);
            }
          } else if (eventString.startsWith('event: error')) {
            const jsonString = eventString.substring('event: error\ndata: '.length);
              try {
                const errorEvent = JSON.parse(jsonString);
                setError(errorEvent.error || 'An unknown streaming error occurred.');
                console.error('Received error event from server:', errorEvent);
            } catch (parseError) {
                console.error('Error parsing error event JSON:', parseError, 'Raw data:', jsonString);
                setError('An unknown error occurred during streaming.');
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Frontend fetch error:', err);
      setError(err.message || 'An error occurred during the scan.');
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
    }}>      <div className="max-w-6xl w-full mx-auto backdrop-filter backdrop-blur-sm bg-black-800/80 rounded-xl shadow-lg p-8 my-8">
        <h1 className="text-4xl font-extrabold mb-6 text-center text-primary tracking-tight">Phishing Domain Scanner</h1>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="Enter a domain name (e.g., example.com)"
            className="backdrop-blur-sm bg-white/15 backdrop-filter flex-grow p-3 rounded-xl shadow-sm focus:ring-primary focus:border-primary text-white placeholder-gray-400 transition duration-200 ease-in-out border border-gray-700"
            required
          />
          <button
            onClick={handleScan}
            disabled={loading || !domain}
            className="bg-primary hover:bg-opacity-90 text-darkmode font-medium py-3 px-6 rounded-lg transition duration-300"
          >
            {loading ? 'Scanning...' : 'Scan Domain'}
          </button>
        </div>

        {/* These elements are now correctly placed inside the main container */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded relative mb-6" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline ml-2">{error}</span>
          </div>
        )}

        {loading && scanResults.length === 0 && (
          <p className="text-center text-gray-300 mb-4">Starting scan... results will appear as they become available.</p>
        )}

        {scanResults.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-100">Scan Results:</h2>
            <div className="bg-gray-800/50 shadow-lg rounded-lg overflow-hidden border border-white/10">
              <ul className="divide-y divide-gray-700">
                {scanResults.map((result) => (
                  <li key={result.variant} className="p-4 hover:bg-gray-700/60 transition duration-150 ease-in-out">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="mb-2 sm:mb-0">
                        <p className="text-lg font-medium text-gray-100">
                          Domain: <span className={result.isPhishing ? 'text-red-400 font-bold' : 'text-blue-400'}>
                            {result.variant}
                          </span>
                          {result.isDirectlyRelatedToSearch && (
                              <span className="ml-2 px-2 py-1 bg-green-900/30 text-green-400 text-xs font-semibold rounded-full">
                                  Relevant
                              </span>
                          )}
                        </p>
                        {result.ip && <p className="text-sm text-gray-400">IP: {result.ip}</p>}
                        <p className="text-sm text-gray-400">Type: {result.type}</p>
                        <p className="text-sm text-gray-400">Source: {result.scanSource}</p>
                      </div>
                      <div className="text-right">
                        {result.isPhishing ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-900/30 text-red-400">
                            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            Phishing Threat
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-900/30 text-green-400">
                            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            No Phishing Detected
                          </span>
                        )}
                        <p className="text-xs text-gray-500 mt-1">{result.note}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
