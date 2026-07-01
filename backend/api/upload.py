import os
import shutil
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from dotenv import load_dotenv

from backend.database import db
from backend.services.ocr_service import extract_text_from_file
from backend.ai.ai_service import analyze_requirement
from backend.ai.embeddings import get_embedding
from backend.api.auth import get_current_user

load_dotenv()

router = APIRouter(prefix="/api/upload", tags=["upload"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

logger = logging.getLogger(__name__)

@router.post("", response_model=dict)
async def upload_requirement(
    project_id: str = Form(...),
    module: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    # Verify project ownership
    project = await db.fetchrow(
        "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
        project_id, current_user["id"]
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or unauthorized access"
        )
        
    # Check extension
    filename = file.filename
    ext = filename.split(".")[-1].upper() if "." in filename else ""
    if ext not in ["PDF", "DOCX", "TXT", "PNG", "JPG", "JPEG"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format: {ext}. Upload PDF, DOCX, TXT, or images."
        )
        
    # Save file temporarily
    temp_file_path = os.path.join(UPLOAD_DIR, f"{project_id}_{filename}")
    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to write file to disk: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save file to temporary storage"
        )
        
    try:
        # Extract text
        extracted_text = extract_text_from_file(temp_file_path, ext)
        if not extracted_text.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Extracted document text was empty. Please check file readability."
            )
            
        # Run AI Requirement Analysis
        extracted_details = await analyze_requirement(extracted_text)
        
        # Extract title from filename (remove extension)
        title = ".".join(filename.split(".")[:-1])
        
        # Generate text embedding vector
        vector = await get_embedding(extracted_text)
        
        # Save to database
        # Note: pgvector can be populated from float array using cast or query binding
        req_id = await db.fetchval(
            """
            INSERT INTO requirements (project_id, title, module, description, file_type, extracted_features, embedding)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
            """,
            project_id, title, module, extracted_text, ext, json_dumps(extracted_details), vector
        )
        
        return {
            "success": True,
            "requirement_id": str(req_id),
            "title": title,
            "module": module,
            "extracted_features": extracted_details
        }
        
    except Exception as e:
        logger.error(f"Error processing upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing document requirement: {str(e)}"
        )
    finally:
        # Clean up temp file
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception as e:
                logger.warning(f"Failed to remove temp file {temp_file_path}: {e}")

# Helper to dump JSON dynamically
def json_dumps(data: dict) -> str:
    import json
    return json.dumps(data)
