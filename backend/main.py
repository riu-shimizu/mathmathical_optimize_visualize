from typing import List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .solve_tsp import solve_tsp


class TspNode(BaseModel):
    x: float
    y: float


class SolveRequest(BaseModel):
    nodes: List[TspNode]


class SolveResponse(BaseModel):
    best_route: List[int]
    best_cost: Optional[float]
    log: list
    node_positions: list


app = FastAPI(title="TSP Explorer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/solve", response_model=SolveResponse)
def solve(req: SolveRequest):
    result = solve_tsp([n.dict() for n in req.nodes])
    return result


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
