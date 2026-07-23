import importlib, sys
mods=['rag.services.generation_service','rag.services.memory_service','rag.services.background_job','rag.services.cache_manager','rag.services.metrics_service','rag.services.health_service','documents.services.drive_sync_manager','rag.services.indexing_service','rag.retrievers.semantic_retriever','rag.retrievers.bm25_retriever','rag.retrievers.hybrid_retriever','rag.retrievers.reranker']
errs=0
for m in mods:
    try:
        importlib.import_module(m)
        print('OK', m)
    except Exception as e:
        print('ERR', m, e)
        errs+=1
sys.exit(errs)
