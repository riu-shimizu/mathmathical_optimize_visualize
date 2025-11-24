import { useEffect, useMemo, useState } from "react";
import { solveTsp, SolveResponse } from "./api";
import GraphView, { NodePoint } from "./components/GraphView";
import SearchTreeView from "./components/SearchTreeView";
import TimelineController from "./components/TimelineController";

export type SearchEventType = "expand" | "prune" | "best_update";

export type SearchEvent = {
  step: number;
  type: SearchEventType;
  node_id: string;
  parent_id?: string | null;
  path: number[];
  cost: number;
  bound: number;
  reason?: string;
  best_route?: number[];
  best_cost?: number;
};

const initialNodes: NodePoint[] = [
  { id: 0, x: 120, y: 120 },
  { id: 1, x: 340, y: 80 },
  { id: 2, x: 420, y: 260 },
  { id: 3, x: 100, y: 280 },
  { id: 4, x: 320, y: 220 },
];

const MAX_NODES = 10;

function App() {
  const [nodes, setNodes] = useState<NodePoint[]>(initialNodes);
  const [events, setEvents] = useState<SearchEvent[]>([]);
  const [bestRoute, setBestRoute] = useState<number[]>([]);
  const [bestCost, setBestCost] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [addMode, setAddMode] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = Math.max(8, 400 / playSpeed);
    const stepJump = Math.max(1, Math.round(playSpeed / 8));
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (!events.length) return 0;
        const next = prev + stepJump;
        if (next >= events.length) {
          setIsPlaying(false);
          return events.length - 1;
        }
        return next;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [isPlaying, events.length, playSpeed]);

  useEffect(() => {
    const seenBest = events.slice(0, currentStep + 1).filter((e) => e.type === "best_update");
    if (seenBest.length) {
      const last = seenBest[seenBest.length - 1];
      setBestRoute(last.best_route || []);
      setBestCost(last.best_cost ?? null);
    } else {
      setBestRoute([]);
      setBestCost(null);
    }
  }, [events, currentStep]);

  const eventTreeSlice = useMemo(() => events.slice(0, currentStep + 1), [events, currentStep]);
  const isFinished = events.length > 0 && currentStep >= events.length - 1;

  const resetPlayback = () => {
    setEvents([]);
    setBestRoute([]);
    setBestCost(null);
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const handleSolve = async () => {
    setIsLoading(true);
    setIsPlaying(false);
    setAddMode(false);
    try {
      const payloadNodes = nodes.map((n) => ({ x: n.x, y: n.y }));
      const result: SolveResponse = await solveTsp(payloadNodes);
      const convertedEvents: SearchEvent[] = result.log.map((e: any) => ({
        step: e.step,
        type: e.type,
        node_id: e.node_id,
        parent_id: e.parent_id,
        path: (e.path || []).map((p: number) => Number(p)),
        cost: e.cost,
        bound: e.bound,
        reason: e.reason,
        best_route: e.best_route ? e.best_route.map((p: number) => Number(p)) : undefined,
        best_cost: e.best_cost,
      }));
      if (result.node_positions?.length) {
        const normalized = result.node_positions.map((n) => ({
          id: Number(n.id),
          x: Number(n.x),
          y: Number(n.y),
        }));
        setNodes(normalized);
      }
      setEvents(convertedEvents);
      setBestRoute([]);
      setBestCost(null);
      setCurrentStep(0);
      setIsPlaying(true);
    } catch (err) {
      console.error(err);
      alert("Search failed. Please ensure the backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  const renumberNodes = (items: NodePoint[]) =>
    items.map((n, idx) => ({
      ...n,
      id: idx,
    }));

  const handleAddNode = (x: number, y: number) => {
    if (nodes.length >= MAX_NODES) {
      alert(`You can place up to ${MAX_NODES} nodes.`);
      setAddMode(false);
      return;
    }
    const newNodes = renumberNodes([...nodes, { id: nodes.length, x, y }]);
    setNodes(newNodes);
    setSelectedNodeId(newNodes.length - 1);
    setAddMode(false);
    resetPlayback();
  };

  const handleUpdateNode = (id: number, x: number, y: number) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)));
    resetPlayback();
  };

  const handleDeleteNode = () => {
    if (selectedNodeId === null) return;
    const filtered = nodes.filter((n) => n.id !== selectedNodeId);
    const renumbered = renumberNodes(filtered);
    setNodes(renumbered);
    setSelectedNodeId(null);
    resetPlayback();
  };

  const handleResetPlayback = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  return (
    <div className="page">
      <header className="header">
        <div>
          <div className="eyebrow">Algorithm Visualizer</div>
          <h1>Traveling Salesman Problem</h1>
          <p className="subtitle">
            Branch-and-bound search visualized with glowing search trees.
          </p>
        </div>
        <div className="header-actions">
          <button className="ghost" onClick={() => handleResetPlayback()}>
            Jump to Start
          </button>
          <button className="primary" onClick={handleSolve} disabled={isLoading || nodes.length < 3}>
            {isLoading ? "Searching..." : "Start Search"}
          </button>
        </div>
      </header>

      <section className="card glass timeline">
        <TimelineController
          totalSteps={Math.max(events.length - 1, 0)}
          currentStep={currentStep}
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying((p) => !p)}
          onStepChange={setCurrentStep}
          onSpeedChange={setPlaySpeed}
          playSpeed={playSpeed}
        />
      </section>

      <section className="grid">
        <div className="card glass">
          <div className="card-header">
            <div>
              <h2>Node Placement</h2>
              <p className="label">
                Click “Add node” then click canvas / drag to move / select then delete
              </p>
            </div>
            <div className="chip">
              Nodes: <br/>
              {nodes.length} / {MAX_NODES}
            </div>
          </div>
          <GraphView
            nodes={nodes}
            bestRoute={bestRoute}
            currentPath={isFinished ? [] : events[currentStep]?.path || []}
            addMode={addMode}
            onAddNode={handleAddNode}
            onMoveNode={handleUpdateNode}
            onSelectNode={setSelectedNodeId}
            selectedNodeId={selectedNodeId}
          />
          <div className="actions">
            <button
              className={addMode ? "primary" : "ghost"}
              onClick={() => setAddMode((v) => !v)}
              disabled={nodes.length >= MAX_NODES}
            >
              Add Node
            </button>
            <button className="ghost" onClick={handleDeleteNode} disabled={selectedNodeId === null}>
              Delete Selected
            </button>
            <div className="metric">
              <span>Best Tour Length</span>
              <strong>{bestCost ? bestCost.toFixed(2) : "-"}</strong>
            </div>
          </div>
        </div>

        <div className="card glass">
          <div className="card-header">
            <div>
              <h2>Search Tree</h2>
              <p className="label">Expand: purple / Pruned: gray / Current: glow</p>
            </div>
            <div className="chip">Events: {events.length}</div>
          </div>
          <SearchTreeView
            events={eventTreeSlice}
            currentEvent={events[currentStep]}
            currentStep={currentStep}
            isPlaying={isPlaying}
            isFinished={isFinished}
            bestRoute={bestRoute}
          />
        </div>
      </section>
    </div>
  );
}

export default App;
