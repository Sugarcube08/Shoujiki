from fastapi import FastAPI
from pydantic import BaseModel
from runner import run_agent_code
from typing import Dict, List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()


class ExecutionRequest(BaseModel):
    agent_id: str
    files: Dict[str, str]
    requirements: List[str]
    entrypoint: str
    input_data: str  # JSON string
    env_vars: Dict[str, str] = {}


@app.post("/execute")
async def execute(req: ExecutionRequest):
    try:
        success, output, error, hire_requests, generated_files = run_agent_code(
            agent_id=req.agent_id,
            files=req.files,
            requirements=req.requirements,
            entrypoint=req.entrypoint,
            input_data=req.input_data,
            env_vars=req.env_vars,
        )
        return {
            "success": success,
            "output": output,
            "error": error,
            "hire_requests": hire_requests,
            "generated_files": generated_files,
        }
    except Exception as e:
        import traceback

        traceback.print_exc()
        return {
            "success": False,
            "output": "",
            "error": str(e),
            "hire_requests": [],
            "generated_files": {},
        }
