// components/DnsEnum.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3'; // Import all of d3 for graph visualization

interface Node {
  id: number;
  type: string; // 'domain', 'subdomain', 'ip_v4'
  value: string;
  label: string;
  txt_records?: string; // Still optional for potential future use or detailed info
  x?: number;
  y?: number;
  fx?: number; // Fixed x position for D3
  fy?: number; // Fixed y position for D3
}

interface Link {
  source: number | Node;
  target: number | Node;
  type: string; // 'has_subdomain', 'A_record'
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

// Function to determine node color based on type
const getNodeColor = (type: string) => {
  switch (type) {
    case 'domain': return '#60A5FA'; // Blue for main domain
    case 'subdomain': return '#A78BFA'; // Purple for subdomains
    case 'ip_v4': return '#34D399'; // Green for IPv4 addresses
    default: return '#E5E7EB'; // Fallback light gray
  }
};

// Function to determine link color based on type
const getLinkColor = (type: string) => {
  switch (type) {
    case 'has_subdomain': return '#A78BFA'; // Purple for subdomain links
    case 'A_record': return '#34D399'; // Green for A record links
    default: return '#9CA3AF'; // Fallback gray
  }
};

export default function DnsEnum() {
  const [domain, setDomain] = useState("");
  const [graphData, setGraphData] = useState<GraphData | null>(null); // Data for D3 rendering
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nodeInfo, setNodeInfo] = useState<Node | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // const fastapiBackendUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'; // Not used directly for VirusTotal API

  const handleDnsEnum = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGraphData(null); // Clear previous data
    setNodeInfo(null);
    setInitialLoad(false);

    try {
      // Fetch subdomains from the /api/virustotal endpoint
      const response = await fetch('/api/virustotal', { // This now targets your Next.js API route
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch subdomains from /api/virustotal.');
      }

      const data = await response.json();
      console.log("Frontend received raw VirusTotal data:", data); // --- DEBUG LOG ---

      // Transform data from /api/virustotal into D3-compatible GraphData
      const newNodes: Node[] = [];
      const newLinks: Link[] = [];
      let nodeIdCounter = 0;
      const valueToNodeId = new Map<string, number>(); // To ensure unique nodes by value

      // Add main domain node
      const mainDomainValue = domain.toLowerCase();
      const mainDomainId = nodeIdCounter++;
      newNodes.push({ id: mainDomainId, type: 'domain', value: mainDomainValue, label: mainDomainValue });
      valueToNodeId.set(mainDomainValue, mainDomainId);

      // Process each detailed item from the response (subdomain and its IP)
      // The `detailed` array is expected from your `src/app/api/virustotal/route.ts`
      if (data.detailed && Array.isArray(data.detailed)) {
        data.detailed.forEach((item: { subdomain: string; ip: string | null; }) => {
          const subdomainValue = item.subdomain.toLowerCase();
          let subdomainId: number;

          // Add subdomain node if not already present
          if (!valueToNodeId.has(subdomainValue)) {
            subdomainId = nodeIdCounter++;
            newNodes.push({ id: subdomainId, type: 'subdomain', value: subdomainValue, label: subdomainValue });
            valueToNodeId.set(subdomainValue, subdomainId);
          } else {
            subdomainId = valueToNodeId.get(subdomainValue)!;
          }

          // Add link from main domain to subdomain
          newLinks.push({ source: mainDomainId, target: subdomainId, type: 'has_subdomain' });

          // If subdomain has an IP, add IP node and link
          if (item.ip) {
            const ipValue = item.ip;
            let ipId: number;

            // Add IP node if not already present
            if (!valueToNodeId.has(ipValue)) {
              ipId = nodeIdCounter++;
              newNodes.push({ id: ipId, type: 'ip_v4', value: ipValue, label: ipValue });
              valueToNodeId.set(ipValue, ipId);
            } else {
              ipId = valueToNodeId.get(ipValue)!;
            }

            // Add link from subdomain to IP
            newLinks.push({ source: subdomainId, target: ipId, type: 'A_record' });
          }
        });
      }

      const transformedGraphData = { nodes: newNodes, links: newLinks };
      console.log("Transformed GraphData for D3:", transformedGraphData);
      setGraphData(transformedGraphData);

    } catch (err: any) {
      console.error('Frontend fetch error:', err);
      setError(err.message || 'An error occurred during DNS enumeration.');
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = useCallback((node: Node) => {
    setNodeInfo(node);
  }, []);

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
      console.log("Container dimensions updated:", { width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [updateDimensions]);

  // Use graphData directly for rendering, as it's already pre-filtered/transformed
  useEffect(() => {
    console.log("D3 useEffect triggered. svgRef.current:", svgRef.current, "dimensions:", dimensions, "graphData:", graphData);

    if (graphData && graphData.nodes.length > 0 && (dimensions.width === 0 || dimensions.height === 0)) {
        console.log("D3 render attempted but dimensions are 0 despite graphData. Forcing dimension update.");
        updateDimensions(); // Force an update if dimensions are missing but data is ready
        return; // Skip this render cycle, it will re-run when dimensions state updates
    }

    if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0 || !graphData || graphData.nodes.length === 0) {
      if (!graphData || graphData.nodes.length === 0) {
          console.log("D3 render skipped: No graph data or empty nodes array.");
      } else if (dimensions.width === 0 || dimensions.height === 0) {
          console.log("D3 render skipped: Invalid dimensions (width or height is 0).");
      }
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear SVG contents for redraw

    const { nodes, links } = graphData; // Use graphData directly
    console.log(`D3 is attempting to render with ${nodes.length} nodes and ${links.length} links.`);

    const g = svg.append("g");

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const initialRadius = Math.min(centerX, centerY) * 0.4; // Initial radius for circular layout

    if (nodes.length > 1) {
        const centralNode = nodes.find(n => n.type === 'domain' && n.value.toLowerCase() === domain.toLowerCase());

        let angle = 0;
        // Adjust angle increment based on number of non-central nodes
        const nodesToDistribute = nodes.filter(n => n !== centralNode);
        const angleIncrement = nodesToDistribute.length > 0 ? (2 * Math.PI) / nodesToDistribute.length : 0; 

        nodes.forEach(d => {
          if (d === centralNode) {
            d.fx = centerX;
            d.fy = centerY;
            d.x = centerX;
            d.y = centerY;
          } else {
            d.x = centerX + initialRadius * Math.cos(angle);
            d.y = centerY + initialRadius * Math.sin(angle);
            angle += angleIncrement;
          }
        });
        console.log("[D3 Init] Applied initial circular layout to nodes.");
    } else if (nodes.length === 1) {
        nodes[0].fx = centerX;
        nodes[0].fy = centerY;
        nodes[0].x = centerX;
        nodes[0].y = centerY;
        console.log("[D3 Init] Centered single main node.");
    }

    const simulation = d3.forceSimulation<Node, Link>(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id(d => (d as Node).id).distance(150)) // Adjusted distance for better spread
      .force("charge", d3.forceManyBody().strength(-600)) // Adjusted repulsion strength
      .force("center", d3.forceCenter(centerX, centerY))
      .force("collision", d3.forceCollide().radius(25)); // Adjusted collision radius

    simulation.alphaTarget(0.3).restart();
    console.log(`[D3 Init] Simulation restarted with alphaTarget 0.3.`);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom as any);
    setTimeout(() => {
        svg.transition().duration(750).call(zoom.transform as any, d3.zoomIdentity);
        console.log("[D3 Init] Applied D3 zoomIdentity (reset view).");
    }, 100);

    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke-width", 2)
      .attr("stroke", d => getLinkColor(d.type as string));

    const linkText = g.append("g")
      .attr("class", "link-labels")
      .selectAll("text")
      .data(links)
      .enter().append("text")
        .attr("font-size", "10px")
        .attr("fill", "#bbb")
        .attr("text-anchor", "middle")
        .text(d => d.type.replace(/_/g, ' '));

    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(nodes)
      .enter().append("circle")
        .attr("r", 15)
        .attr("fill", d => getNodeColor(d.type))
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .call(d3.drag<SVGCircleElement, Node>()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    const labels = g.append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(nodes)
      .enter().append("text")
        .attr("font-size", "12px")
        .attr("fill", "#fff")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .text(d => d.label.replace(/^www\./, ''))
        .style("pointer-events", "none");

    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", "rgba(0,0,0,0.8)")
      .style("color", "#fff")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("max-width", "300px")
      .style("word-wrap", "break-word")
      .style("z-index", "1000");

    node.on("mouseover", (event, d) => {
        tooltip.html(`<strong>Type:</strong> ${d.type.replace(/_/g, ' ')}<br/><strong>Value:</strong> ${d.value}`);
        if (d.txt_records) {
            tooltip.html(tooltip.html() + `<br/><strong>TXT Records:</strong> <pre style="white-space: pre-wrap; word-break: break-all; max-height: 100px; overflow-y: auto; margin-top: 5px; background-color: #222; padding: 5px; border-radius: 3px;">${d.txt_records}</pre>`);
        }
        tooltip.style("visibility", "visible");
    })
    .on("mousemove", (event) => {
        tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px");
    })
    .on("mouseout", () => {
        tooltip.style("visibility", "hidden");
    })
    .on("click", (event, d) => {
        handleNodeClick(d);
        d.fx = d.x;
        d.fy = d.y;
    });

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as Node).x || 0)
        .attr("y1", d => (d.source as Node).y || 0)
        .attr("x2", d => (d.target as Node).x || 0)
        .attr("y2", d => (d.target as Node).y || 0);

      node
        .attr("cx", d => d.x || 0)
        .attr("cy", d => d.y || 0);

      labels
        .attr("x", d => d.x || 0)
        .attr("y", d => d.y! + 20);

      linkText
        .attr("x", d => ((d.source as Node).x || 0) + (((d.target as Node).x || 0) - ((d.source as Node).x || 0)) / 2)
        .attr("y", d => ((d.source as Node).y || 0) + (((d.target as Node).y || 0) - ((d.source as Node).y || 0)) / 2 - 10);
    });

    function dragstarted(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0);
    }

    return () => {
      tooltip.remove();
    };

  }, [graphData, dimensions.width, dimensions.height, handleNodeClick]);

  const resetGraphView = useCallback(() => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      // Create a new zoom behavior
      const zoomBehavior = d3.zoom<SVGSVGElement, unknown>();

      // Apply the identity transform using the zoom behavior
      svg.transition().duration(750).call(zoomBehavior.transform, d3.zoomIdentity);
    }
  }, []);
return (
  <div
    className="min-h-screen flex flex-col items-center justify-start p-4 bg-darkmode bg-fixed bg-center bg-cover"
    style={{
      backgroundImage:
        "url('https://i.pinimg.com/originals/71/4f/e7/714fe796fe10e761f29ece0409a6f9c9.gif')",
      backgroundSize: "74%",
      backgroundPositionY: "40%",
    }}
  >
    {/* Top container: title + form */}
    <div className="max-w-6xl w-full mx-auto backdrop-filter backdrop-blur-sm bg-black-800/80 rounded-xl shadow-lg p-8 my-8" style={{ background: "transparent", padding: "2rem", marginTop: "22rem" }}>
      <h1 className="text-4xl font-extrabold mb-6 text-center text-primary tracking-tight">
        DNS Enumeration & Visualization
      </h1>

      <form onSubmit={handleDnsEnum} className="mb-8 flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="Enter domain (e.g., example.com)"
          className="backdrop-blur-sm bg-white/15 backdrop-filter flex-grow p-3 rounded-xl shadow-sm focus:ring-primary focus:border-primary text-white placeholder-gray-400 transition duration-200 ease-in-out border border-gray-700"
          required
          
        />
        <button
          type="submit"
          disabled={loading || !domain}
          className="bg-primary hover:bg-opacity-90 text-darkmode font-medium py-3 px-6 rounded-lg transition duration-300"
        >
          {loading ? "Scanning..." : "Enumerate DNS"}
        </button>
      </form>

      {error && (
        <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline ml-2">{error}</span>
        </div>
      )}

      {loading && !graphData && (
        <p className="text-center text-gray-300">
          Gathering DNS records and subdomains. This may take a moment...
        </p>
      )}

      {initialLoad && !loading && (
        <p className="text-center text-gray-400 mt-8"></p>
      )}

      {graphData && graphData.nodes.length === 0 && !loading && !error ? (
        <p className="text-center text-yellow-300 mt-8">
          No relevant subdomains or IPs found for "{domain}". Try another domain.
        </p>
      ) : null}
    </div>

    {/* Graph container now BELOW the form */}
    {graphData && graphData.nodes.length > 0 && (
      <div className="max-w-8xl w-full mx-auto backdrop-filter backdrop-blur-sm bg-black-800/80 rounded-xl shadow-lg p-8 my-8" style={{ background: "transparent"}}>
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4 text-gray-50">DNS Map for {domain}</h2>
          <div ref={containerRef} className="relative bg-black-800/50 rounded-xl border border-white/10 p-4 h-[700px] w-full">
            <svg ref={svgRef} style={{ width: "100%", height: "100%", display: "block" }}></svg>

            {nodeInfo && (
              <div className="absolute bottom-4 right-4 bg-gray-700/80 backdrop-filter backdrop-blur-md p-4 rounded-lg shadow-lg border border-gray-600 text-sm max-w-xs z-10">
                <h3 className="font-bold text-lg text-teal-400 mb-2">Node Info:</h3>
                <p>
                  <strong>Type:</strong>{" "}
                  <span className="capitalize">{nodeInfo.type.replace("_", " ")}</span>
                </p>
                <p>
                  <strong>Value:</strong>{" "}
                  <span className="font-mono break-all">{nodeInfo.value}</span>
                </p>
                {nodeInfo.txt_records && (
                  <div className="mt-2">
                    <p className="font-bold">TXT Records:</p>
                    <pre className="bg-gray-800 p-2 rounded-md text-xs overflow-auto max-h-24">{nodeInfo.txt_records}</pre>
                  </div>
                )}
                <button
                  onClick={() => setNodeInfo(null)}
                  className="mt-3 w-full px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-md text-white text-xs"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
  </div>
);
}