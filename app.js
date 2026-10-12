(function () {
  'use strict';
  var W = window.Warmup;
  W.track('page_view', { title: document.title });

  // ---------- email forms ----------
  function wireForm(form, kind, onOk) {
    var input = form.querySelector('input[type=email]');
    var status = form.querySelector('.status');
    var hp = form.querySelector('.hp input');
    var btn = form.querySelector('button[type=submit]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (hp && hp.value) return; // bot
      status.className = 'status'; status.textContent = '';
      if (!input.checkValidity() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim())) {
        input.setAttribute('aria-invalid', 'true');
        status.className = 'status err'; status.textContent = 'Please enter a valid email address.';
        input.focus(); return;
      }
      input.removeAttribute('aria-invalid');
      btn.disabled = true;
      W.submitEmail(kind, input.value, { source_button: form.dataset.source || null }).then(function (res) {
        btn.disabled = false;
        if (res.ok) {
          try { sessionStorage.setItem('warmup_email', input.value.trim()); } catch (x) {}
          onOk(input, status);
        } else {
          status.className = 'status err'; status.textContent = 'Something went wrong. Please try again.';
        }
      });
    });
  }

  wireForm(document.getElementById('waitlist-form'), 'waitlist', function (input, status) {
    status.className = 'status ok';
    status.textContent = "You're on the waitlist. We'll email you when Warmup opens.";
    input.value = '';
  });

  // ---------- fake-door modal ----------
  var dlg = document.getElementById('fd-modal');
  var fdForm = document.getElementById('fd-form');
  var lastFocus = null;
  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([tabindex="-1"]),[tabindex]:not([tabindex="-1"])';

  function openModal(source) {
    lastFocus = document.activeElement;
    W.track('fake_door_click', { source_button: source, price: '49.99', plan: 'annual' });
    fdForm.dataset.source = source;
    var st = fdForm.querySelector('.status'); st.textContent = ''; st.className = 'status';
    var inp = fdForm.querySelector('input[type=email]');
    try { var prev = sessionStorage.getItem('warmup_email'); if (prev && !inp.value) inp.value = prev; } catch (x) {}
    if (typeof dlg.showModal === 'function') dlg.showModal(); else { dlg.setAttribute('open', ''); }
    document.body.style.overflow = 'hidden';
    inp.focus();
  }
  function closeModal() {
    if (dlg.open) { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); }
  }
  dlg.addEventListener('close', function () {
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  });
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); closeModal(); }); // Esc
  dlg.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
    if (e.key !== 'Tab') return;
    var f = Array.prototype.filter.call(dlg.querySelectorAll(FOCUSABLE), function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeModal(); }); // backdrop
  Array.prototype.forEach.call(dlg.querySelectorAll('[data-close]'), function (b) { b.addEventListener('click', closeModal); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-fake-door]'), function (b) {
    b.addEventListener('click', function () { openModal(b.getAttribute('data-fake-door')); });
  });

  wireForm(fdForm, 'fake_door', function (input, status) {
    status.className = 'status ok';
    status.textContent = "Saved. We'll email you first when early access opens. No payment was taken.";
  });
})();
