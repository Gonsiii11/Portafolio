/* Page logic: sections, project filter modes and the "Ver la moto" toggle. Works with or without the 3D scene;
   the scene, when there is one, is plugged in with setGL(). */
import { LABELS } from '../config.js';

export function createPage() {
  var panel = document.getElementById('panel');
  var hero = document.getElementById('hero');
  var hint = document.getElementById('hint');
  var extBtn = document.getElementById('extbtn');
  var state = { section: 'home', mode: 'todo', boot: false };
  var gl = null, extOn = false;

  function setMode(m) {
    state.mode = m;
    panel.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.mode === m ? 'true' : 'false'); });
    panel.querySelectorAll('[data-mode-text]').forEach(function (p) { p.hidden = p.dataset.modeText !== m; });
    panel.querySelectorAll('.pcard').forEach(function (c) {
      var ms = c.dataset.modes;
      c.hidden = !(m === 'todo' || !ms || ms.split(' ').indexOf(m) > -1);
    });
    if (gl) gl.setModeVisual(m);
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

  function setSection(id, opts) {
    opts = opts || {};
    if (!LABELS[id]) id = 'home';
    state.section = id;
    var open = id !== 'home';
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
    if (open) {
      document.getElementById('pbody').scrollTop = 0;
      if (opts.focus !== false) { try { panel.focus({ preventScroll: true }); } catch (e) {} }
    }
    if (gl) gl.setView(id, opts.view);
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
    showNoGL: function () { document.getElementById('nogl').hidden = false; }
  };
}
