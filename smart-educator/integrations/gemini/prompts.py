def build_rag_prompt(question, context):
    context_text = '\n\n'.join(context or [])
    return f"You are a helpful educational assistant.\n\nQuestion: {question}\n\nContext:\n{context_text}\n\nAnswer clearly and concisely."
