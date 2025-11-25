// src/app/api/skymem/route.ts
import { NextResponse } from "next/server";
import puppeteer from 'puppeteer';

export async function POST(req: Request) {
  try {
    const { domain } = await req.json();

    if (!domain) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 });
    }

    // Launch Puppeteer browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set realistic headers
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to Skymem
    await page.goto(`https://www.skymem.info/srch?q=${domain}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for results to load
    await page.waitForSelector('table.table.table-striped', { timeout: 10000 });

    // Extract emails
    const emails = await page.evaluate(() => {
      const results: string[] = [];
      const rows = document.querySelectorAll('table.table.table-striped tbody tr');
      
      rows.forEach(row => {
        const email = row.querySelector('td:nth-child(2)')?.textContent?.trim();
        if (email) {
          results.push(email);
        }
      });
      
      return results;
    });

    await browser.close();

    // Limit to 10 emails as requested
    const limitedEmails = emails.slice(0, 10);

    return NextResponse.json({ emails: limitedEmails });
  } catch (error: any) {
    console.error('Skymem scraping error:', error);
    return NextResponse.json(
      { 
        error: error.message.includes('timeout') 
          ? "Skymem took too long to respond" 
          : "Error scraping Skymem",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, 
      { status: 500 }
    );
  }
}