# TSP 探索可視化 PoC

「分枝限定で実際に探索したログ」をそのまま可視化する PoC です。  
クリックでノードを配置 → 「探索開始」でソルバーを実行 → タイムラインで探索木とベスト巡回路を再生できます。

## 特徴
- バックエンドは Python + FastAPI。DFS 分枝限定 TSP ソルバー（MST 下界）で expand/prune/best_update をログ出力。
- フロントは Vite + React + TypeScript。GraphView でベスト巡回路、SearchTreeView で探索木をアニメーション表示。
- タイムライン操作（再生/停止/速度変更/シーク）でログを自由に再生。
- ノード編集 UI：追加（ボタン→キャンバスクリック）、ドラッグ移動、選択して削除。ID は毎回連番振り直しでルート不整合を防止。

## リポジトリ構成
- `backend/` : FastAPI エンドポイントと分枝限定ソルバー
  - `main.py` : `POST /solve` でノード座標を受け取り、ログと最良解を返す
  - `solve_tsp.py` : DFS + MST 下界の TSP ソルバー（expand/prune/best_update を記録）
  - `requirements.txt`
- `frontend/` : Vite + React UI
  - `src/App.tsx` : 全体の状態管理と画面構成
  - `src/components/GraphView.tsx` : ノード編集とベスト巡回路表示
  - `src/components/SearchTreeView.tsx` : 探索木の可視化（再生中オートパン、停止中ドラッグ）
  - `src/components/TimelineController.tsx` : 再生コントロール
  - `src/api.ts` : `/solve` 呼び出し
- `Architecture.md` : 詳細アーキテクチャ
- `codex/prompts` : 重要ポイントのメモ

## バックエンドの起動
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload  # http://localhost:8000
```

## フロントエンドの起動
```bash
cd frontend
npm install
npm run dev  # http://localhost:5173
```
- バックエンドのポート/ホストを変える場合は `frontend/.env` に `VITE_API_URL=http://localhost:8000` などを設定。

## 使い方
1. 「ノードを追加」を押し、キャンバスをクリックしてノード配置。ドラッグで移動、選択後に「選択ノードを削除」。
2. 「探索開始」でバックエンドにノードを送信し、ログを取得。
3. タイムラインで再生/一時停止/速度変更/シーク。  
   - GraphView: 現在までに見つかったベスト巡回路を発光ラインで表示（未発見なら非表示）。  
   - SearchTreeView: 展開ノードは紫、枝刈りはグレー、再生中は先端を自動追尾。再生停止中はドラッグで任意位置を閲覧。  
   - 再生終了後は最適解の枝をシアンでハイライト。

## API 仕様（簡易）
- `POST /solve`
  - Body: `{ "nodes": [ { "x": number, "y": number }, ... ] }`
  - Response: `{ best_route: number[], best_cost: number|null, log: Event[], node_positions: [...] }`
  - Event: `{ step, type:"expand"|"prune"|"best_update", node_id, parent_id, path, cost, bound, best_route?, best_cost? }`

## 既知の前提・注意
- 小規模インスタンス向け（教育用デモ）。性能チューニングは未実施。
- ログは一括返却。イベント数が多い場合はストリーミング化が拡張候補。

## 将来の拡張アイデア
- OR-Tools CP-SAT への置き換え（同ログ形式で出力）。
- メトリクスビュー追加（UB/LB/gap 推移）。
- SSE/WebSocket による逐次ログ配信。
- 複数アルゴリズムの並列比較表示。
