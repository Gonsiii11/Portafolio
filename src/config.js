/* Shared settings for the page and the 3D scene. */

export var ACCENT = 0xFF5A36, ACCENT_CSS = '#FF5A36', CYAN = 0x5CC8FF, CYAN_CSS = '#5CC8FF';

/* the sections the page knows (anything else falls back to home) */
export var LABELS = { home: 'INICIO', about: 'SOBRE MÍ', projects: 'PROYECTOS', contact: 'CONTACTO' };

/* prefers-reduced-motion: no riding, no wind, no camera drift */
export var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
