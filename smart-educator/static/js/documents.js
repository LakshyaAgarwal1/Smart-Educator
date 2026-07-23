document.addEventListener('DOMContentLoaded', function(){
  // Use shared utils for CSRF and global loading

  const grid = document.getElementById('documents-grid');
  const searchInput = document.getElementById('search-input');
  const filterType = document.getElementById('filter-type');
  const filterStatus = document.getElementById('filter-status');
  const syncBtn = document.getElementById('sync-drive-btn');
  const uploadModal = document.getElementById('uploadModal');
  const uploadForm = document.getElementById('upload-form');
  const chooseFileBtn = document.getElementById('choose-file');
  const fileInput = document.getElementById('upload-file-input');
  const dropZone = document.getElementById('drop-zone');
  const fileNameEl = document.getElementById('upload-file-name');
  const progressWrap = document.getElementById('upload-progress');
  const progressBar = document.getElementById('upload-progress-bar');
  const progressText = document.getElementById('upload-progress-text');

  if(!grid) return;

  // Filtering
  function matchesFilters(card){
    const title = (card.dataset.title || '').toLowerCase();
    const type = (card.dataset.type || '').toLowerCase();
    const status = (card.dataset.status || '').toLowerCase();
    const q = (searchInput.value || '').toLowerCase();
    if(q){ if(!title.includes(q)) return false; }
    if(filterType.value){ if(type !== filterType.value.toLowerCase()) return false; }
    if(filterStatus.value){ if(status !== filterStatus.value.toLowerCase()) return false; }
    return true;
  }

  function refreshVisible(){
    const cards = grid.querySelectorAll('.doc-card');
    let visible = 0;
    cards.forEach(c=>{
      if(matchesFilters(c)){
        c.style.display = '';
        visible++;
      } else {
        c.style.display = 'none';
      }
    });
    const countEl = document.getElementById('documents-count');
    if(countEl) countEl.textContent = `(${visible} files)`;
  }

  searchInput?.addEventListener('input', ()=>refreshVisible());
  filterType?.addEventListener('change', ()=>refreshVisible());
  filterStatus?.addEventListener('change', ()=>refreshVisible());

  // Delete button handler
  function attachDeleteHandlers(container){
    container.querySelectorAll('.delete-btn').forEach(btn=>{
      if(btn.dataset.bound) return; btn.dataset.bound = '1';
      btn.addEventListener('click', async function(){
        const id = this.getAttribute('data-id');
        if(!id) return;
        if(!confirm('Delete this document?')) return;
        try{
          window.utils.showGlobalLoading(true);
          const res = await fetch(`/documents/delete/${id}/`, {method:'GET', credentials:'include'});
          if(!res.ok) throw new Error('Delete failed');
          const card = container.querySelector(`.doc-card[data-id="${id}"]`);
          if(card) card.remove();
          refreshVisible();
        }catch(err){ alert(err.message); }
        finally{ window.utils.showGlobalLoading(false); }
      });
    });
  }
  attachDeleteHandlers(grid);

  // Google Drive sync
  syncBtn?.addEventListener('click', async function(){
    if(!confirm('Sync files from your Google Drive into Smart Educator?')) return;
    try{
      window.utils.showGlobalLoading(true);
      const res = await fetch('/documents/sync-drive/', {method:'GET', credentials:'include'});
      if(!res.ok) throw new Error('Sync failed');
      await loadDocuments();
      alert('Drive sync started / completed. Document list refreshed.');
    }catch(err){ alert(err.message); }
    finally{ window.utils.showGlobalLoading(false); }
  });

  // Load documents page and replace grid (used after upload/delete/sync)
  async function loadDocuments(){
    try{
      window.utils.showGlobalLoading(true);
      const res = await fetch('/documents/', {credentials:'include'});
      if(!res.ok) throw new Error('Failed to reload documents');
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newGrid = doc.getElementById('documents-grid');
      if(newGrid){
        grid.innerHTML = newGrid.innerHTML;
        attachDeleteHandlers(grid);
        refreshVisible();
      }
      // update sync message if present
      const syncMsg = doc.getElementById('sync-message');
      const existingSync = document.getElementById('sync-message');
      if(existingSync && syncMsg){ existingSync.replaceWith(syncMsg); }
      else if(syncMsg){ document.querySelector('.container').appendChild(syncMsg); }
    }catch(err){ console.error(err); alert('Failed to refresh documents'); }
    finally{ window.utils.showGlobalLoading(false); }
  }

  // Upload: file chooser
  chooseFileBtn?.addEventListener('click', ()=> fileInput.click());
  fileInput?.addEventListener('change', (e)=>{
    const f = e.target.files[0];
    fileNameEl.textContent = f ? f.name : '';
  });

  // Drag & drop
  dropZone?.addEventListener('dragover', (e)=>{ e.preventDefault(); dropZone.classList.add('bg-gray-50'); });
  dropZone?.addEventListener('dragleave', (e)=>{ e.preventDefault(); dropZone.classList.remove('bg-gray-50'); });
  dropZone?.addEventListener('drop', (e)=>{
    e.preventDefault(); dropZone.classList.remove('bg-gray-50');
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if(f){ fileInput.files = e.dataTransfer.files; fileNameEl.textContent = f.name; }
  });

  // Upload via XHR for progress
  uploadForm?.addEventListener('submit', function(e){
    e.preventDefault();
    const f = fileInput.files[0];
    if(!f){ alert('Please choose a file to upload'); return; }
    const title = document.getElementById('upload-title')?.value || '';
    const fd = new FormData(); fd.append('file', f); fd.append('title', title);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/documents/upload/');
    xhr.withCredentials = true;
    xhr.setRequestHeader('X-CSRFToken', window.utils.getCSRF());

    xhr.upload.onprogress = function(evt){
      if(evt.lengthComputable){
        const pct = Math.round((evt.loaded/evt.total)*100);
        progressWrap.classList.remove('hidden');
        progressBar.style.width = pct + '%';
        progressText.textContent = pct + '%';
      }
    };

    xhr.onload = function(){
      if(xhr.status >= 200 && xhr.status < 400){
        // Success - server will redirect back to documents list; refresh grid
        progressBar.style.width = '100%'; progressText.textContent = '100%';
        setTimeout(()=>{
          // close modal
          uploadModal.classList.add('hidden');
          // reset form
          fileInput.value = ''; fileNameEl.textContent = ''; progressWrap.classList.add('hidden'); progressBar.style.width='0%'; progressText.textContent='0%'; document.getElementById('upload-title').value='';
          loadDocuments();
        }, 300);
      } else {
        alert('Upload failed');
      }
    };
    xhr.onerror = function(){ alert('Upload failed (network error)'); };
    xhr.send(fd);
  });

  // Use utils.showGlobalLoading for global loading UI

});
