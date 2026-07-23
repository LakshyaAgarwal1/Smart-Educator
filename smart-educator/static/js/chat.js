document.addEventListener('DOMContentLoaded', function(){
  // Initialize markdown renderer
  if(window.marked){
    marked.setOptions({
      breaks: true,
      highlight: function(code, lang){
        try{ return hljs.highlightAuto(code).value; }catch(e){ return code; }
      }
    });
  }

  const form = document.getElementById('chat-form');
  const textarea = document.getElementById('chat-input');
  const windowEl = document.getElementById('chat-window');
  const attachBtn = document.getElementById('attach-btn');
  const fileInput = document.getElementById('file-input');
  const sendBtn = document.getElementById('send-btn');
  const modeSelect = document.getElementById('mode-select');
  const attachmentPreview = document.getElementById('attachment-preview');
  let pendingFile = null;

  if(!form || !textarea || !windowEl) return;

  // Autosize textarea
  function autosize(el){
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight) + 'px';
  }
  autosize(textarea);
  textarea.addEventListener('input', ()=>autosize(textarea));

  // Attach button
  attachBtn.addEventListener('click', ()=> fileInput.click());
  fileInput.addEventListener('change', (e)=>{
    const f = e.target.files[0];
    pendingFile = f || null;
    if(!f){ attachmentPreview.innerHTML = ''; return; }
    if(f.type.startsWith('image/')){
      const url = URL.createObjectURL(f);
      attachmentPreview.innerHTML = `<div class="attachment-preview"><img src="${url}" alt="attachment"/></div>`;
    } else {
      attachmentPreview.innerHTML = `<div class="text-sm">Attached: ${escapeHtml(f.name)}</div>`;
    }
  });

  function appendMessage(sender, htmlContent, metaHtml){
    const wrapper = document.createElement('div');
    wrapper.className = 'message';
    const align = sender === 'user' ? 'justify-end' : 'justify-start';
    wrapper.innerHTML = `<div class="flex ${align}"><div class="max-w-[80%]"><div class="bubble ${sender}">${htmlContent}</div>${metaHtml? `<div class="meta">${metaHtml}</div>`:''}</div></div>`;
    windowEl.appendChild(wrapper);
    windowEl.scrollTop = windowEl.scrollHeight;
  }

  function renderMarkdown(text){
    if(window.marked){
      return marked.parse(text);
    }
    return escapeHtml(text).replace(/\n/g,'<br>');
  }

  function escapeHtml(unsafe) {
    return unsafe.replace(/[&<>"']/g, function(m) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"})[m]; });
  }

  function showTyping(){
    const el = document.createElement('div');
    el.className = 'message typing-wrapper';
    el.innerHTML = `<div class="flex justify-start"><div class="max-w-[40%]"><div class="typing"><span class="dot"></span><span class="dot" style="animation-delay:.2s"></span><span class="dot" style="animation-delay:.4s"></span></div></div></div>`;
    windowEl.appendChild(el);
    windowEl.scrollTop = windowEl.scrollHeight;
    return el;
  }

  function simulateStreamingResponse(fullText, onUpdate, onDone){
    let i = 0;
    const chunkSize = 40;
    const interval = setInterval(()=>{
      i += chunkSize;
      const chunk = fullText.slice(0,i);
      onUpdate(chunk);
      if(i >= fullText.length){ clearInterval(interval); onDone(); }
    }, 120);
    return ()=> clearInterval(interval);
  }

  

  // keyboard shortcut: Ctrl+Enter to send
  textarea.addEventListener('keydown', function(e){
    if((e.ctrlKey || e.metaKey) && e.key === 'Enter'){
      e.preventDefault(); sendBtn.click();
    }
  });
  
  // ------------------ Backend integration ------------------
  // CSRF handled via shared utils

  // Load chat HTML and parse messages
  async function loadChat(chatId){
    try{
      showLoading(true);
      const res = await fetch(`/chat/${chatId}/`, {credentials:'include'});
      if(!res.ok) throw new Error('Failed to load chat');
      const html = await res.text();
      const msgs = parseMessagesFromHtml(html);
      const title = parseTitleFromHtml(html) || 'Conversation';
      renderChat(title, msgs);
      currentChatId = chatId;
      updateURL(`/chat/${chatId}/`);
    }catch(err){
      showError(err.message);
    }finally{ showLoading(false); }
  }

  function parseMessagesFromHtml(html){
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const container = doc.querySelector('body');
    // messages are simple strong role: content lines in original template
    const nodes = doc.querySelectorAll('div');
    const out = [];
    // heuristic: find lines with <strong>role</strong>: content
    doc.querySelectorAll('strong').forEach(s =>{
      const parent = s.parentElement;
      const role = s.textContent.replace(':','').trim().toLowerCase();
      const content = parent.textContent.replace(s.textContent, '').trim().replace(/^:\s*/,'');
      out.push({role, content});
    });
    return out;
  }

  function parseTitleFromHtml(html){
    const m = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    return m ? m[1].trim() : null;
  }

  function renderChat(title, messages){
    const titleEl = document.getElementById('chat-title');
    const subtitleEl = document.getElementById('chat-subtitle');
    titleEl.textContent = title;
    subtitleEl.textContent = `Loaded ${messages.length} messages`;
    const windowEl = document.getElementById('chat-window');
    windowEl.innerHTML = '';
    messages.forEach(m =>{
      const sender = m.role === 'user' ? 'user' : 'assistant';
      const html = renderMarkdown(escapeHtml(m.content));
      appendMessage(sender, `<div class=\"prose prose-sm\">${html}</div>`, '');
    });
  }

  function updateURL(path){
    try{ history.replaceState({},'', path); }catch(e){}
  }

  // Create new chat
  let currentChatId = null;
  document.getElementById('new-chat-btn')?.addEventListener('click', async function(){
    try{
      showLoading(true);
      const res = await fetch('/chat/new/', {method:'GET', credentials:'include'});
      // fetch follows redirects; response.url should contain new chat path
      const url = new URL(res.url);
      const path = url.pathname;
      const m = path.match(/\/chat\/(\d+)\//);
      if(m){
        const id = m[1];
        await loadChat(id);
      } else {
        showError('Could not determine new chat id');
      }
    }catch(err){ showError(err.message); }
    finally{ showLoading(false); }
  });

  // Click recent chats in sidebar
  document.querySelectorAll('[data-chat-id]').forEach(a=>{
    a.addEventListener('click', function(e){
      e.preventDefault();
      const id = this.getAttribute('data-chat-id');
      if(id) loadChat(id);
    });
  });

  // Send message to backend
  async function sendMessageToBackend(chatId, message){
    try{
      const fd = new FormData();
      fd.append('message', message);
      const res = await fetch(`/chat/${chatId}/send/`, {method:'POST', body: fd, credentials:'include', headers:{'X-CSRFToken': window.utils.getCSRF()}});
      if(!res.ok && res.status !== 302) throw new Error('Failed to send message');
      // reload messages
      await loadChat(chatId);
    }catch(err){ showError(err.message); }
  }

  // Call RAG query endpoint
  async function callRagQuery(query, mode, chatHistory){
    try{
      const payload = { query: query, mode: mode, chat_history: chatHistory || [] };
      const res = await fetch('/rag/query/', {method: 'POST', credentials:'include', headers: {'Content-Type':'application/json','X-CSRFToken': window.utils.getCSRF()}, body: JSON.stringify(payload)});
      if(!res.ok){
        const t = await res.text().catch(()=>null);
        throw new Error(t || 'RAG query failed');
      }
      const data = await res.json();
      return data;
    }catch(err){ console.error('RAG error', err); throw err; }
  }

  // Wire send: if currentChatId set, send to backend; else create new chat then send
  const originalFormHandler = form.onsubmit;
  form.addEventListener('submit', async function(e){
    e.preventDefault();
    const text = textarea.value.trim();
    if(!text && !pendingFile) return;
    const mode = modeSelect ? modeSelect.value : 'EXAM';
    // append user locally for immediate feedback
    appendMessage('user', `<div class="prose prose-sm">${renderMarkdown(escapeHtml(text))}</div>`, `Mode: ${escapeHtml(mode)}`);
    textarea.value=''; autosize(textarea);

    // If there is a chat, send user message to backend for persistence
    if(currentChatId){
      try{ showLoading(true); await sendMessageToBackend(currentChatId, text); }catch(e){} finally{ showLoading(false); }
    } else {
      // create new chat then send
      try{ showLoading(true);
        const res = await fetch('/chat/new/', {method:'GET', credentials:'include'});
        const url = new URL(res.url);
        const path = url.pathname; const m = path.match(/\/chat\/(\d+)\//);
        if(m){ currentChatId = m[1]; try{ await sendMessageToBackend(currentChatId, text); }catch(e){} }
      }catch(err){ console.warn('Could not create chat:', err); }
      finally{ showLoading(false); }
    }

    // Now call RAG endpoint to get answer and render streaming response
    const typingEl = showTyping();
    const placeholder = document.createElement('div');
    placeholder.className = 'message';
    placeholder.innerHTML = `<div class="flex justify-start"><div class="max-w-[80%]"><div class="bubble assistant"><div class=\"prose prose-sm\">&nbsp;</div></div></div></div>`;
    windowEl.appendChild(placeholder);
    windowEl.scrollTop = windowEl.scrollHeight;

    try{
      const ragResp = await callRagQuery(text, mode.toUpperCase(), []);
      typingEl.remove();
      const answerText = ragResp.answer || 'No answer available.';
      // stream the answer
      let lastRendered = '';
      const stop = simulateStreamingResponse(answerText, (chunk)=>{
        const html = renderMarkdown(chunk.replace(/\n/g,'\n'));
        placeholder.querySelector('.bubble.assistant .prose').innerHTML = html;
        windowEl.scrollTop = windowEl.scrollHeight;
        lastRendered = chunk;
      }, ()=>{
        // finalize: highlight codeblocks
        document.querySelectorAll('pre code').forEach((block)=>{ try{ hljs.highlightElement(block);}catch(e){} });
        // render sources and confidence
        try{
          const sources = ragResp.sources || [];
          const container = document.createElement('div');
          container.className = 'mt-3 text-sm sources-panel';
          const topScore = sources.length ? Math.max(...sources.map(s=>s.relevance_score || 0)) : 0;
          const confidence = sources.length ? Math.round(topScore * 100) + '%' : 'N/A';
          const header = document.createElement('div'); header.className='text-xs text-muted mb-2'; header.textContent = `Confidence: ${confidence}`;
          container.appendChild(header);
          if(sources.length){
            const list = document.createElement('ul'); list.className='space-y-2';
            sources.forEach(s=>{
              const li = document.createElement('li'); li.className='p-2 border rounded';
              const title = s.title || s.filename || 'Document';
              const link = document.createElement('a'); link.href = `/documents/detail/${s.document_id}/`; link.className='font-semibold'; link.textContent = title;
              const meta = document.createElement('div'); meta.className='text-xs text-muted'; meta.textContent = `Score: ${s.relevance_score} • Page: ${s.page_number} • Chunk: ${s.chunk_index}`;
              const preview = document.createElement('div'); preview.className='text-sm mt-1'; preview.textContent = s.preview || '';
              li.appendChild(link); li.appendChild(meta); li.appendChild(preview);
              list.appendChild(li);
            });
            container.appendChild(list);
          } else {
            const none = document.createElement('div'); none.className='text-sm text-muted'; none.textContent = 'No sources cited.'; container.appendChild(none);
          }
          placeholder.appendChild(container);
        }catch(e){ console.error('Failed to render sources', e); }
      });
    }catch(err){
      typingEl.remove();
      placeholder.querySelector('.bubble.assistant .prose').innerHTML = '<div class="text-sm text-red-600">Sorry, I could not get an answer right now.</div>';
      console.error(err);
    }
  });

  // Rename chat
  document.getElementById('rename-btn')?.addEventListener('click', function(){
    const newTitle = prompt('New title');
    if(!newTitle || !currentChatId) return;
    (async ()=>{
      try{ showLoading(true);
        const fd = new FormData(); fd.append('title', newTitle);
        const res = await fetch(`/chat/${currentChatId}/rename/`, {method:'POST', body: fd, credentials:'include', headers:{'X-CSRFToken': window.utils.getCSRF()}});
        if(!res.ok) throw new Error('Rename failed');
        // refresh sidebar and title
        document.querySelectorAll('[data-chat-id]').forEach(a=>{ if(a.getAttribute('data-chat-id')===String(currentChatId)) a.textContent = newTitle; });
        document.getElementById('chat-title').textContent = newTitle;
      }catch(err){ showError(err.message); }
      finally{ showLoading(false); }
    })();
  });

  // Delete chat
  document.getElementById('delete-btn')?.addEventListener('click', function(){
    if(!currentChatId) return showError('No chat selected');
    if(!confirm('Delete this chat?')) return;
    (async ()=>{
      try{ showLoading(true);
        const res = await fetch(`/chat/${currentChatId}/delete/`, {method:'GET', credentials:'include'});
        if(!res.ok) throw new Error('Delete failed');
        // remove from sidebar
        document.querySelectorAll('[data-chat-id]').forEach(a=>{ if(a.getAttribute('data-chat-id')===String(currentChatId)) a.parentElement.remove(); });
        currentChatId = null;
        // reset chat window
        document.getElementById('chat-title').textContent = 'Welcome';
        document.getElementById('chat-window').innerHTML = '<div class="text-muted">Select or create a chat to start.</div>';
      }catch(err){ showError(err.message); }
      finally{ showLoading(false); }
    })();
  });

  // Loading & error helpers
  function showLoading(on){
    const btn = document.getElementById('send-btn');
    if(btn) btn.disabled = on;
    if(on) document.body.style.cursor = 'wait'; else document.body.style.cursor = '';
  }
  function showError(msg){
    alert(msg);
  }
});
