
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Local path to the Wappalyzer apps database. This path must be correct relative to your project's root.
const APPS_DB_PATH = path.join(process.cwd(), 'src', 'data', 'apps.json');

// Global cache for the apps database to avoid re-reading on every request.
// This is a great optimization for a large database.
let appsDatabase: any | null = null;

/**
 * Maps a technology name to its corresponding OSV ecosystem for vulnerability lookups.
 * This is a crucial function for getting correct vulnerability data.
 * @param techName The name of the technology.
 * @returns The name of the OSV ecosystem (e.g., 'npm', 'PyPI').
 */
function getOsvEcosystem(techName: string): string {
  techName = techName.toLowerCase();
  if (['react', 'vue.js', 'angular', 'jquery', 'express', 'next.js', 'nuxt.js', 'webpack', 'babel', 'bootstrap', 'tailwind css', 'javascript', 'next.js', 'node.js'].includes(techName)) {
    return 'npm';
  }
  if (['wordpress', 'drupal', 'joomla', 'php'].includes(techName) || techName.includes('php')) {
    return 'Packagist';
  }
  if (['django', 'flask', 'python', 'pyramid'].includes(techName) || techName.includes('python')) {
    return 'PyPI';
  }
  if (['ruby on rails', 'ruby', 'jekyll'].includes(techName) || techName.includes('ruby')) {
    return 'RubyGems';
  }
  if (['java', 'spring', 'apache tomcat', 'jboss'].includes(techName) || techName.includes('java')) {
    return 'Maven';
  }
  if (['go', 'golang'].includes(techName)) {
    return 'Go';
  }
  if (['nginx', 'apache', 'iis', 'openlitespeed'].includes(techName)) {
    return 'OSS-Fuzz';
  }
  if (['asp.net', 'c#', '.net'].includes(techName)) {
    return 'NuGet';
  }
  if (['rust', 'rust-lang'].includes(techName)) {
    return 'crates.io';
  }
  if (['docker'].includes(techName)) {
    return 'GCP';
  }
  return '';
}

/**
 * Helper function to query the OSV database for vulnerabilities.
 * @param packageName The name of the package.
 * @param version The version of the package.
 * @param ecosystem The ecosystem of the package.
 * @returns A promise that resolves to an array of vulnerability objects.
 */
async function queryVulnerabilities(packageName: string, version: string, ecosystem: string = 'npm'): Promise<any[]> {
  const osvApiUrl = 'https://api.osv.dev/v1/query';
  const payload = {
    version: version,
    package: {
      name: packageName,
      ecosystem: ecosystem
    }
  };

  try {
    const response = await fetch(osvApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OSV API error for ${packageName}@${version} (${ecosystem}): ${response.status} ${response.statusText} - ${errorText}`);
      return [];
    }

    const data = await response.json();
    return data.vulns || [];
  } catch (error) {
    console.error(`Error in queryVulnerabilities for ${packageName}@${version} (${ecosystem}):`, error);
    return [];
  }
}

/**
 * Loads the apps database from the local file.
 * Caches the result to avoid repeated file I/O.
 * @returns A promise that resolves to the parsed apps database.
 */
async function loadAppsDatabase(): Promise<any> {
  if (appsDatabase) {
    return appsDatabase;
  }
  try {
    const data = await fs.readFile(APPS_DB_PATH, 'utf-8');
    appsDatabase = JSON.parse(data);
    return appsDatabase;
  } catch (error) {
    console.error('Error loading Wappalyzer apps database from local file:', error);
    return null;
  }
}

/**
 * Detects technologies on a given URL by fetching its content and headers,
 * then applying regex patterns from the apps database.
 * This function is the core of your technology scanner.
 * @param url The URL to scan.
 * @returns An array of detected technologies.
 */
async function detectTechnologiesFromDatabase(url: string): Promise<Array<{ name: string; versions: string[]; categories: string[]; confidence: number; }>> {
  const technologies: Array<{ name: string; versions: string[]; categories: string[]; confidence: number; }> = [];
  let htmlContent = '';
  let responseHeaders: Headers | undefined;
  const appDb = await loadAppsDatabase();

  if (!appDb) {
    console.error('Could not load apps database. Aborting detection.');
    return [];
  }

  // Helper function to add a technology to the results, handling duplicates and confidence levels.
  const addTechnology = (name: string, versions: string[] = [], categories: string[] = [], confidence: number = 50) => {
    const existingTech = technologies.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (existingTech) {
      if (confidence > existingTech.confidence) {
        existingTech.confidence = confidence;
      }
      existingTech.versions = Array.from(new Set([...existingTech.versions, ...versions]));
      existingTech.categories = Array.from(new Set([...existingTech.categories, ...categories]));
    } else {
      technologies.push({ name, versions, categories, confidence });
    }
  };

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
      },
      redirect: 'follow',
      cache: 'no-store'
    });

    responseHeaders = response.headers;
    if (response.ok) {
      htmlContent = await response.text();
    } else {
      console.warn(`Failed to fetch URL content for detection: ${response.status} ${response.statusText}`);
    }

    // This loop is the key to the detection. It iterates through the entire Wappalyzer apps database.
    if (appDb.apps) {
      for (const appName in appDb.apps) {
        const app = appDb.apps[appName];
        let matched = false;

        // Check for header-based detection patterns. This is often the most reliable method.
        if (app.headers && responseHeaders) {
          for (const headerName in app.headers) {
            const headerValue = responseHeaders.get(headerName);
            if (headerValue) {
              const patterns = Array.isArray(app.headers[headerName]) ? app.headers[headerName] : [app.headers[headerName]];
              for (const pattern of patterns) {
                try {
                  const regex = new RegExp(pattern, 'i');
                  if (regex.test(headerValue)) {
                    // Extract version if the regex has a capture group
                    const versionMatch = headerValue.match(regex);
                    const version = versionMatch && versionMatch[1] ? versionMatch[1] : '';

                    // The category is a number in Wappalyzer's format, so we need to look it up.
                    if (app.cats && appDb.categories[app.cats[0]]) {
                      addTechnology(appName, [version], [appDb.categories[app.cats[0]].name], 100);
                      matched = true;
                      break;
                    }
                  }
                } catch (e) {
                  console.error(`Invalid header regex for ${appName}: ${pattern}`);
                }
              }
            }
            if (matched) break;
          }
        }

        if (matched) continue;

        // Check for HTML-based detection patterns (meta tags, inline scripts, comments, etc.).
        if (htmlContent) {
          if (app.html) {
            const patterns = Array.isArray(app.html) ? app.html : [app.html];
            for (const pattern of patterns) {
              try {
                const regex = new RegExp(pattern, 'i');
                if (regex.test(htmlContent)) {
                  if (app.cats && appDb.categories[app.cats[0]]) {
                    addTechnology(appName, [], [appDb.categories[app.cats[0]].name], 95);
                    matched = true;
                    break;
                  }
                }
              } catch (e) {
                console.error(`Invalid HTML regex for ${appName}: ${pattern}`);
              }
            }
          }

          if (matched) continue;

          // Check for script tag detection. This is useful for frameworks and libraries.
          if (app.script) {
            const patterns = Array.isArray(app.script) ? app.script : [app.script];
            const scriptTags = htmlContent.match(/<script[^>]*src=["']([^"']+)["'][^>]*>/gi) || [];
            for (const pattern of patterns) {
              try {
                const regex = new RegExp(pattern, 'i');
                for (const scriptTag of scriptTags) {
                  const srcMatch = scriptTag.match(/src=["']([^"']+)["']/i);
                  if (srcMatch && regex.test(srcMatch[1])) {
                    if (app.cats && appDb.categories[app.cats[0]]) {
                      addTechnology(appName, [], [appDb.categories[app.cats[0]].name], 90);
                      matched = true;
                      break;
                    }
                  }
                }
                if (matched) break;
              } catch (e) {
                console.error(`Invalid script regex for ${appName}: ${pattern}`);
              }
            }
          }
        }
      }
    }
    return technologies;
  } catch (error) {
    console.error(`Error during technology detection for ${url}:`, error);
    return [];
  }
}

// Main POST handler for the API route.
export async function POST(req: Request) {
  const { url } = await req.json();

  if (!url) {
    return NextResponse.json(
      { error: 'URL is required for technology scan.' },
      { status: 400 }
    );
  }

  const textEncoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        const detectedTechnologies = await detectTechnologiesFromDatabase(url);

        if (detectedTechnologies.length === 0) {
          controller.enqueue(textEncoder.encode(`data: ${JSON.stringify({ status: 'info', message: 'No common technologies detected or an error occurred during detection.' })}\n\n`));
          controller.close();
          return;
        }

        const concurrencyLimit = 5;
        let activePromises: Promise<void>[] = [];

        for (const tech of detectedTechnologies) {
          const techName = tech.name;
          const techVersions = tech.versions || [];
          const versionsToQuery = techVersions.length > 0 ? techVersions : [''];

          for (const version of versionsToQuery) {
            const promise = (async () => {
              const ecosystem = getOsvEcosystem(techName);
              const vulnerabilities = await queryVulnerabilities(techName, version, ecosystem);

              const result = {
                technology: techName,
                version: version || 'N/A',
                categories: tech.categories || [],
                vulnerabilities: vulnerabilities.map((v: any) => ({
                  id: v.id,
                  summary: v.summary || v.details,
                  severity: v.severity?.[0]?.score || 'N/A',
                  detailsUrl: v.id ? `https://osv.dev/vulnerability/${v.id}` : null,
                })),
                hasVulnerabilities: vulnerabilities.length > 0,
              };

              controller.enqueue(textEncoder.encode(`data: ${JSON.stringify(result)}\n\n`));
            })();

            activePromises.push(promise);
            if (activePromises.length >= concurrencyLimit) {
              await Promise.race(activePromises.map(p => p.catch(() => {})));
              activePromises = activePromises.filter(p => {
                return Promise.race([p.then(() => true), Promise.resolve(false)]).then(val => !val);
              });
            }
          }
        }
        await Promise.allSettled(activePromises);
        controller.close();
      } catch (error: any) {
        console.error('Technology scan API error:', error);
        controller.enqueue(textEncoder.encode(`event: error\ndata: ${JSON.stringify({ error: error.message || 'Failed to perform technology scan.' })}\n\n`));
        controller.close();
      }
    },
    cancel() {
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
