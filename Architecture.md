# Architecture (詳細/日本語)

## PoCの目的
- 「実際の探索ログ」を生成し、フロントで探索木とベスト巡回路を同期表示する。
- ダミーデータ無し。分枝限定TSPソルバーが expand / prune / best_update を逐次記録。
- タイムライン再生で「伸びる」「枝刈りされる」を体験できるUIを提供。

## 全体構成
- バックエンド: Python + FastAPI (`backend/`)
- フロントエンド: Vite + React + TypeScript (`frontend/`)
- 通信: REST `POST /solve` にノード座標を渡し、探索結果とログを返す。

## データフロー
1. ユーザがキャンバス上でノード追加/移動/削除。
2. 「探索開始」でフロントがノード座標を`/solve`へPOST。
3. バックエンドの分枝限定ソルバーが探索し、ログと最良解を返却。
4. フロントがログを保持し、タイムラインでイベントをシーク/再生。
5. 再生位置に応じて:
   - GraphView: その時点までに見つかったベスト巡回路のみ表示（未発見なら非表示）。
   - SearchTreeView: 展開/枝刈りノードをアニメーション表示、再生中は自動パン、停止中はドラッグパン。

## バックエンド詳細
- エンドポイント: `backend/main.py` の `POST /solve`
- ソルバー: `backend/solve_tsp.py`
  - 深さ優先の分枝限定。
  - 距離: 入力座標のユークリッド距離。
  - 下界: 残りノードのMST + 現在末尾→残ノードへの接続 + 残ノード→始点の復帰。巡回を閉じるコストを常に含め、誤った枝刈りを防ぐ。
  - イベント: 時系列に `expand` / `prune` / `best_update` を記録。
  - 戻り値: `best_route`, `best_cost`, `log[]`, `node_positions[]`。
- 例（簡略JSON）:
  ```json
  {
    "best_route": [0,1,2,0],
    "best_cost": 4.0,
    "log": [
      { "step":0,"type":"expand","node_id":"n0","parent_id":null,"path":[0],"cost":0,"bound":... },
      { "step":5,"type":"best_update","best_route":[0,1,2,0],"best_cost":4.0 }
    ],
    "node_positions": [{ "id":0,"x":120,"y":120 }, ...]
  }
  ```

## フロントエンド詳細
- エントリ: `frontend/src/main.tsx` → `App.tsx`
- コンポーネント:
  - `GraphView.tsx`: ノード追加（「ノードを追加」ボタン→キャンバスクリック）、ドラッグ移動、選択/削除。ベスト巡回路をグロー線で表示。ホバー/選択ハイライトは位置ずれなし。
  - `SearchTreeView.tsx`: 2Dツリーレイアウト。展開ノードは紫、枝刈りはグレー。再生中はスプリング付きオートパン、停止中はドラッグで即座にパン。
  - `TimelineController.tsx`: 再生/一時停止、先頭/末尾ジャンプ、速度変更、スライダーシーク。
- 状態管理（App）:
  - `events`, `currentStep`, `isPlaying`, `playSpeed`
  - `bestRoute`/`bestCost`: `currentStep`までの`best_update`を集計し、未発見なら空。
  - ノードIDは追加/削除時に連番リセットし、ルート不整合を防止。
- API: `frontend/src/api.ts` で `/solve` にPOST。`VITE_API_URL`が無ければ `http://localhost:8000` を使用。

## 画面とインタラクション
- GraphView: ダーク+グラスモーフィズム。ノード追加はボタン押下後のみ有効。ドラッグで移動、選択後に削除。ベスト巡回路は発光ライン。
- SearchTreeView: イベント順にノードがスケールイン。枝刈りはグレーアウト。再生中は先端を自動で追跡、停止中はグラブドラッグで任意位置を見る。
- タイムライン: 速度0.5x〜3x、シークスライダ、先頭/末尾ボタン。

## ローカル実行
- バックエンド:
  ```bash
  cd backend
  python -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt
  uvicorn backend.main:app --reload
  ```
- フロントエンド:
  ```bash
  cd frontend
  npm install
  npm run dev
  # バックエンドが別ホスト/ポートなら .env に VITE_API_URL=http://localhost:8000 などを設定
  ```

## 今後の拡張アイデア
- CP-SAT(OR-Tools)への置き換え: `CpSolverSolutionCallback`で同じログ形式を吐く。
- メトリクスビュー追加: UB/LB/gap推移を折れ線でタイムライン同期。
- ログストリーミング: イベント数が多い場合はSSE/WebSocketに移行し、フロント側は逐次反映。
- 複数アルゴリズム比較: ログに`algorithm`を付与し、並列再生・比較を可能にする。
