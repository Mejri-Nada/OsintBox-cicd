"use client";

import React, { useState } from 'react';

// Main App component
const App = () => {
  const [url, setUrl] = useState<string>('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      setError('Please enter a URL to scan.');
      return;
    }
    setError(null);
    setIsLoading(true);
    setResults([]);

    try {
      // The updated fetch call now points to the correct backend endpoint
      const response = await fetch('/api/tech-vuln', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get a readable stream from the response.');
      }

      const decoder = new TextDecoder('utf-8');
      let resultChunk = '';

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        resultChunk += decoder.decode(value, { stream: true });

        // Process each complete JSON object
        while (resultChunk.includes('\n\n')) {
          const [data, rest] = resultChunk.split('\n\n', 2);
          resultChunk = rest;
          if (data.startsWith('data: ')) {
            const jsonString = data.substring(6);
            try {
              const parsedResult = JSON.parse(jsonString);
              if (parsedResult.status === 'info') {
                // Handle info messages
              } else if (parsedResult.error) {
                setError(parsedResult.error);
              } else {
                setResults(prev => [...prev, parsedResult]);
              }
            } catch (jsonError) {
              console.error('Failed to parse JSON:', jsonError);
            }
          }
        }
      }
    } catch (err: any) {
      setError(`Scan failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
<div className="min-h-screen flex items-center justify-center p-4 bg-darkmode bg-fixed bg-center bg-cover" style={{
      backgroundImage:
        "url('https://i.pinimg.com/originals/71/4f/e7/714fe796fe10e761f29ece0409a6f9c9.gif')",
      backgroundSize: "74%",
      backgroundPositionY: "40%",
    }}>
 <div className="max-w-6xl w-full mx-auto backdrop-filter backdrop-blur-sm bg-black-800/80 rounded-xl shadow-lg p-8 my-8">
        <h1 className="text-4xl font-extrabold mb-6 text-center text-primary tracking-tight">
          Technology & Vulnerability Scanner
        </h1>

        <form onSubmit={handleSubmit} className="mb-8 flex flex-col sm:flex-row gap-4">
          <input
            type="url"
            placeholder="Enter a website URL (e.g., https://example.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="backdrop-blur-sm bg-white/15 backdrop-filter flex-grow p-3 rounded-xl shadow-sm focus:ring-primary focus:border-primary text-white placeholder-gray-400 transition duration-200 ease-in-out border border-gray-700"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-primary hover:bg-opacity-90 text-darkmode font-medium py-3 px-6 rounded-lg transition duration-300"
          >
            {isLoading ? 'Scanning...' : 'Scan Website'}
          </button>
        </form>

        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded relative mb-6" role="alert">
            {error}
          </div>
        )}

        {isLoading && results.length === 0 && (
          <div className="flex flex-col items-center text-emerald-400 p-6">
            <svg className="animate-spin h-8 w-8 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-gray-400">Scanning in progress...</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-gray-300">Scan Results</h2>
            {results.map((tech, index) => (
              <div key={index} className="bg-gray-700 rounded-xl p-6 shadow-md border border-gray-600">
                <div className="flex items-center mb-3">
                  <h3 className="text-xl font-bold text-emerald-400">{tech.technology}</h3>
                  {tech.version && (
                    <span className="ml-2 text-sm bg-gray-600 text-gray-200 px-2 py-1 rounded-full">
                      v{tech.version}
                    </span>
                  )}
                </div>
                <div className="text-gray-400 mb-4">
                  <span className="font-semibold text-gray-300">Categories:</span> {tech.categories.join(', ') || 'N/A'}
                </div>
                {tech.hasVulnerabilities ? (
                  <div className="bg-red-900/40 border border-red-700 p-4 rounded-lg shadow-inner">
                    <div className="flex items-center text-red-400 font-bold mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Vulnerabilities Detected
                    </div>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                      {tech.vulnerabilities.map((vuln: any, i: number) => (
                        <li key={i} className="text-red-300">
                          {vuln.summary}
                          {vuln.detailsUrl && (
                            <a href={vuln.detailsUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-red-500 hover:text-red-400 underline transition-colors">
                              More Info
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-emerald-900/40 border border-emerald-700 p-4 rounded-lg shadow-inner">
                    <div className="flex items-center text-emerald-400 font-bold">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      No known vulnerabilities for this version.
                    </div>
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

export default App;
