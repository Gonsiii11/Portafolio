/* Entry point. The page works on its own (pagina/); the 3D scene (escena/, moto/, camara/) plugs into it when WebGL
   is available. three@0.128.0 is pinned on purpose (see CLAUDE.md). */
import './style.css';
import { createPage } from './pagina/pagina.js';
import { initCredits } from './pagina/creditos.js';
import { addTechIcons } from './pagina/iconos.js';
import { createScene } from './escena/escena.js';

var page = createPage();
initCredits();
addTechIcons();

var gl = null;
try { gl = createScene(page); } catch (err) { gl = null; }
if (gl) page.setGL(gl); else page.showNoGL();

page.setMode('todo');
page.setSection('home', { focus: false });
