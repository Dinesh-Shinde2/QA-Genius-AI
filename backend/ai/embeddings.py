import os
import logging
import hashlib
import numpy as np

logger = logging.getLogger(__name__)

# Embedding dimensions: 384 for BAAI/bge-small-en
EMBEDDING_DIM = 384

_model = None

def get_fallback_embedding(text: str) -> list:
    """
    Generates a deterministic pseudo-random float vector of size 384 based on the SHA-256 hash
    of the input text. This acts as a robust offline/memory fallback so pgvector operations
    do not throw errors.
    """
    logger.debug("Generating fallback pseudo-embedding...")
    vector = []
    for i in range(EMBEDDING_DIM):
        # Create unique seed for each index
        h = hashlib.sha256(f"{text}-{i}".encode('utf-8')).hexdigest()
        val = int(h[:8], 16) / 4294967295.0 # normalized between 0.0 and 1.0
        vector.append(float(val - 0.5) * 2.0) # range -1.0 to 1.0
    
    # Normalize vector
    norm = np.linalg.norm(vector)
    if norm > 0:
        vector = (np.array(vector) / norm).tolist()
    return vector

async def get_embedding(text: str) -> list:
    global _model
    
    # Standardize input
    text = (text or "").strip()
    if not text:
        return [0.0] * EMBEDDING_DIM
        
    # Attempt local loading if environment allows (local dev)
    if os.getenv("USE_LOCAL_EMBEDDINGS", "false").lower() == "true":
        try:
            from sentence_transformers import SentenceTransformer
            if _model is None:
                logger.info("Loading local SentenceTransformer model: BAAI/bge-small-en...")
                _model = SentenceTransformer("BAAI/bge-small-en")
            embeddings = _model.encode([text], normalize_embeddings=True)
            return embeddings[0].tolist()
        except Exception as e:
            logger.warning(f"Failed to run local sentence-transformers: {e}. Trying cloud API...")
            
    # Try Hugging Face free serverless inference API
    try:
        import httpx
        url = "https://api-inference.huggingface.co/pipeline/feature-extraction/BAAI/bge-small-en"
        # We try to call Hugging Face without auth headers (it has generous free rate limits for public models)
        headers = {}
        hf_token = os.getenv("HF_API_TOKEN")
        if hf_token:
            headers["Authorization"] = f"Bearer {hf_token}"
            
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json={"inputs": text}, headers=headers, timeout=10.0)
            if response.status_code == 200:
                vector = response.json()
                if isinstance(vector, list) and len(vector) > 0:
                    # Sometimes HF returns a nested list or sequence
                    if isinstance(vector[0], list):
                        vector = vector[0]
                    # Ensure matching dimension
                    if len(vector) == EMBEDDING_DIM:
                        return vector
                    else:
                        logger.warning(f"Cloud embedding dimension mismatch: got {len(vector)}, expected {EMBEDDING_DIM}")
            else:
                logger.warning(f"Hugging Face API returned status code {response.status_code}")
    except Exception as e:
        logger.warning(f"Error calling Hugging Face embeddings API: {e}")
        
    # Fallback to pseudo-random hash-based vector
    return get_fallback_embedding(text)
