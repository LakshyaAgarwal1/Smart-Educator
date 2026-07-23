window.utils = (function(){
  function getCookie(name){
    const v = document.cookie.match('(^|;)\\s*'+name+'\\s*=\\s*([^;]+)');
    return v ? v.pop() : '';
  }
  function getCSRF(){ return getCookie('csrftoken'); }

  function showGlobalLoading(on){
    if(on) document.body.style.cursor = 'wait'; else document.body.style.cursor = '';
    // disable primary interactive buttons globally to avoid accidental double actions
    document.querySelectorAll('button, a').forEach(el=>{ if(on) el.setAttribute('disabled','true'); else el.removeAttribute('disabled'); });
  }

  async function csrfFetch(url, opts={}){
    opts.credentials = opts.credentials || 'include';
    opts.headers = opts.headers || {};
    if(!(opts.body instanceof FormData)) opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json';
    opts.headers['X-CSRFToken'] = getCSRF();
    return fetch(url, opts);
  }

  function openModal(selector){ const el=document.querySelector(selector); if(el) el.classList.remove('hidden'); }
  function closeModal(selector){ const el=document.querySelector(selector); if(el) el.classList.add('hidden'); }

  function toast(msg, type='info'){
    // lightweight toast using aria-live region
    let region = document.getElementById('ae-toast-region');
    if(!region){ region = document.createElement('div'); region.id='ae-toast-region'; region.setAttribute('aria-live','polite'); region.style.position='fixed'; region.style.right='1rem'; region.style.bottom='1rem'; region.style.zIndex='9999'; document.body.appendChild(region); }
    const box = document.createElement('div'); box.className='p-2 mb-2 rounded shadow text-sm'; box.style.background = (type==='error')? '#fee2e2':'#111827'; box.style.color=(type==='error')? '#b91c1c':'white'; box.textContent = msg; region.appendChild(box);
    setTimeout(()=>{ box.style.transition='opacity .3s'; box.style.opacity='0'; setTimeout(()=>box.remove(),350); },4000);
  }

  return { getCookie, getCSRF, showGlobalLoading, csrfFetch, openModal, closeModal, toast };
})();
