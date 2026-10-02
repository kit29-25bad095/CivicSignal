import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict, Any, Tuple
from app.config import settings

class SimilarityEngine:
    """
    Step 4 — Similarity Analysis
    Calculates cosine similarity across complaint embeddings.
    Categorizes relationships according to configurable thresholds:
      - 0.90+ -> HIGHLY_SIMILAR
      - 0.75 - 0.89 -> POTENTIALLY_RELATED
      - < 0.75 -> NORMALLY_UNRELATED
    """
    def __init__(self, high_thresh: float = None, related_thresh: float = None):
        self.high_threshold = high_thresh if high_thresh is not None else settings.SIMILARITY_HIGH_THRESHOLD
        self.related_threshold = related_thresh if related_thresh is not None else settings.SIMILARITY_RELATED_THRESHOLD

    def classify_similarity(self, score: float) -> str:
        if score >= self.high_threshold:
            return "HIGHLY_SIMILAR"
        elif score >= self.related_threshold:
            return "POTENTIALLY_RELATED"
        else:
            return "NORMALLY_UNRELATED"

    def compute_pairwise_matrix(self, embeddings: List[List[float]]) -> np.ndarray:
        """Computes NxN cosine similarity matrix."""
        if not embeddings:
            return np.empty((0, 0))
        X = np.array(embeddings, dtype=np.float32)
        # Assuming normalized embeddings, cosine_similarity is dot product
        return cosine_similarity(X, X)

    def find_top_matches(
        self,
        target_embedding: List[float],
        candidate_embeddings: List[List[float]],
        candidate_metadata: List[Dict[str, Any]],
        top_k: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Finds the top similar complaints against a target embedding.
        """
        if not candidate_embeddings:
            return []

        target_arr = np.array([target_embedding], dtype=np.float32)
        candidates_arr = np.array(candidate_embeddings, dtype=np.float32)

        sims = cosine_similarity(target_arr, candidates_arr)[0]
        sorted_indices = np.argsort(sims)[::-1][:top_k]

        results = []
        for idx in sorted_indices:
            score = float(sims[idx])
            classification = self.classify_similarity(score)
            match_info = dict(candidate_metadata[idx])
            match_info["similarity_score"] = round(score, 4)
            match_info["classification"] = classification
            results.append(match_info)

        return results

similarity_engine = SimilarityEngine()
