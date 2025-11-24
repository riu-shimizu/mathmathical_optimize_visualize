import React, { useMemo, useRef, useState } from "react";
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

  const nodeMap = useMemo(() => {
    const m = new Map<number, NodePoint>();
    nodes.forEach((n) => m.set(Number(n.id), { ...n, id: Number(n.id) }));
    return m;
  }, [nodes]);

  const toNode = (id: number | string) => nodeMap.get(Number(id));

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

  const bestPoints = useMemo(() => {
    const filtered = bestRoute.map((id) => Number(id)).filter((id) => nodeMap.has(id));
    if (filtered.length <= 1) return [];
    const closed =
      filtered.length > 2 && filtered[0] !== filtered[filtered.length - 1]
        ? [...filtered, filtered[0]]
        : filtered;
    return closed
      .map((id) => toNode(id))
      .filter((p): p is NodePoint => Boolean(p));
  }, [bestRoute, nodeMap]);

  const pathPoints = useMemo(() => {
    if (currentPath.length <= 1) return [];
    return currentPath
      .map((id) => toNode(id))
      .filter((p): p is NodePoint => Boolean(p));
  }, [currentPath, nodeMap]);

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

        {pathPoints.length > 1 && (
          <motion.polyline
            points={pathPoints.map((p) => `${p.x},${p.y}`).join(" ")}
            stroke="rgba(255,255,255,0.6)"
            strokeDasharray="10 8"
            strokeWidth={2.4}
            fill="none"
            opacity={0.7}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.7 }}
            transition={{ duration: 0.4 }}
          />
        )}

        {bestPoints.length > 1 && (
          <motion.polyline
            points={bestPoints.map((p) => `${p.x},${p.y}`).join(" ")}
            stroke="rgba(139,123,255,0.78)"
            strokeWidth={4}
            fill="none"
            strokeOpacity={0.9}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6 }}
            filter="url(#glowFilter)"
          />
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
