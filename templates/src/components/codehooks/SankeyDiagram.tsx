import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';

const MAX_HEIGHT = 1200;
const COMPRESSED_HEIGHT = 384; // Fixed height for compressed view

const colors = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#c084fc',
  '#e879f9',
  '#ec4899',
  '#f43f5e',
];

interface Node {
  name: string;
  id: string;
}

interface Link {
  source: number;
  target: number;
  value: number;
}

interface SankeyData {
  nodes: Node[];
  links: Link[];
}

interface SankeyDiagramProps {
  data: SankeyData;
  isLoading?: boolean;
}

const SankeyDiagram = ({ data, isLoading = false }: SankeyDiagramProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledRef = useRef(false);
  const [dimensions, setDimensions] = useState({
    width: 800,
    height: 500,
  });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const nodeCount = data.nodes.length || 1;
        const optimalHeight = nodeCount * (40 + 10) + 50;
        const finalHeight = Math.min(MAX_HEIGHT, optimalHeight);

        setDimensions({
          width: containerWidth,
          height: finalHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [data.nodes.length]);

  useEffect(() => {
    // Only scroll on subsequent data changes, not first load
    if (
      data &&
      data.nodes.length > 0 &&
      data.links.length > 0 &&
      containerRef.current
    ) {
      if (hasScrolledRef.current) {
        const prefersReducedMotion = window.matchMedia(
          '(prefers-reduced-motion: reduce)'
        ).matches;

        const timeoutId = setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollIntoView({
              behavior: prefersReducedMotion ? 'auto' : 'smooth',
              block: 'start',
              inline: 'nearest',
            });
          }
        }, 100);

        return () => clearTimeout(timeoutId);
      } else {
        // Mark that we've loaded data once
        hasScrolledRef.current = true;
      }
    }
  }, [data.nodes.length, data.links.length]);

  useEffect(() => {
    if (!svgRef.current || !data || !data.nodes.length || !data.links.length) {
      console.warn('SankeyDiagram: Invalid or empty data provided', data);
      return;
    }

    const maxIndex = data.nodes.length - 1;
    const validLinks = data.links.filter((link) => {
      const isValid =
        link.source >= 0 &&
        link.source <= maxIndex &&
        link.target >= 0 &&
        link.target <= maxIndex;
      if (!isValid) {
        console.warn(
          `Invalid link: source=${link.source}, target=${link.target}, maxIndex=${maxIndex}`
        );
      }
      return isValid;
    });

    if (validLinks.length === 0) {
      console.warn('SankeyDiagram: No valid links after validation');
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;

    const margin = { top: 20, bottom: 20 };
    const layoutHeight = height - margin.top - margin.bottom;

    const sankeyGenerator = sankey<Node, Link>()
      .nodeWidth(20)
      .nodePadding(10)
      .iterations(32)
      .extent([
        [0, margin.top],
        [width, layoutHeight],
      ]);

    try {
      const { nodes, links } = sankeyGenerator({
        nodes: data.nodes.map((d) => ({ ...d })),
        links: validLinks.map((d) => ({ ...d })),
      });

      const minY = nodes.reduce(
        (min, node) => Math.min(min, node.y0 ?? 0),
        Infinity
      );
      const maxY = nodes.reduce((max, node) => Math.max(max, node.y1 ?? 0), 0);
      const actualHeight = maxY - minY;

      let scale = 1;
      if (actualHeight > layoutHeight) {
        scale = layoutHeight / actualHeight;
      }

      nodes.forEach((node) => {
        node.y0 = margin.top + (node.y0! - margin.top) * scale;
        node.y1 = margin.top + (node.y1! - margin.top) * scale;
      });

      svg
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);

      svg
        .append('g')
        .selectAll('path')
        .data(links)
        .enter()
        .append('path')
        .attr('d', sankeyLinkHorizontal())
        .attr('stroke', '#999')
        .attr('stroke-width', (d) => Math.max(1, (d.width || 1) * scale))
        .attr('fill', 'none')
        .attr('opacity', 0.5)
        .append('title')
        .text((d) => {
          const sourceNode = d.source as { index: number };
          const targetNode = d.target as { index: number };
          return `${data.nodes[sourceNode.index].name} → ${data.nodes[targetNode.index].name
            }\n${d.value} events`;
        });

      svg
        .append('g')
        .selectAll('rect')
        .data(nodes)
        .enter()
        .append('rect')
        .attr('x', (d) => d.x0 ?? 0)
        .attr('y', (d) => d.y0 ?? 0)
        .attr('height', (d) => Math.max(0, (d.y1 ?? 0) - (d.y0 ?? 0)))
        .attr('width', sankeyGenerator.nodeWidth())
        .attr('fill', (_, i) => colors[i % colors.length])
        .append('title')
        .text((d) => `${d.name}\n${d.value} events`);

      svg
        .append('g')
        .selectAll('text')
        .data(nodes)
        .enter()
        .append('text')
        .attr('x', (d) => {
          const x0 = d.x0 ?? 0;
          return x0 < width / 2 ? x0 + sankeyGenerator.nodeWidth() + 5 : x0 - 5;
        })
        .attr('y', (d) => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', (d) => ((d.x0 ?? 0) < width / 2 ? 'start' : 'end'))
        .text((d) => d.name)
        .style('font-size', needsCompression ? '10px' : '12px')
        .style('fill', '#333');
    } catch (error) {
      console.error('SankeyDiagram: Error generating Sankey diagram', error);
    }
  }, [data, dimensions]);

  const needsCompression = !isExpanded && dimensions.height > COMPRESSED_HEIGHT;
  const displayHeight = needsCompression
    ? COMPRESSED_HEIGHT
    : dimensions.height;

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Expand/Compress Controls */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {data.nodes.length} nodes • {data.links.length} connections
        </div>
        <button
          onClick={handleExpand}
          className="flex items-center space-x-1 rounded-md bg-gray-100 px-3 py-1 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-200"
        >
          {isExpanded ? (
            <>
              <span>Compress view</span>
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </>
          ) : (
            <>
              <span>Expand diagram ({data.nodes.length} nodes)</span>
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </>
          )}
        </button>
      </div>

      {/* Compression Warning */}
      {needsCompression && (
        <div className="mb-2 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <strong>Compressed view</strong> - click anywhere to expand!
        </div>
      )}

      {/* SVG Container - Clickable when compressed */}
      <div
        className={`transition-all duration-300 ${needsCompression
            ? 'cursor-pointer hover:bg-gray-50 hover:shadow-md'
            : ''
          }`}
        style={{
          height: `${displayHeight}px`,
          overflow: 'hidden',
        }}
        onClick={needsCompression ? handleExpand : undefined}
        role={needsCompression ? 'button' : undefined}
        tabIndex={needsCompression ? 0 : undefined}
        onKeyDown={
          needsCompression
            ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleExpand();
              }
            }
            : undefined
        }
        aria-label={
          needsCompression ? 'Click to expand Sankey diagram' : undefined
        }
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          style={{
            display: 'block',
            width: '100%',
            height: `${dimensions.height}px`,
            transform: needsCompression
              ? `scaleY(${displayHeight / dimensions.height})`
              : 'scaleY(1)',
            transformOrigin: 'top center',
          }}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          preserveAspectRatio="xMidYMid meet"
        ></svg>
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center rounded bg-black bg-opacity-80">
          <div className="flex items-center space-x-2 text-white">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            <span className="text-sm font-bold">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SankeyDiagram;
