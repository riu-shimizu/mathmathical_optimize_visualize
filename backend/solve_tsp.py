import math
from dataclasses import dataclass
from itertools import count
from typing import Dict, List, Optional, Set, Tuple


@dataclass
class TspEvent:
    step: int
    type: str  # "expand" | "prune" | "best_update"
    node_id: str
    parent_id: Optional[str]
    path: List[int]
    cost: float
    bound: float
    reason: Optional[str] = None
    best_route: Optional[List[int]] = None
    best_cost: Optional[float] = None


def euclidean(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    ax, ay = a
    bx, by = b
    return math.hypot(ax - bx, ay - by)


def build_distance_matrix(points: List[Tuple[float, float]]) -> List[List[float]]:
    n = len(points)
    dist = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            d = euclidean(points[i], points[j])
            dist[i][j] = dist[j][i] = d
    return dist


def solve_tsp(nodes: List[Dict[str, float]]) -> Dict:
    """
    Depth-first branch-and-bound TSP solver.
    Returns best route and a chronological log of expand/prune/best_update events.
    """
    if not nodes:
        return {
            "best_route": [],
            "best_cost": 0.0,
            "log": [],
            "node_positions": [],
        }

    coords = [(float(n["x"]), float(n["y"])) for n in nodes]
    dist = build_distance_matrix(coords)
    n = len(nodes)
    start = 0
    def mst_cost(indices: List[int]) -> float:
        """Prim's algorithm on a subset to get a tight admissible lower bound."""
        if len(indices) <= 1:
            return 0.0
        in_tree = {indices[0]}
        remaining = set(indices[1:])
        total = 0.0
        while remaining:
            best_edge = float("inf")
            best_node = None
            for i in in_tree:
                for j in remaining:
                    if dist[i][j] < best_edge:
                        best_edge = dist[i][j]
                        best_node = j
            total += best_edge
            in_tree.add(best_node)  # type: ignore[arg-type]
            remaining.remove(best_node)  # type: ignore[arg-type]
        return total

    def lower_bound(path: List[int], cost_so_far: float, remaining: Set[int]) -> float:
        """
        Admissible bound: current cost + connect last->remaining + MST(remaining) + return to start.
        """
        if not remaining:
            return cost_so_far + dist[path[-1]][start]

        last = path[-1]
        remaining_list = list(remaining)
        connect_last = min(dist[last][j] for j in remaining_list)
        back_to_start = min(dist[j][start] for j in remaining_list)
        tree_cost = mst_cost(remaining_list)
        return cost_so_far + connect_last + tree_cost + back_to_start

    events: List[TspEvent] = []
    node_counter = count()

    best_cost = float("inf")
    best_route: Optional[List[int]] = None

    stack: List[Tuple[str, Optional[str], List[int], float]] = []
    root_id = f"n{next(node_counter)}"
    stack.append((root_id, None, [start], 0.0))

    step = 0

    while stack:
        node_id, parent_id, path, cost = stack.pop()
        remaining = set(range(n)) - set(path)
        bound = lower_bound(path, cost, remaining)
        events.append(
            TspEvent(
                step=step,
                type="expand",
                node_id=node_id,
                parent_id=parent_id,
                path=path,
                cost=cost,
                bound=bound,
            )
        )
        step += 1

        if bound >= best_cost:
            events.append(
                TspEvent(
                    step=step,
                    type="prune",
                    node_id=node_id,
                    parent_id=parent_id,
                    path=path,
                    cost=cost,
                    bound=bound,
                    reason="bound>=best",
                )
            )
            step += 1
            continue

        if not remaining:
            tour_cost = cost + dist[path[-1]][start]
            if tour_cost < best_cost:
                best_cost = tour_cost
                best_route = path + [start]
                events.append(
                    TspEvent(
                        step=step,
                        type="best_update",
                        node_id=node_id,
                        parent_id=parent_id,
                        path=path,
                        cost=tour_cost,
                        bound=bound,
                        best_route=best_route,
                        best_cost=best_cost,
                    )
                )
                step += 1
            continue

        # Generate children (DFS stack push in reverse for deterministic order)
        candidates = sorted(list(remaining))
        for next_city in reversed(candidates):
            edge_cost = dist[path[-1]][next_city]
            new_path = path + [next_city]
            new_cost = cost + edge_cost
            child_remaining = remaining - {next_city}
            child_bound = lower_bound(new_path, new_cost, child_remaining)
            child_id = f"n{next(node_counter)}"

            events.append(
                TspEvent(
                    step=step,
                    type="expand",
                    node_id=child_id,
                    parent_id=node_id,
                    path=new_path,
                    cost=new_cost,
                    bound=child_bound,
                )
            )
            step += 1

            if child_bound >= best_cost:
                events.append(
                    TspEvent(
                        step=step,
                        type="prune",
                        node_id=child_id,
                        parent_id=node_id,
                        path=new_path,
                        cost=new_cost,
                        bound=child_bound,
                        reason="bound>=best",
                    )
                )
                step += 1
                continue

            stack.append((child_id, node_id, new_path, new_cost))

    response = {
        "best_route": best_route or [],
        "best_cost": best_cost if best_route else None,
        "log": [e.__dict__ for e in events],
        "node_positions": [{"id": i, "x": x, "y": y} for i, (x, y) in enumerate(coords)],
    }
    return response


if __name__ == "__main__":
    # quick manual run
    sample_nodes = [
        {"x": 0, "y": 0},
        {"x": 1, "y": 0},
        {"x": 1, "y": 1},
        {"x": 0, "y": 1},
    ]
    result = solve_tsp(sample_nodes)
    print(f"best cost: {result['best_cost']}")
    print(f"log length: {len(result['log'])}")
