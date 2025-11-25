// utils/proxies.ts
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

export async function getWorkingProxies(limit = 10): Promise<string[]> {
  try {
    const res = await axios.get("https://www.proxy-list.download/api/v1/get?type=https");
    const proxyList = res.data.split("\r\n").filter(Boolean);

    const working: string[] = [];

    for (const proxy of proxyList) {
      if (working.length >= limit) break;

      try {
        const agent = new HttpsProxyAgent("http://" + proxy);
        const test = await axios.get("https://httpbin.org/ip", {
          httpsAgent: agent,
          timeout: 5000,
        });

        if (test.status === 200) {
          working.push("http://" + proxy);
        }
      } catch {
        continue;
      }
    }

    return working;
  } catch (error) {
    console.error("Failed to fetch proxy list:", error);
    return [];
  }
}
