from typing import Optional

from pydantic import BaseModel


class RunResponse(BaseModel):
    run_id: str
    status: str


class RunStatus(BaseModel):
    run_id: str
    status: str
    progress: int
    total_questions: int
    completed_questions: int
    error: Optional[str] = None