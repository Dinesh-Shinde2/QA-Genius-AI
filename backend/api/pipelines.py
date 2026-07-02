from fastapi import APIRouter, HTTPException
import subprocess
import os

router = APIRouter(prefix="/api/pipelines", tags=["pipelines"])

@router.post("/trigger")
async def trigger_pipeline():
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
        subprocess.run(["git", "commit", "-m", "🚀 Auto-deployed via QA Genius Pipeline"], cwd=root_dir, check=True, capture_output=True, text=True)
        
        # Push changes to origin main
        push_proc = subprocess.run(["git", "push", "origin", "main"], cwd=root_dir, check=True, capture_output=True, text=True)
        
        return {"status": "success", "message": "Code successfully pushed to GitHub!", "details": push_proc.stdout}
    except subprocess.CalledProcessError as e:
        error_msg = f"Command '{e.cmd}' failed with exit status {e.returncode}.\nStdout: {e.stdout}\nStderr: {e.stderr}"
        raise HTTPException(status_code=500, detail=error_msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
