# file: app/main.py
# FastAPI app

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
# Note: Assuming your email_scraper module is correctly implemented
from .email_scraper import scrape_emails_from_domain, run_spiderfoot_scan

app = FastAPI()

# --- START OF CORS FIX ---
# Configure CORS to allow requests from your frontend.
# Replace "http://localhost:3000" with your actual frontend URL if it's different.
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --- END OF CORS FIX ---

class WebScrapeEmailsRequest(BaseModel):
    domain: str
    max_pages: int = 20

class EmailsResponse(BaseModel):
    emails: List[str]

@app.post("/scan/emails", response_model=EmailsResponse)
async def email_scrape_endpoint(request: WebScrapeEmailsRequest):
    if not request.domain:
        raise HTTPException(status_code=400, detail="Domain cannot be empty.")

    # Run SpiderFoot scan and/or scrape emails
    try:
        spider_results = run_spiderfoot_scan(request.domain)
        # Optional: extract emails from SpiderFoot results if needed
    except Exception as e:
        # If SpiderFoot fails, fallback to basic scraping
        spider_results = []

    found_emails = scrape_emails_from_domain(request.domain, max_pages=request.max_pages)
    all_emails = list(set(found_emails + spider_results))  # combine results

    return {"emails": all_emails}


@app.get("/")
def read_root():
    return {"message": "Welcome to the Email Scraper API"}
