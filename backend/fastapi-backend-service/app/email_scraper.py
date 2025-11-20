# file: app/email_scraper.py
# This file contains both SpiderFoot integration and email scraping logic.

import requests
from bs4 import BeautifulSoup
from collections import deque
from urllib.parse import urljoin, urlparse
import time

SPIDERFOOT_URL = "http://127.0.0.1:5001/api/v1"

def scrape_emails_from_domain(base_url: str, max_pages: int = 20):
    """Scrape emails from a domain using BFS approach."""
    unique_emails = set()
    urls_to_visit = deque([base_url])
    visited_urls = {base_url}
    page_count = 0

    while urls_to_visit and page_count < max_pages:
        current_url = urls_to_visit.popleft()
        page_count += 1

        try:
            response = requests.get(current_url, timeout=5)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')

            # Find emails
            email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
            found_on_page = set(re.findall(email_pattern, soup.get_text()))
            unique_emails.update(found_on_page)

            # Find internal links
            for a_tag in soup.find_all('a', href=True):
                href = a_tag['href']
                absolute_url = urljoin(current_url, href)
                if urlparse(absolute_url).netloc == urlparse(base_url).netloc and absolute_url not in visited_urls:
                    urls_to_visit.append(absolute_url)
                    visited_urls.add(absolute_url)

        except requests.RequestException:
            continue

    return list(unique_emails)


def run_spiderfoot_scan(target: str):
    """
    Trigger a SpiderFoot scan for a given domain.
    Requires SpiderFoot to be running on 127.0.0.1:5001.
    """
    # Start a new scan
    url = f"{SPIDERFOOT_URL}/scan/new"
    data = {
        "target": target,
        "module": "all",
        "type": "domain"
    }
    response = requests.post(url, data=data)
    response.raise_for_status()
    scan_info = response.json()
    scan_id = scan_info.get("scan_id")

    # Wait for the scan to finish (simplified polling)
    status_url = f"{SPIDERFOOT_URL}/scan/{scan_id}"
    while True:
        status_resp = requests.get(status_url)
        status_resp.raise_for_status()
        status = status_resp.json().get("status")
        if status == "FINISHED":
            break
        time.sleep(2)

    # Get scan results
    result_url = f"{SPIDERFOOT_URL}/scan/{scan_id}/results"
    results_resp = requests.get(result_url)
    results_resp.raise_for_status()
    return results_resp.json()
