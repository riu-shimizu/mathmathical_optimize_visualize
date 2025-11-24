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
  { id: 1, x: 360, y: 100 },
  { id: 2, x: 420, y: 260 },
  { id: 3, x: 200, y: 280 },
];

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
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (!events.length) return 0;
        const next = prev + 1;
        if (next >= events.length) {
          setIsPlaying(false);
          return events.length - 1;
        }
        return next;
      });
    }, Math.max(80, 400 / playSpeed));
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
        path: e.path,
        cost: e.cost,
        bound: e.bound,
        reason: e.reason,
        best_route: e.best_route,
        best_cost: e.best_cost,
      }));
      setEvents(convertedEvents);
      // 初期状態ではまだ可行解がないので空表示にする
      setBestRoute([]);
      setBestCost(null);
      setCurrentStep(0);
      setIsPlaying(true);
    } catch (err) {
      console.error(err);
      alert("探索に失敗しました。バックエンドが起動しているか確認してください。");
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
          <div className="eyebrow">巡回セールスマン探索 PoC</div>
          <h1>TSP Explorer</h1>
          <p className="subtitle">探索木がぬるぬる伸びて光る、分枝限定の可視化デモ。</p>
        </div>
        <div className="header-actions">
          <button className="ghost" onClick={() => handleResetPlayback()}>
            先頭へ
          </button>
          <button className="primary" onClick={handleSolve} disabled={isLoading || nodes.length < 3}>
            {isLoading ? "探索中..." : "探索開始"}
          </button>
        </div>
      </header>

      <section className="grid">
        <div className="card glass">
          <div className="card-header">
            <div>
              <h2>ノード配置</h2>
              <p className="label">
                「ノードを追加」を押してキャンバスをクリック / ドラッグで移動 / 選択後に削除
              </p>
            </div>
            <div className="chip">ノード {nodes.length} 個</div>
          </div>
          <GraphView
            nodes={nodes}
            bestRoute={bestRoute}
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
            >
              ノードを追加
            </button>
            <button className="ghost" onClick={handleDeleteNode} disabled={selectedNodeId === null}>
              選択ノードを削除
            </button>
            <div className="metric">
              <span>ベスト巡回長</span>
              <strong>{bestCost ? bestCost.toFixed(2) : "-"}</strong>
            </div>
          </div>
        </div>

        <div className="card glass">
          <div className="card-header">
            <div>
              <h2>探索木ビュー</h2>
              <p className="label">展開：紫 / 枝刈り：グレー / 現在ノード：グロー</p>
            </div>
            <div className="chip">イベント {events.length}</div>
          </div>
          <SearchTreeView
            events={eventTreeSlice}
            currentEvent={events[currentStep]}
            currentStep={currentStep}
            isPlaying={isPlaying}
            isFinished={events.length > 0 && currentStep >= events.length - 1}
            bestRoute={bestRoute}
          />
        </div>
      </section>

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
    </div>
  );
}

export default App;
