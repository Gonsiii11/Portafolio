# Portfolio de Iván Herrera González

Portfolio personal en 3D para buscar prácticas de desarrollo de software.
**Web:** https://gonsiii11.github.io/Portafolio/

La experiencia principal muestra una moto en primera persona por una carretera
de sierra. La pantalla TFT de la moto es el menú: un cuadro completo (hora,
cuentarrevoluciones con velocidad y marcha reales, kilómetros recorridos) con
tres opciones táctiles, «Sobre mí», «Proyectos» y «Contacto».

- Un toque en la TFT acerca la cámara a la pantalla.
- De cerca, un toque en una opción la abre como página a pantalla completa,
  con la escena desenfocada detrás. Tocar fuera o pulsar Escape vuelve.
- El menú superior hace lo mismo y añade «Ver la moto», que la muestra girando
  desde fuera. Es también la vía para teclado, lectores de pantalla y la
  versión sin 3D.

El proyecto está orientado al software de automoción, sin limitarse a ese
sector. Iván está en 3.º de desarrollo de software y busca prácticas en
Madrid, 20 horas semanales.

## Tecnologías

- Vite.
- JavaScript sin framework.
- Three.js `0.128.0` (versión fijada por compatibilidad con el renderizado).
- Modelo y recursos 3D optimizados para carga progresiva y dispositivos
  móviles.

## Empezar

Requisitos: Node.js y npm.

```sh
npm install
npm run dev
```

Abre la dirección que te muestra la terminal (normalmente
http://localhost:5173).

Para comprobar la versión de producción:

```sh
npm run build
npm run preview
```

La compilación genera `dist/`.

## Estructura principal

- `index.html`: estructura y textos de la página.
- `src/main.js`: punto de entrada que une la página y la escena.
- `src/config.js`: configuración, colores y textos del cuadro.
- `src/pagina/`: secciones, modos, créditos y versión sin 3D.
- `src/escena/`: cielo, carretera, terreno, vegetación, rocas, mobiliario,
  curvas y carga progresiva.
- `src/moto/`: moto, espejos y pantalla TFT (dibujo del cuadro y lógica del
  menú, con tests en `tests/tft.test.js`).
- `src/camara/`: vistas, encuadre y controles de ratón, teclado y táctiles.
- `public/`: recursos optimizados que se sirven directamente.

## Accesibilidad y rendimiento

- La página funciona sin WebGL mediante la versión `#nogl`.
- Se respeta `prefers-reduced-motion`.
- La interfaz debe seguir siendo usable desde 400 px de ancho.
- Los recursos pesados se cargan por fases y existen variantes de textura para
  distintos dispositivos y conexiones.

## Recursos 3D

Los originales descargados se guardan fuera del repositorio, en
`modelos-fuente/`. La moto se convierte al formato optimizado del proyecto
con:

```sh
node herramientas/comprimir_moto.mjs
```

Las variantes WebP se generan con las herramientas de `herramientas/`. Los
recursos nuevos deben ser procedurales o estar instanciados siempre que sea
posible, y deben incluir su crédito y licencia.

## Instrucciones para Claude Code

Las instrucciones de trabajo y las reglas del proyecto están en
[`CLAUDE.md`](CLAUDE.md). Léelo antes de modificar la escena, los recursos o
los textos. Un buen primer mensaje:

> Lee CLAUDE.md, arranca el proyecto, ábrelo en el navegador y dime qué ves. Después hacemos el primer punto de la lista de pendientes.

## Publicar

Cada push a `main` publica la web en GitHub Pages automáticamente: el
workflow de `.github/workflows/` pasa los tests, construye `dist/` y la sube.

Para publicarla en otro sitio (Vercel, Netlify...):

- Build: `npm run build`
- Directorio de salida: `dist`

## Créditos

Todos los créditos visibles también se muestran en la propia web, en el panel
«Créditos».

- Moto 3D: «BMW S1000RR 2019», de VTX, licencia CC BY-NC-SA 4.0.
  [Crédito y licencia](public/bike/LICENSE-modelo.txt).
- Textura del asfalto: «Street road», de saifurrehman, licencia CC BY 4.0.
  [Crédito y licencia](public/carretera/LICENSE-modelo.txt).
- Fondo «Rolling Hills», de Poly Haven, licencia CC0.
- Pinos: «Scots Pine Trees Set», de Maksim Batyrev, licencia CC BY 4.0.
- Texturas del terreno, grava, rocas y mapa de normales del asfalto: Poly
  Haven, licencia CC0.

Las licencias y notas de los recursos están junto a cada recurso en `public/`.
