# Portfolio de Iván Herrera González

Portfolio personal en 3D para buscar prácticas de desarrollo de software. La
experiencia principal muestra una moto en primera persona al atardecer: el
cuadro de instrumentos abre «Sobre mí», la maneta izquierda «Proyectos», la
maneta derecha «Contacto» y el depósito permite ver la moto desde fuera.

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
- `src/moto/`: moto, espejos, pantalla y zonas interactivas.
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

Se puede publicar en GitHub Pages, Vercel o Netlify. Usa:

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
