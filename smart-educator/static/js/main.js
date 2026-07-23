document.addEventListener('DOMContentLoaded', function(){
  // Modal open/close
  document.querySelectorAll('[data-modal-target]').forEach(btn => {
    btn.addEventListener('click', function(e){
      const sel = btn.getAttribute('data-modal-target');
      document.querySelector(sel).classList.remove('hidden');
    });
  });

  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', function(){
      const sel = btn.getAttribute('data-modal-close');
      document.querySelector(sel).classList.add('hidden');
    });
  });
});
