import logging
import math
from backend.database import db
from backend.ai.embeddings import get_embedding

logger = logging.getLogger(__name__)

# Distance Threshold: 0.18 represents ~82% cosine similarity.
# Values below 0.18 indicate potential duplicate cases.
DUPLICATE_THRESHOLD = 0.18

def calculate_cosine_distance(v1: list, v2: list) -> float:
    """
    Calculates cosine distance (1.0 - cosine_similarity) between two float vectors.
    Uses pure Python math module to run dependency-free.
    """
    if not v1 or not v2 or len(v1) != len(v2):
        return 1.0
        
    dot_product = sum(x * y for x, y in zip(v1, v2))
    norm_v1 = math.sqrt(sum(x * x for x in v1))
    norm_v2 = math.sqrt(sum(y * y for y in v2))
    
    if norm_v1 == 0.0 or norm_v2 == 0.0:
        return 1.0
        
    similarity = dot_product / (norm_v1 * norm_v2)
    # Cosine distance is 1 - similarity
    return 1.0 - similarity

async def find_duplicate_test_cases(project_id: str, scenario: str) -> list:
    """
    Finds similar test cases in the same project based on semantic similarity of scenarios.
    Calculates similarity in Python memory, making it 100% compatible with standard PostgreSQL.
    """
    try:
        embedding = await get_embedding(scenario)
        
        # Fetch all test cases for this project to compare embeddings
        rows = await db.fetch(
            """
            SELECT id, custom_id, scenario, priority, case_type, embedding
            FROM test_cases
            WHERE project_id = $1 AND embedding IS NOT NULL
            """,
            project_id
        )
        
        duplicates = []
        for r in rows:
            db_embedding = r["embedding"]
            # Convert raw database float array if it's retrieved
            if db_embedding:
                # asyncpg returns PG array as a Python list of floats
                dist = calculate_cosine_distance(embedding, db_embedding)
                if dist < DUPLICATE_THRESHOLD:
                    similarity_pct = int((1 - dist) * 100)
                    duplicates.append({
                        "id": str(r["id"]),
                        "custom_id": r["custom_id"],
                        "scenario": r["scenario"],
                        "similarity": similarity_pct,
                        "priority": r["priority"],
                        "case_type": r["case_type"],
                        "distance": dist
                    })
                    
        # Sort duplicates by closest match (smallest distance)
        duplicates.sort(key=lambda x: x["distance"])
        return duplicates[:3]
        
    except Exception as e:
        logger.error(f"Error checking duplicate test cases: {e}")
        return []

async def find_duplicate_bugs(project_id: str, summary: str) -> list:
    """
    Finds similar bug reports in the same project based on semantic similarity of titles/summaries.
    """
    try:
        rows = await db.fetch(
            """
            SELECT id, custom_id, title, severity, priority
            FROM bug_reports
            WHERE project_id = $1 AND (title ILIKE $2 OR summary ILIKE $2)
            LIMIT 3
            """,
            project_id, f"%{summary[:30]}%"
        )
        return [
            {
                "id": str(r["id"]),
                "custom_id": r["custom_id"],
                "title": r["title"],
                "severity": r["severity"],
                "priority": r["priority"]
            } for r in rows
        ]
    except Exception as e:
        logger.error(f"Error checking duplicate bugs: {e}")
        return []
