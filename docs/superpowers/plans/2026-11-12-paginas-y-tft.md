# Páginas a pantalla completa y TFT como menú — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La TFT de la moto pasa a ser un cuadro completo que funciona como menú táctil, y Sobre mí / Proyectos / Contacto se abren como páginas a pantalla completa con la escena desenfocada detrás; con los textos nuevos del inicio y de Sobre mí.

**Architecture:** La lógica pura de la TFT (disposición, a qué opción corresponde un toque, marcha/revoluciones, formatos) va a un módulo sin three.js, probado con `node --test`. El dibujo sigue en el canvas de `src/moto/tablero.js`; el toque se resuelve con el rayo de `src/camara/controles.js` sobre el plano `screen` y sus UV. Las páginas son el `#panel` actual convertido en capa a pantalla completa; la escena se desenfoca con CSS y se dibuja a baja frecuencia mientras hay una página abierta.

**Tech Stack:** Vite, JavaScript sin framework (estilo ES5 con `var`, módulos ES), three.js 0.128.0, `node:test` (incluido en Node, sin dependencias).

**Spec:** `docs/superpowers/specs/2026-11-12-paginas-y-tft-design.md`

## Global Constraints

- three.js 0.128.0 fijada; sin dependencias nuevas (los tests usan `node:test`, que viene con Node).
- Créditos visibles siempre: `#credit` sobre la escena y `#pcredit` dentro de las páginas, con el botón «Créditos».
- Tiene que funcionar a 400 px de ancho, con `prefers-reduced-motion` y sin WebGL (`#nogl`).
- No tocar intensidad de curvas, inclinación, balanceo ni quietud del cielo (memoria «curvas-referencia»).
- Huecos `[...]` de contacto y proyectos se quedan como huecos: no inventar datos ni logros.
- TFT sin «MODO» y con tres opciones exactas: `SOBRE MÍ`, `PROYECTOS`, `CONTACTO`.
- Titular del inicio exacto: «Construyo soluciones con software.»
- Ningún titular dice «he construido» mientras los proyectos estén planificados o en preparación.

## Review Focus

- **Arrastrar para mirar sobre la TFT**: si el puntero se mueve más de 5 px entre pulsar y soltar, no debe abrir ninguna sección (se conserva la regla `drag.moved` actual). Test manual en la Task 3.
- **Escape con los créditos abiertos encima de una página**: el primer Escape cierra solo los créditos; el segundo, la página. Test manual en la Task 5.
- **Volver de una página**: al cerrar, la escena recupera la frecuencia completa (60 fps en escritorio) y el desenfoque desaparece; también si se pasa directamente de una página a «Ver la moto». Test en la Task 5.
- **Móvil vertical (400 × 800)**: las páginas se desplazan con su propio scroll y no hay scroll horizontal; el menú de arriba sigue abriendo las tres páginas. Test en la Task 6.
- **Sin WebGL**: el menú de arriba abre las páginas sobre fondo oscuro y no hay errores en consola. Test en la Task 6 (forzando `createScene` a devolver `null`).

---

### Task 1: Lógica pura de la TFT (con tests)

**Files:**
- Create: `src/moto/tft.js`
- Create: `tests/tft.test.js`
- Modify: `package.json` (añadir `"test": "node --test tests/"`)

**Interfaces:**
- Produces (todo exportado desde `src/moto/tft.js`, sin importar three.js):
  - `TFT_W = 1024`, `TFT_H = 512` (tamaño del canvas).
  - `MENU = [{ id: 'about', label: 'SOBRE MÍ' }, { id: 'projects', label: 'PROYECTOS' }, { id: 'contact', label: 'CONTACTO' }]`.
  - `menuRows() -> Array<{ id, label, x, y, w, h }>` en píxeles del canvas (origen arriba-izquierda). Las filas viven en la mitad derecha: `x = 560`, `w = 420`, tres filas de `h = 84` empezando en `y = 132` y con 6 px entre filas.
  - `tftHit(u, v) -> 'about' | 'projects' | 'contact' | null`. `u`, `v` son las UV del plano en three.js (v = 0 abajo), así que el píxel es `(u * TFT_W, (1 - v) * TFT_H)`.
  - `gearAndRpm(speedMs) -> { gear: 1..6, rpm: 0..14000 }`. Bandas de marcha en km/h: 1ª 0–20, 2ª 20–38, 3ª 38–58, 4ª 58–80, 5ª 80–105, 6ª 105–150 (y más). Dentro de cada banda las rpm van linealmente de 4000 al empezar a 11500 al terminar, con tope de 14000 por encima de 150 km/h; parado (`speedMs < 0.5`) → `{ gear: 1, rpm: 1200 }` (ralentí).
  - `formatTrip(meters) -> string`: km con un decimal y coma, p. ej. `formatTrip(2430) === '2,4 KM'`, `formatTrip(0) === '0,0 KM'`.
  - `formatClock(date) -> string`: `'HH:MM'` con ceros, p. ej. 9:05 → `'09:05'`.

- [ ] **Step 1: Escribe `tests/tft.test.js`** con `node:test` y `node:assert/strict`:
  - `tftHit` en el centro de cada fila devuelve su id (calcula u, v desde `menuRows()`).
  - `tftHit(0.1, 0.5) === null` (zona del reloj), `tftHit(0.75, 0.97) === null` (barra superior), un punto en el hueco de 6 px entre filas → `null`.
  - `gearAndRpm(0)` → `{ gear: 1, rpm: 1200 }`; `gearAndRpm(16)` (57,6 km/h) → `gear === 3` y `rpm` entre 11000 y 11500; `gearAndRpm(16.2)` (58,3 km/h) → `gear === 4` y `rpm` < 4300; `gearAndRpm(60).gear === 6` y `rpm <= 14000`.
  - `formatTrip(2430) === '2,4 KM'`, `formatTrip(0) === '0,0 KM'`, `formatTrip(12960) === '13,0 KM'`.
  - `formatClock(new Date(2026, 10, 12, 9, 5)) === '09:05'`.

- [ ] **Step 2:** Añade el script `test` a `package.json` y ejecuta `npm test`. Esperado: FALLA porque `src/moto/tft.js` no existe.

- [ ] **Step 3:** Implementa `src/moto/tft.js` con las firmas y valores de arriba.

- [ ] **Step 4:** `npm test`. Esperado: todos los tests en verde.

- [ ] **Step 5: Commit**

```bash
git add src/moto/tft.js tests/tft.test.js package.json
git commit -m "TFT: lógica pura (filas del menú, toque, marcha y revoluciones, formatos) con tests"
```

### Task 2: Dibujo nuevo de la TFT

**Files:**
- Modify: `src/moto/tablero.js` (reescribir `drawDash`)
- Modify: `src/moto/moto.js` (estado y cadencia de redibujo de la pantalla)
- Modify: `src/escena/escena.js` (pasar velocidad y distancia)

**Interfaces:**
- Consumes: `TFT_W`, `TFT_H`, `menuRows()`, `gearAndRpm`, `formatTrip`, `formatClock` de la Task 1.
- Produces:
  - `drawDash(ctx, st)` con `st = { speedKmh: number, gear: number, rpm: number, trip: string, clock: string, hover: 'about'|'projects'|'contact'|null }`.
  - En el objeto de `createBike`: `updateDash(dt, info)` con `info = { speedMs: number, travelledM: number }` (sustituye a la firma actual `updateDash(dt, state)`), y `setHover(id)` que guarda el id resaltado y marca la pantalla para redibujar. Se eliminan `setSection` y el campo `dash.revT`/`dash.label`.
  - `createCurves` expone `travelled()` (metros recorridos) para que `escena.js` se lo pase a `updateDash`.
  - En `escena.js`, `setView` deja de llamar a `bike.setSection` (ya no existe) y `setModeVisual` queda vacío (la TFT ya no muestra el modo).

- [ ] **Step 1:** Reescribe `drawDash` siguiendo la maqueta elegida (`tft-completa-v2.html`, opción A) y la sección «La TFT» del spec: barra superior (hora a la izquierda, «● BUSCO PRÁCTICAS» en `CYAN_CSS` a la derecha); reloj redondo a la izquierda (esfera con anillo interior, arco 0–14 ×1000 rpm con números, zona roja 12–14 en `ACCENT_CSS`, aguja naranja con brillo vía `shadowBlur`, velocidad grande en el centro con «KM/H», marcha en un recuadro con borde naranja); filas de `menuRows()` a la derecha (fila con `hover` en fondo `ACCENT_CSS` y texto `#060A0E`; las demás con línea inferior `#1C232C`); barra inferior `TRIP`, `BASE MADRID`, `DISP. 20 H/SEM`, `CURSO 3.º`. Ningún texto del canvas por debajo de 22 px de canvas (unos 11 px en pantalla tras la Task 4).

- [ ] **Step 2:** En `moto.js`, `updateDash(dt, info)` calcula `gearAndRpm`, suaviza la aguja (como el `rev` actual) y redibuja como máximo 15 veces por segundo, o al instante si cambia `hover`. `escena.js` llama a `bike.updateDash(dt, { speedMs: speed, travelledM: curves.travelled() })`. La carga de fuentes sigue forzando un redibujo.

- [ ] **Step 3: Verifica en el navegador** (`npm run dev`, 1440 × 900): se ven la hora real, la velocidad que sube al arrancar, la marcha, la aguja que se mueve, `TRIP` que aumenta, y las tres opciones; consola sin errores. Haz captura de la TFT recortada y compárala con la maqueta.

- [ ] **Step 4: Commit**

```bash
git add src/moto/tablero.js src/moto/moto.js src/escena/escena.js src/escena/curvas.js
git commit -m "TFT: cuadro completo con reloj de competición, velocidad, marcha, trip y menú"
```

### Task 3: Tocar la TFT abre secciones; fuera los demás mandos y las etiquetas

**Files:**
- Modify: `src/camara/controles.js` (rayo sobre la pantalla)
- Modify: `src/moto/moto.js` (exponer la malla `screen`; quitar `hotspot()`, `hot`, `groups`, `updateGlow`)
- Modify: `src/camara/camara.js` (quitar `PIN_POS`, `pinEls`, `updatePins`)
- Modify: `src/escena/escena.js` (quitar llamadas a `updateGlow` y `updatePins`)
- Modify: `index.html` (quitar `#pins`; texto de `#hint` → `ARRASTRA PARA MIRAR · TOCA LA PANTALLA`)
- Modify: `src/style.css` (quitar estilos `#pins`, `.pin`)
- Modify: `src/pagina/pagina.js` (quitar referencias a `pinsEl`)

**Interfaces:**
- Consumes: `tftHit(u, v)` (Task 1); `bike.setHover(id)` (Task 2).
- Produces: `bike.screen` (la `T.Mesh` de la pantalla). En los controles, `pick(cx, cy) -> 'about'|'projects'|'contact'|null` usando `ray.intersectObject(bike.screen)` y `hit.uv`.

- [ ] **Step 1:** En `controles.js`, `pick` devuelve el id de `tftHit(hit.uv.x, hit.uv.y)` o `null`; el hover del ratón llama a `bike.setHover(id)` y pone el cursor `pointer` sobre una fila; al soltar sin arrastre (`!drag.moved`) con id → `page.setSection(id)`. En táctil (`pointerType !== 'mouse'`) la fila se enciende con `setHover(id)` y se apaga a los 250 ms (spec, «Decisiones mías»). Con `view.ext` no se puede tocar (como ahora).

- [ ] **Step 2:** Quita hotspots, glow, pins y sus estilos; el depósito, el manillar y el arranque dejan de responder. «Ver la moto» sigue en `#extbtn`.

- [ ] **Step 3: Verifica en el navegador:** pasar el ratón por cada fila la resalta y pone la mano; clic en cada fila abre su sección; arrastrar desde encima de la TFT más de 5 px y soltar NO abre nada (Review Focus); clic fuera de la TFT no abre nada; `grep -n "pin" src index.html` no devuelve restos de las etiquetas.

- [ ] **Step 4: Commit**

```bash
git add src index.html
git commit -m "TFT: tocar la pantalla abre las secciones; fuera las zonas del manillar y las etiquetas flotantes"
```

### Task 4: Cámara inicial más cerca de la TFT

**Files:**
- Modify: `src/camara/camara.js` (`VIEWS.home`: `eye`, `tgt`, `eyeP`, `tgtP`)

**Interfaces:**
- Consumes: `bike.screen` (Task 3) solo para medir.

- [ ] **Step 1:** Ajusta `VIEWS.home` para que, en 1440 × 900 y en reposo, la TFT mida **≥ 280 px** de ancho en pantalla y cada fila **≥ 24 px** de alto, y siga viéndose la carretera por encima del cuadro. Ajusta `eyeP`/`tgtP` (vertical) para que a 400 × 800 la TFT mida ≥ 200 px de ancho.

- [ ] **Step 2: Mide en el navegador:** proyecta las cuatro esquinas de `bike.screen` (geometría 0,15 × 0,075 con su `matrixWorld`) con `camera` y comprueba los anchos de arriba en 1440 × 900 y 400 × 800 (expón temporalmente lo necesario y quítalo antes del commit). Captura de ambas vistas.

- [ ] **Step 3: Commit**

```bash
git add src/camara/camara.js
git commit -m "Cámara: la vista inicial se acerca a la TFT para poder tocar el menú"
```

### Task 5: Páginas a pantalla completa con la escena desenfocada

**Files:**
- Modify: `src/style.css` (`#panel` → capa a pantalla completa; estado de lectura)
- Modify: `src/pagina/pagina.js` (clase de lectura, foco, fondo inerte)
- Modify: `src/camara/camara.js` (`setView`: sin zoom a los mandos)
- Modify: `src/escena/escena.js` (frecuencia baja con página abierta)

**Interfaces:**
- Produces: `document.getElementById('app').classList` contiene `reading` mientras hay una sección abierta (lo pone `setSection` de `pagina.js`; lo quitan `setSection('home')` y `toggleExt`). El API de escena añade `setReading(on: boolean)`, llamado por `pagina.js` junto a `setView`.

- [ ] **Step 1:** CSS de la capa: `#panel` ocupa toda la ventana por debajo de la cabecera (el menú de arriba sigue visible y por encima), fondo semitransparente oscuro, contenido centrado con ancho máximo de lectura (~1080 px para Proyectos, ~720 px para texto), scroll vertical propio, botón ✕ arriba a la derecha y `#pcredit` al pie. Con `#app.reading`, `#gl` lleva `filter: blur(…) brightness(…)` y se ocultan `#hero`, `#hint` y `#credit`. Transición de entrada/salida corta; instantánea con `prefers-reduced-motion`.

- [ ] **Step 2:** `camara.js`: `setView(id)` mantiene `view.cur = 'home'` para cualquier sección (sin zoom); las vistas `about`/`projects`/`contact`/`tank` se eliminan de `VIEWS`. `escena.js`: con `setReading(true)` el bucle solo dibuja una vez cada 100 ms (sigue avanzando la escena con el `dt` real); con `false`, todos los fotogramas.

- [ ] **Step 3:** `pagina.js`: al abrir, foco en el título de la página; Escape y ✕ cierran; mientras está abierta, `#gl` no recibe punteros.

- [ ] **Step 4: Verifica en el navegador:** abrir cada sección desde la TFT y desde el menú de arriba → escena desenfocada y oscura, contenido legible; abrir Créditos encima de una página y pulsar Escape → se cierran solo los créditos; segundo Escape → se cierra la página (Review Focus); tras cerrar, medir fps en 4 s → ~60 (Review Focus); abrir una página y pulsar «Ver la moto» → sin desenfoque y la moto girando.

- [ ] **Step 5: Commit**

```bash
git add src index.html
git commit -m "Páginas a pantalla completa con la escena desenfocada detrás y dibujo reducido mientras se lee"
```

### Task 6: Textos y maquetación de inicio, Sobre mí, Proyectos y Contacto

**Files:**
- Modify: `index.html` (hero y las tres secciones)
- Modify: `src/style.css` (cuadrícula de proyectos, ficha, tipografía de página)
- Modify: `CLAUDE.md` (qué hace ahora la TFT, páginas, nuevos textos)

- [ ] **Step 1: Hero** (copia exacta del spec): `<h1>Construyo soluciones con <em>software.</em></h1>`; `.lead`: «Estudiante de 3.º de desarrollo de software. Me gusta construir soluciones que funcionan, de la web al backend y los algoritmos. Busco prácticas en Madrid.»

- [ ] **Step 2: Sobre mí**, en el orden del spec: titular «Me gusta construir cosas que resuelven problemas»; párrafo 1 sobre pasar de un problema a algo que funciona (sin ejemplos inventados); párrafo 2 con 3.º de desarrollo de software, prácticas en Madrid, 20 h/semana, abierto a cualquier equipo que haga buen software; párrafo final con la pasión por la automoción (coches, motos, aviación) como lo que explica el diseño de la web. Ficha: Formación · Ubicación · Disponibilidad · Busco: Prácticas. Tecnologías: PHP, Laravel, Python, C++ y `[+ las tuyas]`.

- [ ] **Step 3: Proyectos:** titular «Lo que estoy construyendo»; filtro Todo / Automoción / Software general como ahora; tarjetas en cuadrícula de 2 columnas (≥ 900 px) y 1 (menos), con categoría, estado, título, descripción, ilustración (el SVG del circuito existente en la primera), etiquetas del stack y enlace o hueco `[...]`. Los dos proyectos y la tarjeta libre conservan sus textos actuales.

- [ ] **Step 4: Contacto:** mismo contenido actual en el marco de página.

- [ ] **Step 5: Verifica en el navegador:** 1440 × 900 y 400 × 800, las tres páginas legibles, sin scroll horizontal (`document.documentElement.scrollWidth === innerWidth`) y con scroll vertical propio (Review Focus); con `prefers-reduced-motion` (emulado) sin transiciones; sin WebGL — haz que `createScene` devuelva `null` temporalmente — el menú abre las tres páginas sobre fondo oscuro y la consola está limpia (Review Focus); restaura `createScene`. `npm test` y `npm run build` en verde.

- [ ] **Step 6: Commit**

```bash
git add index.html src/style.css CLAUDE.md
git commit -m "Textos nuevos (soluciones primero) y maquetación de páginas: inicio, Sobre mí, Proyectos y Contacto"
```
