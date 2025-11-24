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
        <rect width={WIDTH} height={HEIGHT} rx="18" fill="rgba(255,255,255,0.02)" />

        {bestPoints.length > 1 && (
          <polyline
            points={bestPoints.map((p) => `${p.x},${p.y}`).join(" ")}
            stroke="#8b7bff"
            strokeWidth={4}
            fill="none"
            strokeOpacity={0.9}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {pathPoints.length > 1 && (
          <>
            <polyline
              points={pathPoints.map((p) => `${p.x},${p.y}`).join(" ")}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={6}
              fill="none"
              opacity={0.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={pathPoints.map((p) => `${p.x},${p.y}`).join(" ")}
              stroke="#00e0ff"
              strokeWidth={3}
              fill="none"
              opacity={0.95}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="10 8"
            />
          </>
        )}

        {nodes.map((node) => {
          const isInPath = currentPath.includes(node.id);
          return (
            <g key={node.id}>
              <motion.circle
                data-node-id={node.id}
                cx={node.x}
                cy={node.y}
                r={10}
              fill={isInPath ? "#00e0ff" : "#0ef0c9"}
              stroke={isInPath ? "#00e0ff" : "#0ef0c9"}
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
