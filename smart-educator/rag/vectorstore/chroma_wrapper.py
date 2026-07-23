import logging
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings

logger = logging.getLogger(__name__)


class ChromaWrapper:
    def __init__(self, collection_name: str = "rag_documents", persist_directory: str = "./chroma_db"):
        self.client = chromadb.Client(Settings(persist_directory=persist_directory))
        self.collection = self.client.get_or_create_collection(name=collection_name)

    def add_embeddings(self, ids: List[str], vectors: List[List[float]], metadatas: List[Dict[str, Any]], documents: Optional[List[str]] = None):
        try:
            # sanitize metadata values to primitives (chroma bindings require simple types)
            safe_mds = []
            for md in metadatas:
                safe = {}
                for k, v in md.items():
                    # convert all metadata values to strings to satisfy chroma bindings
                    try:
                        safe[k] = v if isinstance(v, str) else (str(v) if v is not None else "")
                    except Exception:
                        safe[k] = repr(v)
                safe_mds.append(safe)
            self.collection.add(ids=ids, embeddings=vectors, metadatas=safe_mds, documents=documents or [])
        except Exception as e:
            logger.exception('Failed to add embeddings')
            raise

    def update_document(self, id: str, metadata: Dict[str, Any], embedding: Optional[List[float]] = None):
        try:
            # chroma does not support single update in all versions; replace via delete/add
            self.collection.update(ids=[id], metadatas=[metadata])
            if embedding is not None:
                # no direct update embedding; re-add
                self.collection.add(ids=[id], embeddings=[embedding], metadatas=[metadata])
        except Exception as e:
            logger.exception('Failed to update document')
            raise

    def delete_document(self, id: str):
        try:
            self.collection.delete(ids=[id])
        except Exception as e:
            logger.exception('Failed to delete document')
            raise

    def search(self, query_embedding: List[float], n_results: int = 5, filter: Optional[Dict[str, Any]] = None):
        try:
            return self.collection.query(query_embeddings=[query_embedding], n_results=n_results, where=filter)
        except Exception as e:
            logger.exception('Search failed')
            raise

    def health_check(self) -> bool:
        try:
            # simple check
            _ = self.collection.count()
            return True
        except Exception:
            return False
