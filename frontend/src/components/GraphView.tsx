import React, { useRef, useState } from "react";
import { motion } from "framer-motion";

export type NodePoint = {
  id: number;
  x: number;
  y: number;
};

type Props = {
  nodes: NodePoint[];
  bestRoute: number[];
  currentPath: number[];
  selectedNodeId: number | null;
  addMode: boolean;
  onAddNode: (x: number, y: number) => void;
  onMoveNode: (id: number, x: number, y: number) => void;
  onSelectNode: (id: number | null) => void;
};

const WIDTH = 520;
const HEIGHT = 360;

const GraphView = ({
  nodes,
  bestRoute,
  currentPath,
  addMode,
  onAddNode,
  onMoveNode,
  onSelectNode,
  selectedNodeId,
}: Props) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [hoverId, setHoverId] = useState<number | null>(null);

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const handleBackgroundClick = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!addMode) return;
    if (draggingId !== null) return;
    const targetEl = e.target as HTMLElement;
    // ignore clicks on existing nodes when adding
    if (targetEl.closest("[data-node-id]")) return;
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    onAddNode(Number(x.toFixed(1)), Number(y.toFixed(1)));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingId === null) return;
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(WIDTH, e.clientX - rect.left));
    const y = Math.max(0, Math.min(HEIGHT, e.clientY - rect.top));
    onMoveNode(draggingId, Number(x.toFixed(1)), Number(y.toFixed(1)));
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  const bestEdges =
    bestRoute.length > 1
      ? bestRoute.map((id, idx) => {
          if (idx === bestRoute.length - 1) return null;
          const a = nodeMap.get(id);
          const b = nodeMap.get(bestRoute[idx + 1]);
          if (!a || !b) return null;
          return { id: `${id}-${bestRoute[idx + 1]}`, a, b };
        })
      : [];

  const pathEdges =
    currentPath.length > 1
      ? currentPath.map((id, idx) => {
          if (idx === currentPath.length - 1) return null;
          const a = nodeMap.get(id);
          const b = nodeMap.get(currentPath[idx + 1]);
          if (!a || !b) return null;
          return { id: `p-${id}-${currentPath[idx + 1]}`, a, b };
        })
      : [];

  return (
    <div className="graph-container" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      <svg
        ref={svgRef}
        width="100%"
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        onClick={handleBackgroundClick}
      >
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7c9dff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#7c9dff" stopOpacity="0" />
          </radialGradient>
          <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width={WIDTH} height={HEIGHT} rx="18" fill="rgba(255,255,255,0.02)" />

        {pathEdges.map(
          (edge) =>
            edge && (
              <motion.line
                key={edge.id}
                x1={edge.a.x}
                y1={edge.a.y}
                x2={edge.b.x}
                y2={edge.b.y}
                stroke="rgba(255,255,255,0.55)"
                strokeDasharray="8 6"
                strokeWidth={2.2}
                opacity={0.65}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.65 }}
                transition={{ duration: 0.4 }}
              />
            ),
        )}

        {bestEdges.map(
          (edge) =>
            edge && (
              <motion.line
                key={edge.id}
                x1={edge.a.x}
                y1={edge.a.y}
                x2={edge.b.x}
                y2={edge.b.y}
                stroke="rgba(139,123,255,0.7)"
                strokeWidth={4}
                strokeOpacity={0.85}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5 }}
                filter="url(#glowFilter)"
              />
            ),
        )}

        {nodes.map((node) => {
          const isInPath = currentPath.includes(node.id);
          return (
            <g key={node.id}>
              {selectedNodeId === node.id && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={18}
                  fill="url(#glow)"
                  opacity={0.9}
                  style={{ pointerEvents: "none" }}
                />
              )}
              <motion.circle
                data-node-id={node.id}
                cx={node.x}
                cy={node.y}
                r={10}
                fill={isInPath ? "#9be8ff" : "#0ef0c9"}
                stroke={isInPath ? "#9be8ff" : "#0ef0c9"}
                strokeWidth={isInPath ? 3 : 2}
                onMouseEnter={() => setHoverId(node.id)}
                onMouseLeave={() => setHoverId(null)}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDraggingId(node.id);
                  onSelectNode(node.id);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(node.id);
                }}
                className="node-dot"
              />
              {hoverId === node.id && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={16}
                  stroke="#8b7bff"
                  strokeWidth={2}
                  opacity={0.6}
                  style={{ pointerEvents: "none" }}
                />
              )}
              <text x={node.x + 12} y={node.y + 4} className="node-label">
                #{node.id}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default GraphView;
