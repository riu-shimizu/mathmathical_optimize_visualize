import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { SearchEvent } from "../App";

type TreeNode = {
  id: string;
  parentId: string | null;
  children: string[];
  depth: number;
  status: "alive" | "pruned";
  pruneStep?: number;
  path: number[];
  cost: number;
  bound: number;
};

type Props = {
  events: SearchEvent[];
  currentEvent?: SearchEvent;
  currentStep: number;
  isPlaying: boolean;
  isFinished: boolean;
  bestRoute: number[];
};

const VIEW_WIDTH = 760;
const LEVEL_HEIGHT = 90;

const SearchTreeView = ({
  events,
  currentEvent,
  currentStep,
  isPlaying,
  isFinished,
  bestRoute,
}: Props) => {
  const [manualOffset, setManualOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);

  const { nodes, links, panX, bestPathNodeIds, bestPathEdges } = useMemo(() => {
    const map = new Map<string, TreeNode>();
    const bestPathNodeIds = new Set<string>();
    const bestPathEdges = new Set<string>();

    const getDepth = (path: number[]) => Math.max(0, path.length - 1);

    events.forEach((ev) => {
      if (ev.type === "expand") {
        const existing = map.get(ev.node_id);
        const depth = getDepth(ev.path);
        if (!existing) {
          map.set(ev.node_id, {
            id: ev.node_id,
            parentId: ev.parent_id ?? null,
            children: [],
            depth,
            status: "alive",
            pruneStep: undefined,
            path: ev.path,
            cost: ev.cost,
            bound: ev.bound,
          });
        }
        if (ev.parent_id) {
          const parent = map.get(ev.parent_id);
          if (parent && !parent.children.includes(ev.node_id)) {
            parent.children.push(ev.node_id);
          }
        }
      }

      if (ev.type === "prune") {
        const node = map.get(ev.node_id);
        if (node) {
          node.status = "pruned";
          node.pruneStep = ev.step;
        }
      }
    });

    // Drop pruned nodes after 2 steps to keep layout compact
    Array.from(map.values()).forEach((node) => {
      if (
        node.status === "pruned" &&
        node.pruneStep !== undefined &&
        node.pruneStep <= currentStep - 2
      ) {
        map.delete(node.id);
      }
    });

    // On finish: keep all non-pruned complete tours and their ancestors. Remove pruned nodes as above.
    if (isFinished) {
      const maxDepthSeen = Math.max(...Array.from(map.values()).map((n) => n.path.length));
      const targetDepth = bestRoute.length > 1 ? bestRoute.length - 1 : maxDepthSeen;
      const keep = new Set<string>();
      Array.from(map.values()).forEach((node) => {
        if (node.status !== "pruned" && node.path.length === targetDepth) {
          let cur: TreeNode | undefined = node;
          while (cur) {
            keep.add(cur.id);
            if (!cur.parentId) break;
            cur = map.get(cur.parentId);
          }
        }
      });
      Array.from(map.keys()).forEach((id) => {
        if (!keep.has(id)) {
          map.delete(id);
        }
      });
    }

    // Identify best path nodes/edges for highlight
    if (bestRoute.length > 0) {
      Array.from(map.values()).forEach((node) => {
        const isOnBest = node.path.every(
          (id, idx) => idx < bestRoute.length && bestRoute[idx] === id,
        );
        if (isOnBest) {
          bestPathNodeIds.add(node.id);
          if (node.parentId) {
            bestPathEdges.add(`${node.parentId}-${node.id}`);
          }
        }
      });
    }

    const depthGroups: Record<number, TreeNode[]> = {};
    map.forEach((node) => {
      if (!depthGroups[node.depth]) depthGroups[node.depth] = [];
      depthGroups[node.depth].push(node);
    });
    Object.values(depthGroups).forEach((group) => {
      group.sort((a, b) => a.id.localeCompare(b.id));
    });

    const positionedNodes: Record<string, TreeNode & { x: number; y: number }> = {};
    let maxX = 0;
    Object.entries(depthGroups).forEach(([depthStr, group]) => {
      const depth = Number(depthStr);
      if (group.length === 0) return;
      const spacing = Math.max(140, VIEW_WIDTH / (group.length + 0.5));
      group.forEach((node, idx) => {
        const x = spacing * (idx + 1);
        const y = LEVEL_HEIGHT * depth + 30;
        positionedNodes[node.id] = { ...node, x, y };
        if (x > maxX) maxX = x;
      });
    });

    const links = Array.from(map.values())
      .filter((n) => n.parentId)
      .map((n) => ({
        from: positionedNodes[n.parentId as string],
        to: positionedNodes[n.id],
      }))
      .filter((l) => l.from && l.to);

    const currentPos = currentEvent ? positionedNodes[currentEvent.node_id] : undefined;
    const panX =
      currentPos && currentPos.x > VIEW_WIDTH * 0.5 ? currentPos.x - VIEW_WIDTH * 0.5 : 0;

    return { nodes: positionedNodes, links, panX, bestPathNodeIds, bestPathEdges };
  }, [events, currentEvent, currentStep, isPlaying, isFinished, bestRoute]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPlaying) return;
    setDragging(true);
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !lastPos) return;
    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;
    setManualOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const stopDrag = () => {
    setDragging(false);
    setLastPos(null);
  };

  const effectiveXPlaying = -panX;
  const effectiveXManual = manualOffset.x - panX;
  const effectiveYManual = manualOffset.y;

  return (
    <div className="tree-container">
      <svg
        width="100%"
        height={420}
        viewBox={`0 0 ${VIEW_WIDTH} 420`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        style={{ cursor: !isPlaying && dragging ? "grabbing" : !isPlaying ? "grab" : "default" }}
      >
        <defs>
          <filter id="glowNode" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {isPlaying ? (
          <motion.g
            animate={{ x: effectiveXPlaying, y: 0 }}
            transition={{ type: "spring", stiffness: 80, damping: 16 }}
          >
            {links.map((link) => (
              <line
                key={`${link.from.id}-${link.to.id}`}
                x1={link.from.x}
                y1={link.from.y}
                x2={link.to.x}
                y2={link.to.y}
                stroke={
                  bestPathEdges.has(`${link.from.id}-${link.to.id}`)
                    ? "#0ef0c9"
                    : "rgba(255,255,255,0.18)"
                }
                strokeWidth={bestPathEdges.has(`${link.from.id}-${link.to.id}`) ? 2.5 : 1.5}
                opacity={bestPathEdges.has(`${link.from.id}-${link.to.id}`) ? 0.95 : 1}
              />
            ))}

            {Object.values(nodes).map((node) => {
              const isCurrent = currentEvent?.node_id === node.id;
              const isBest = bestPathNodeIds.has(node.id);
              return (
                <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                  {isCurrent && (
                    <circle
                      r={18}
                      fill="rgba(142,120,255,0.15)"
                      style={{ filter: "url(#glowNode)" }}
                    />
                  )}
                  <motion.circle
                    r={12}
                    fill={
                      isBest
                        ? "#0ef0c9"
                        : node.status === "pruned"
                        ? "rgba(255,255,255,0.08)"
                        : "#7c9dff"
                    }
                    stroke={isBest ? "#6fffe0" : node.status === "pruned" ? "rgba(255,255,255,0.2)" : "#d6c9ff"}
                    strokeWidth={isBest ? 3 : node.status === "pruned" ? 1 : 2}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 120, damping: 12 }}
                  />
                  <text className="tree-label" x={0} y={4}>
                    {node.path.join("→")}
                  </text>
                  <text className="tree-sub" x={0} y={20}>
                    {node.status === "pruned" ? "pruned" : `bound ${node.bound.toFixed(1)}`}
                  </text>
                </g>
              );
            })}
          </motion.g>
        ) : (
          <g transform={`translate(${effectiveXManual}, ${effectiveYManual})`}>
            {links.map((link) => (
              <line
                key={`${link.from.id}-${link.to.id}`}
                x1={link.from.x}
                y1={link.from.y}
                x2={link.to.x}
                y2={link.to.y}
                stroke={
                  bestPathEdges.has(`${link.from.id}-${link.to.id}`)
                    ? "#0ef0c9"
                    : "rgba(255,255,255,0.18)"
                }
                strokeWidth={bestPathEdges.has(`${link.from.id}-${link.to.id}`) ? 2.5 : 1.5}
                opacity={bestPathEdges.has(`${link.from.id}-${link.to.id}`) ? 0.95 : 1}
              />
            ))}

            {Object.values(nodes).map((node) => {
              const isCurrent = currentEvent?.node_id === node.id;
              const isBest = bestPathNodeIds.has(node.id);
              return (
                <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                  {isCurrent && (
                    <circle
                      r={18}
                      fill="rgba(142,120,255,0.15)"
                      style={{ filter: "url(#glowNode)" }}
                    />
                  )}
                  <circle
                    r={12}
                    fill={
                      isBest
                        ? "#0ef0c9"
                        : node.status === "pruned"
                        ? "rgba(255,255,255,0.08)"
                        : "#7c9dff"
                    }
                    stroke={isBest ? "#6fffe0" : node.status === "pruned" ? "rgba(255,255,255,0.2)" : "#d6c9ff"}
                    strokeWidth={isBest ? 3 : node.status === "pruned" ? 1 : 2}
                  />
                  <text className="tree-label" x={0} y={4}>
                    {node.path.join("→")}
                  </text>
                  <text className="tree-sub" x={0} y={20}>
                    {node.status === "pruned" ? "pruned" : `bound ${node.bound.toFixed(1)}`}
                  </text>
                </g>
              );
            })}
          </g>
        )}
      </svg>
    </div>
  );
};

export default SearchTreeView;
