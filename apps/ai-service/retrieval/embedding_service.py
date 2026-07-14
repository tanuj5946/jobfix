import hashlib
import math
import re


class EmbeddingService:
    """Deterministic local embeddings for question-bank retrieval infrastructure."""

    def __init__(self, dimension: int = 384):
        self.dimension = dimension

    def embed_text(self, text: str) -> list[float]:
        vector = [0.0] * self.dimension
        tokens = re.findall(r"[a-zA-Z0-9_+#.]+", text.lower())

        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % self.dimension
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[index] += sign

        norm = math.sqrt(sum(value * value for value in vector))
        if norm == 0:
            return vector

        return [round(value / norm, 8) for value in vector]

    def embed_question(
        self,
        question_text: str,
        role: str,
        skill: str,
        difficulty: str,
        question_type: str,
        tags: list[str] | None = None,
    ) -> list[float]:
        text = " ".join(
            [
                role,
                skill,
                difficulty,
                question_type,
                question_text,
                " ".join(tags or []),
            ]
        )
        return self.embed_text(text)
