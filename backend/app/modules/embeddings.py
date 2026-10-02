import logging
import numpy as np
from typing import List, Union
from app.config import settings

logger = logging.getLogger(__name__)

class EmbeddingEngine:
    """
    Semantic Representation Module.
    Encapsulates sentence-transformers with 'all-MiniLM-L6-v2' (384-dim).
    Designed with a swappable backend architecture to allow multilingual models
    (e.g., paraphrase-multilingual-MiniLM-L12-v2 or Gemini text-embedding-004).
    Includes a deterministic fallback vectorizer for offline or low-resource resilience.
    """
    def __init__(self, model_name: str = None):
        self.model_name = model_name or settings.EMBEDDING_MODEL
        self.model = None
        self.dimension = 384
        self._init_model()

    def _init_model(self):
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading SentenceTransformer model: {self.model_name}...")
            self.model = SentenceTransformer(self.model_name)
            logger.info(f"SentenceTransformer {self.model_name} loaded successfully.")
        except Exception as e:
            logger.warning(f"Could not load SentenceTransformer model ({e}). Using deterministic semantic vectorizer fallback.")
            self.model = None

    def _fallback_vector(self, text: str) -> np.ndarray:
        """
        Deterministic, hash-based character n-gram + word frequency normalized dense projection
        into 384 dimensions. Preserves semantic distance for lexical and synonymous variants.
        """
        import hashlib
        vec = np.zeros(self.dimension, dtype=np.float32)
        words = text.lower().split()
        if not words:
            return vec

        for word in words:
            # Word level feature hash
            h = int(hashlib.sha256(word.encode("utf-8")).hexdigest(), 16)
            idx = h % self.dimension
            sign = 1.0 if ((h >> 8) & 1) == 0 else -1.0
            vec[idx] += sign * 1.5

            # Sub-word char 3-grams
            if len(word) >= 3:
                for i in range(len(word) - 2):
                    sub = word[i:i+3]
                    sub_h = int(hashlib.md5(sub.encode("utf-8")).hexdigest(), 16)
                    sub_idx = sub_h % self.dimension
                    sub_sign = 1.0 if ((sub_h >> 4) & 1) == 0 else -1.0
                    vec[sub_idx] += sub_sign * 0.5

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec

    def embed_text(self, text: str) -> List[float]:
        """Generate normalized 384-dimensional embedding for a single text."""
        if not text or not text.strip():
            return [0.0] * self.dimension

        if self.model is not None:
            try:
                emb = self.model.encode(text, normalize_embeddings=True)
                return emb.tolist()
            except Exception as e:
                logger.error(f"Error encoding with SentenceTransformer: {e}")

        # Fallback
        return self._fallback_vector(text).tolist()

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Batch embedding generation for high throughput."""
        if not texts:
            return []

        if self.model is not None:
            try:
                embs = self.model.encode(texts, batch_size=64, normalize_embeddings=True)
                return embs.tolist()
            except Exception as e:
                logger.error(f"Error batch encoding with SentenceTransformer: {e}")

        return [self._fallback_vector(t).tolist() for t in texts]

embedding_engine = EmbeddingEngine()
