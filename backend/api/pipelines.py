from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import subprocess
import os

class PipelineTriggerRequest(BaseModel):
    commit_message: str = "🚀 Auto-deployed via QA Genius Pipeline"


router = APIRouter(prefix="/api/pipelines", tags=["pipelines"])

@router.post("/trigger")
async def trigger_pipeline(request: PipelineTriggerRequest):
    # Execute git commands in the root of the project
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    try:
        # Add all files
        subprocess.run(["git", "add", "."], cwd=root_dir, check=True, capture_output=True, text=True)
        
        # Check if there are changes to commit
        status_proc = subprocess.run(["git", "status", "--porcelain"], cwd=root_dir, check=True, capture_output=True, text=True)
        if not status_proc.stdout.strip():
            return {"status": "success", "message": "No changes to commit, but pipeline triggered successfully."}
            
        # Commit changes
        subprocess.run(["git", "commit", "-m", request.commit_message], cwd=root_dir, check=True, capture_output=True, text=True)
        
        # Push changes to origin main
        push_proc = subprocess.run(["git", "push", "origin", "main"], cwd=root_dir, check=True, capture_output=True, text=True)
        
        return {"status": "success", "message": "Code successfully pushed to GitHub!", "details": push_proc.stdout}
    except subprocess.CalledProcessError as e:
        error_msg = f"Command '{e.cmd}' failed with exit status {e.returncode}.\nStdout: {e.stdout}\nStderr: {e.stderr}"
        raise HTTPException(status_code=500, detail=error_msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_pipeline_history():
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    try:
        # Run git log and format output: hash|author|message|date
        log_proc = subprocess.run(
            ["git", "log", "--pretty=format:%h|%an|%s|%ar", "-n", "15"], 
            cwd=root_dir, 
            check=True, 
            capture_output=True, 
            text=True
        )
        
        commits = []
        for line in log_proc.stdout.splitlines():
            parts = line.split("|", 3)
            if len(parts) == 4:
                commits.append({
                    "hash": parts[0],
                    "author": parts[1],
                    "message": parts[2],
                    "time_ago": parts[3]
                })
                
        return {"status": "success", "history": commits}
    except subprocess.CalledProcessError as e:
        error_msg = f"Command '{e.cmd}' failed with exit status {e.returncode}."
        raise HTTPException(status_code=500, detail=error_msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
