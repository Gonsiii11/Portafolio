/* Page logic: sections, project filter modes and the "Ver la moto" toggle. Works with or without the 3D scene;
   the scene, when there is one, is plugged in with setGL(). */
import { LABELS } from '../config.js';

export function createPage() {
  var panel = document.getElementById('panel');
  var hero = document.getElementById('hero');
  var hint = document.getElementById('hint');
  var extBtn = document.getElementById('extbtn'), app = document.getElementById('app');
  /* the section pages start just below the header (one row on desktop, two on phones): --top-h follows its real height */
  var topEl = document.getElementById('top');
  function fitTop() { app.style.setProperty('--top-h', Math.ceil(topEl.getBoundingClientRect().bottom + 12) + 'px'); }
  if (window.ResizeObserver) new ResizeObserver(fitTop).observe(topEl); else window.addEventListener('resize', fitTop);
  fitTop();
  var state = { section: 'home', mode: 'todo' };
  var gl = null, extOn = false;

  function setMode(m) {
    state.mode = m;
    panel.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.mode === m ? 'true' : 'false'); });
    panel.querySelectorAll('[data-mode-text]').forEach(function (p) { p.hidden = p.dataset.modeText !== m; });
    panel.querySelectorAll('.pcard').forEach(function (c) {
      var ms = c.dataset.modes;
      c.hidden = !(m === 'todo' || !ms || ms.split(' ').indexOf(m) > -1);
    });
  }

  extBtn.addEventListener('click', function () { toggleExt(); });
  function toggleExt(force) {
    var was = extOn;
    setSection('home', { focus: false });
    extOn = (force === undefined) ? !was : force;
    if (gl) gl.setExt(extOn);
    extBtn.textContent = extOn ? 'Volver al asiento' : 'Ver la moto';
    extBtn.setAttribute('aria-current', extOn ? 'true' : 'false');
  }

  /* where focus was before a page opened, to give it back when the page closes */
  var opener = null;
  function setSection(id, opts) {
    opts = opts || {};
    if (!LABELS[id]) id = 'home';
    var was = state.section;
    state.section = id;
    var open = id !== 'home';
    if (open && was === 'home') {
      var a = document.activeElement;
      opener = a && a !== document.body && !panel.contains(a) ? a : null;
    }
    panel.querySelectorAll('.sec').forEach(function (s) { s.hidden = s.dataset.sec !== id; });
    panel.classList.toggle('open', open);
    panel.toggleAttribute('inert', !open);
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.querySelectorAll('#nav .navbtn').forEach(function (b) { b.setAttribute('aria-current', b.dataset.go === id ? 'true' : 'false'); });
    hero.hidden = open;
    hint.hidden = open || !gl;
    document.getElementById('credit').hidden = open;
    extBtn.hidden = !gl;
    extOn = false; extBtn.textContent = 'Ver la moto';
    app.classList.toggle('reading', open);  /* full-screen page: the scene goes blurred and dark behind it */
    if (open) {
      document.getElementById('pbody').scrollTop = 0;
      if (opts.focus !== false) {  /* focus the page title, so screen readers start reading the page */
        var title = panel.querySelector('.sec[data-sec="' + id + '"] h2');
        if (title) { title.setAttribute('tabindex', '-1'); try { title.focus({ preventScroll: true }); } catch (e) {} }
      }
    }
    if (gl) { gl.setView(id); gl.setReading(open); }
    /* closing: focus goes back to whatever opened the page, or (opened from the TFT) to that section's menu button */
    var fromNav = document.activeElement && document.activeElement.closest && document.activeElement.closest('#nav');  /* closed with «Inicio»: focus stays there */
    if (!open && was !== 'home' && opts.focus !== false && !fromNav) {
      var back = opener && document.contains(opener) ? opener : document.querySelector('#nav .navbtn[data-go="' + was + '"]');
      if (back) { try { back.focus({ preventScroll: true }); } catch (e) {} }
      opener = null;
    }
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    var go = t.closest && t.closest('[data-go]');
    if (go) { if (go.dataset.go === 'ext') toggleExt(true); else setSection(go.dataset.go); return; }
    var chip = t.closest && t.closest('.chip');
    if (chip) { setMode(chip.dataset.mode); return; }
    if (t.closest && t.closest('#close')) setSection('home');
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.section !== 'home') setSection('home'); });

  return {
    state: state,
    setMode: setMode,
    setSection: setSection,
    toggleExt: toggleExt,
    setGL: function (g) { gl = g; },
    /* no WebGL: show the plain-text notice instead of the scene */
    showNoGL: function () { document.getElementById('nogl').hidden = false; document.getElementById('loading').hidden = true; }
  };
}
