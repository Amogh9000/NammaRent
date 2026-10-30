"""
Retriever and Knowledge Base Loader for Namma Tenant Navigator.
Indexes curated Karnataka/Bengaluru tenancy law chunks into Chroma with
sentence-transformers/all-MiniLM-L6-v2 embeddings.
"""

import os
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
import yaml
from pydantic import BaseModel

from backend.config import settings

class KBChunk(BaseModel):
    id: str
    title: str
    act: str
    section: str
    verified: bool
    source_url: str
    plain_summary: str
    statute_text: str
    full_content: str
    score: Optional[float] = None

class KnowledgeBase:
    _instance = None

    def __init__(self, kb_dir: Optional[Path] = None):
        self.kb_dir = kb_dir or settings.KB_DIR
        self.chunks: Dict[str, KBChunk] = {}
        self.vector_store = None
        self._load_markdown_chunks()
        self._init_vector_store()

    @classmethod
    def get_instance(cls) -> "KnowledgeBase":
        if cls._instance is None:
            cls._instance = KnowledgeBase()
        return cls._instance

    def _load_markdown_chunks(self) -> None:
        """Parses all .md files in the kb directory with frontmatter."""
        if not self.kb_dir.exists():
            return

        for filepath in self.kb_dir.glob("*.md"):
            if filepath.name.lower() == "readme.md":
                continue

            raw_text = filepath.read_text(encoding="utf-8")
            chunk = self._parse_chunk(raw_text, filepath.name)
            if chunk:
                self.chunks[chunk.id] = chunk

    def _parse_chunk(self, raw_text: str, filename: str) -> Optional[KBChunk]:
        """Extracts YAML frontmatter and body sections."""
        pattern = r"^---\s*\n(.*?)\n---\s*\n(.*)$"
        match = re.match(pattern, raw_text, re.DOTALL)
        if not match:
            return None

        frontmatter_str, body = match.groups()
        try:
            meta = yaml.safe_load(frontmatter_str) or {}
        except Exception:
            return None

        chunk_id = meta.get("id", f"KB-{filename[:3].upper()}")
        title = meta.get("title", filename.replace(".md", "").replace("_", " ").title())
        act = meta.get("act", "Karnataka Tenancy Regulations")
        section = meta.get("section", "General")
        verified = bool(meta.get("verified", False))
        source_url = meta.get("source_url", "https://dpal.karnataka.gov.in/")

        # Extract plain summary and statutory provision
        summary_match = re.search(r"### Plain-Language Summary\s*\n(.*?)(?=\n###|\Z)", body, re.DOTALL)
        plain_summary = summary_match.group(1).strip() if summary_match else body.strip()

        statute_match = re.search(r"### Statutory Provision\s*\n(.*)$", body, re.DOTALL)
        statute_text = statute_match.group(1).strip() if statute_match else ""

        full_content = f"{title}\nAct: {act} ({section})\nSummary: {plain_summary}\nStatute: {statute_text}"

        return KBChunk(
            id=chunk_id,
            title=title,
            act=act,
            section=section,
            verified=verified,
            source_url=source_url,
            plain_summary=plain_summary,
            statute_text=statute_text,
            full_content=full_content
        )

    def _init_vector_store(self) -> None:
        """Initializes ChromaDB with embeddings for semantic search."""
        if not self.chunks:
            return

        try:
            import chromadb
            from chromadb.utils import embedding_functions

            # Use local sentence-transformers embedding function
            emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
                model_name="all-MiniLM-L6-v2"
            )

            client = chromadb.PersistentClient(path=str(settings.CHROMA_DIR))
            # Create or reset collection
            collection_name = "karnataka_tenancy_kb"
            try:
                client.delete_collection(name=collection_name)
            except Exception:
                pass

            collection = client.create_collection(
                name=collection_name,
                embedding_function=emb_fn,
                metadata={"hnsw:space": "cosine"}
            )

            ids = []
            documents = []
            metadatas = []

            for cid, chunk in self.chunks.items():
                ids.append(cid)
                documents.append(chunk.full_content)
                metadatas.append({
                    "id": chunk.id,
                    "title": chunk.title,
                    "act": chunk.act,
                    "section": chunk.section,
                    "verified": str(chunk.verified),
                    "source_url": chunk.source_url
                })

            collection.add(
                ids=ids,
                documents=documents,
                metadatas=metadatas
            )
            self.vector_store = collection
        except Exception as e:
            # Fallback to in-memory cosine keyword/term search if chromadb or torch fails
            self.vector_store = None

    def retrieve(self, query: str, top_k: int = 3) -> List[KBChunk]:
        """
        Retrieves relevant legal chunks matching the query.
        Returns empty list if no chunks pass relevance threshold.
        """
        if not query or not query.strip():
            return []

        if self.vector_store:
            try:
                results = self.vector_store.query(
                    query_texts=[query],
                    n_results=min(top_k, len(self.chunks))
                )
                
                matched: List[KBChunk] = []
                if results and "ids" in results and results["ids"]:
                    retrieved_ids = results["ids"][0]
                    distances = results["distances"][0] if "distances" in results and results["distances"] else [0.0] * len(retrieved_ids)

                    for cid, dist in zip(retrieved_ids, distances):
                        # Cosine distance: 0 is identical, > 0.65 is unrelated
                        similarity = 1.0 - dist
                        if similarity >= settings.RELEVANCE_THRESHOLD and cid in self.chunks:
                            chunk = self.chunks[cid].model_copy()
                            chunk.score = round(similarity, 3)
                            matched.append(chunk)

                    return matched
            except Exception:
                pass

        # Robust lexical fallback matching
        return self._lexical_search(query, top_k)

    def _lexical_search(self, query: str, top_k: int = 3) -> List[KBChunk]:
        """Keyword & token overlap fallback for strict deterministic retrieval."""
        q_tokens = set(re.findall(r"\w+", query.lower()))
        scored: List[tuple[float, KBChunk]] = []

        # Domain term boosts
        boost_keywords = {
            "deposit": ["deposit", "refund", "deduction", "painting", "vacate", "security"],
            "hike": ["hike", "increase", "escalation", "notice", "90 days", "revision"],
            "harassment": ["harassment", "water", "electricity", "cut", "lock", "threat", "utility"]
        }

        for chunk in self.chunks.values():
            chunk_tokens = set(re.findall(r"\w+", chunk.full_content.lower()))
            overlap = len(q_tokens.intersection(chunk_tokens))
            if overlap == 0:
                continue

            score = overlap / (len(q_tokens) + 1)
            # Check domain boosts
            for domain, kws in boost_keywords.items():
                if any(kw in query.lower() for kw in kws) and any(kw in chunk.full_content.lower() for kw in kws):
                    score += 0.3

            if score >= 0.25:
                c = chunk.model_copy()
                c.score = round(min(score, 1.0), 3)
                scored.append((score, c))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored[:top_k]]

    def get_chunk(self, chunk_id: str) -> Optional[KBChunk]:
        return self.chunks.get(chunk_id)

    def get_all_chunks(self) -> List[KBChunk]:
        return list(self.chunks.values())
