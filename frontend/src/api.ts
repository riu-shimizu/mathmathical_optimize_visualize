import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

export type SolveResponse = {
  best_route: number[];
  best_cost: number | null;
  log: any[];
  node_positions: { id: number; x: number; y: number }[];
};

export async function solveTsp(nodes: { x: number; y: number }[]): Promise<SolveResponse> {
  const res = await api.post<SolveResponse>("/solve", { nodes });
  return res.data;
}
