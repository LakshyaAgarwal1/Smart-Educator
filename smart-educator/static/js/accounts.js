document.addEventListener('DOMContentLoaded', function(){
  // Settings persisted client-side until backend settings endpoints exist.
  const themeKey = 'ui:theme';
  const tempKey = 'ui:temperature';
  const streamKey = 'ui:streaming';
  const defaultModeKey = 'ui:default_mode';

  function $(s, ctx=document){ return ctx.querySelector(s); }
  function $all(s, ctx=document){ return Array.from(ctx.querySelectorAll(s)); }

  // Initialize controls on settings page
  function initSettingsPage(){
    const themeToggle = $('#theme-toggle');
    const tempInput = $('#temperature');
    const streamSwitch = $('#streaming-switch');
    const defaultMode = $('#default-mode');

    // load saved
    const savedTheme = localStorage.getItem(themeKey) || 'system';
    applyTheme(savedTheme);
    if(themeToggle) themeToggle.value = savedTheme;
    if(tempInput) tempInput.value = localStorage.getItem(tempKey) || '0.7';
    if(streamSwitch) streamSwitch.checked = localStorage.getItem(streamKey) === 'true';
    if(defaultMode) defaultMode.value = localStorage.getItem(defaultModeKey) || 'EXAM';

    themeToggle?.addEventListener('change', (e)=>{ applyTheme(e.target.value); localStorage.setItem(themeKey, e.target.value); });
    tempInput?.addEventListener('change', (e)=>{ localStorage.setItem(tempKey, e.target.value); });
    streamSwitch?.addEventListener('change', (e)=>{ localStorage.setItem(streamKey, e.target.checked); });
    defaultMode?.addEventListener('change', (e)=>{ localStorage.setItem(defaultModeKey, e.target.value); });

    // Keyboard shortcut: T toggles theme
    document.addEventListener('keydown', function(e){
      if(e.key.toLowerCase()==='t' && !e.metaKey && !e.ctrlKey && !e.altKey){
        toggleTheme();
      }
      if(e.key==='/' && document.activeElement.tagName!=='INPUT' && document.activeElement.tagName!=='TEXTAREA'){
        const s = $('#search-input'); if(s){ e.preventDefault(); s.focus(); }
      }
    });
  }

  function applyTheme(mode){
    if(mode==='dark'){ document.documentElement.classList.add('dark'); }
    else if(mode==='light'){ document.documentElement.classList.remove('dark'); }
    else { // system
      if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }
  }
  function toggleTheme(){
    if(document.documentElement.classList.contains('dark')){ applyTheme('light'); localStorage.setItem(themeKey,'light'); }
    else { applyTheme('dark'); localStorage.setItem(themeKey,'dark'); }
  }

  // Profile page: compute docs stats by scraping documents list
  async function computeProfileStats(){
    try{
      const res = await fetch('/documents/', {credentials:'include'});
      if(!res.ok) return;
      const html = await res.text();
      const parser = new DOMParser(); const doc = parser.parseFromString(html,'text/html');
      const cards = Array.from(doc.querySelectorAll('.doc-card'));
      const count = cards.length;
      const total = cards.reduce((acc,c)=>{ const s = c.querySelector('[data-file-size]') ? parseInt(c.querySelector('[data-file-size]').getAttribute('data-file-size')) : (parseInt(c.dataset.size)||0); return acc + (isNaN(s)?0:s); },0);
      const elCount = $('#profile-doc-count'); if(elCount) elCount.textContent = count;
      const elStorage = $('#profile-storage'); if(elStorage) elStorage.textContent = formatBytes(total);
    }catch(e){ console.warn('profile stats failed', e); }
  }

  function formatBytes(n){ if(n===0) return '0 B'; const units=['B','KB','MB','GB','TB']; const pow=Math.floor(Math.log(n)/Math.log(1024)); return (n/Math.pow(1024,pow)).toFixed(2)+' '+units[pow]; }

  // Lazy load profile avatar images
  $all('img[data-lazy-src]').forEach(img=>{
    img.setAttribute('loading','lazy'); img.src = img.dataset.lazySrc;
  });

  // Initialize pages
  initSettingsPage();
  computeProfileStats();

});
