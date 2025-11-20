import requests
import json
import time
import re
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import logging
from datetime import datetime

# Configure logging for better visibility in the console
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Initialize the FastAPI application.
# FastAPI will automatically generate the Swagger UI at http://127.0.0.1:8000/docs
app = FastAPI(
    title="SpiderFoot Scan API",
    description="An API to trigger SpiderFoot scans and retrieve results.",
    version="1.0.0",
)

# URL for your local SpiderFoot instance.
SPIDERFOOT_URL = "http://127.0.0.1:5001"
API_KEY = "" # Leave empty for a local, self-hosted instance

# Define the data model for the request body.
# This ensures that the user provides a 'target_domain' string when calling the endpoint.
class ScanRequest(BaseModel):
    target_domain: str

# Helper function to start a new scan
def start_new_scan(target_domain: str):
    """
    Initiates a new SpiderFoot scan for the given domain.
    """
    logging.info(f"Attempting to start a new scan for '{target_domain}'...")
    
    payload = {
        "scanName": f"Scan for {target_domain} via API",
        "scanTarget": target_domain,
        "scanType": "investigate",
    }
    headers = {"Content-Type": "application/json"}

    try:
        api_url = f"{SPIDERFOOT_URL}/api/v1/scans"
        if API_KEY:
            api_url += f"?api_key={API_KEY}"
        
        response = requests.post(api_url, data=json.dumps(payload), headers=headers, timeout=10)
        response.raise_for_status()
        
        scan_id = response.json().get('scanId')
        if scan_id:
            logging.info(f"Scan started successfully. Scan ID: {scan_id}")
            return scan_id
        
        logging.error("Failed to get a scan ID from the response.")
        return None
        
    except requests.exceptions.RequestException as e:
        logging.error(f"Error starting scan: {e}")
        raise HTTPException(status_code=500, detail=f"Error communicating with SpiderFoot: {e}")

# Helper function to check scan status
def check_scan_status(scan_id: str):
    """
    Polls the SpiderFoot API to check the status of a scan until it's complete or aborted.
    """
    logging.info(f"Waiting for scan {scan_id} to complete...")
    
    api_url = f"{SPIDERFOOT_URL}/api/v1/scans/{scan_id}"
    if API_KEY:
        api_url += f"?api_key={API_KEY}"

    try:
        while True:
            response = requests.get(api_url, timeout=10)
            response.raise_for_status()
            status = response.json().get('status')
            
            if status in ["COMPLETE", "ABORTED", "FAILED"]:
                return status
            
            progress = response.json().get('progress', 0)
            logging.info(f"Scan status: {status}, Progress: {progress}%")
            time.sleep(30)
            
    except requests.exceptions.RequestException as e:
        logging.error(f"Error checking scan status: {e}")
        raise HTTPException(status_code=500, detail=f"Error communicating with SpiderFoot: {e}")

# Helper function to retrieve scan results
def get_scan_results(scan_id: str):
    """
    Fetches the email results for a completed scan.
    """
    logging.info(f"Retrieving emails for scan {scan_id}...")
    
    api_url = f"{SPIDERFOOT_URL}/api/v1/scans/{scan_id}/elements?type=EMAILADDRESS"
    if API_KEY:
        api_url += f"&api_key={API_KEY}"

    try:
        response = requests.get(api_url, timeout=30)
        response.raise_for_status()
        
        results = response.json()
        emails_found = [result.get('value') for result in results if result.get('value')]
        unique_emails = sorted(list(set(emails_found)))
        logging.info(f"Found {len(unique_emails)} unique emails.")
        return unique_emails
        
    except requests.exceptions.RequestException as e:
        logging.error(f"Error retrieving results: {e}")
        raise HTTPException(status_code=500, detail=f"Error communicating with SpiderFoot: {e}")

# Define the main API endpoint
@app.post("/scan-and-scrape-emails/")
async def scan_and_scrape_emails(request: ScanRequest):
    """
    Triggers a new SpiderFoot scan and returns a list of discovered email addresses.

    - **target_domain**: The domain to be scanned (e.g., "example.com").
    """
    # Step 1: Start a new scan
    scan_id = start_new_scan(request.target_domain)
    if not scan_id:
        raise HTTPException(status_code=500, detail="Failed to initiate a new scan.")
    
    # Step 2: Wait for the scan to finish
    scan_status = check_scan_status(scan_id)
    if scan_status not in ["COMPLETE"]:
        raise HTTPException(status_code=500, detail=f"Scan ended with status: {scan_status}")
    
    # Step 3: Get the emails from the completed scan
    emails = get_scan_results(scan_id)
    
    # Return the final results
    return {
        "status": "success",
        "message": f"Scan for {request.target_domain} completed.",
        "scan_id": scan_id,
        "emails_found": emails,
        "total_emails": len(emails),
    }

# Main entry point to run the server with uvicorn
# The command below will run the app
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
