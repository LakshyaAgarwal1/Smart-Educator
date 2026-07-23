document.addEventListener('DOMContentLoaded', function(){
  const btn = document.getElementById('theme-toggle');
  if(!btn) return;
  btn.addEventListener('click', ()=>{
    document.documentElement.classList.toggle('dark');
    // simple toggle to demonstrate theme switching
    if(document.documentElement.classList.contains('dark')){
      document.documentElement.style.setProperty('--color-background','#0b1220');
      document.documentElement.style.setProperty('--color-text','#e6eef8');
    } else {
      document.documentElement.style.setProperty('--color-background','#f8fafc');
      document.documentElement.style.setProperty('--color-text','#0f172a');
    }
  });
});
