# Portfolio de Iván Herrera González

## Qué es
Web personal en 3D para buscar prácticas. El visitante ve una moto en primera persona (atardecer, carretera) y los mandos abren las secciones: cuadro de instrumentos = Sobre mí, maneta izquierda = Proyectos, maneta derecha (arranque) = Contacto, depósito = Ver la moto (la moto gira por fuera).

## Objetivo y tono
- Llamativo y motivador, con foco en software de automoción, **sin cerrar puertas a otras vacantes de software**.
- Todo el texto de la web en español, directo y honesto. No inventar logros: cada proyecto lleva su estado real (en curso, planificado, terminado).
- Iván: 3.º curso de desarrollo de software; busca prácticas en Madrid, 20 h/semana.

## Stack
- Vite + JavaScript sin framework + Three.js **0.128.0 (fijada a propósito)**. El código usa APIs de esa versión (`outputEncoding`, `sRGBEncoding`). No subir de versión sin migrar el renderizado.
- `index.html`: estructura y textos. `src/style.css`: estilos. `src/main.js`: lógica de la página y la escena 3D (función `initGL`).
- `public/bike/`: moto convertida a un formato ligero propio (`bike.json` describe materiales y piezas, `bike.bin` la geometría cuantizada, `tx/` las texturas).

## Cómo arrancar
```
npm install
npm run dev      # servidor local
npm run build    # genera dist/
```

## Reglas que no se rompen
1. **Licencia del modelo:** la moto es «BMW S1000RR 2019» de VTX (https://sketchfab.com/3d-models/bmw-s1000rr-2019-f842e86791ae4820aa7d45f76ecc94dc), CC BY-NC-SA 4.0. El crédito tiene que verse siempre en la web (hoy está en `#credit`). Solo uso no comercial; si se modifica el modelo, se mantiene la misma licencia. Texto original en `public/bike/LICENSE-modelo.txt`.
2. **Nada de la M 1000 R de Iván** (ni modelo ni fotos) por ahora; ese contenido se tratará aparte.
3. Cualquier modelo 3D nuevo (por ejemplo una carretera) debe tener licencia que permita su uso y llevar su crédito.
   - Carretera: textura de «Street road» de saifurrehman (https://sketchfab.com/3d-models/street-road-a01b47f299b24ac99a1dcd8e2111364b), CC BY 4.0. Solo se usa la textura del asfalto (`public/carretera/asfalto.jpg`); crédito en `#credit` y `#pcredit`, licencia en `public/carretera/LICENSE-modelo.txt`.
   - Fondo: panorama «Rolling Hills» de Poly Haven (CC0, no exige crédito), convertido con `herramientas/hdr2jpg.py` a `public/fondo/rolling_hills.jpg`.
   - Pinos: «Scots Pine Trees Set» de Maksim Batyrev (https://sketchfab.com/3d-models/scots-pine-trees-set-422b961ff3d14e7baa7e9077572b2247), CC BY 4.0. En `public/pinos/` con texturas reducidas y follaje engrosado (`herramientas/reducir_pinos.py`); crédito en `#credit` y `#pcredit`.
   - Terreno: textura «Aerial Grass Rock» de Poly Haven (CC0, no exige crédito) en `public/terreno/hierba.jpg`; nota en `public/terreno/LICENSE.txt`.
   - Los originales descargados van en `modelos-fuente/` (fuera de git).
4. Accesible y responsive: tiene que funcionar a 400 px de ancho, respetar `prefers-reduced-motion` y tener la versión sin 3D (`#nogl`).
5. Los datos de contacto y proyectos entre corchetes `[...]` son huecos por rellenar: no sustituirlos por datos inventados.

## Pendiente (por orden)
1. Rellenar Contacto (email, LinkedIn, GitHub, enlace al CV) y los proyectos reales.
2. Inclinación del móvil para mirar alrededor (`DeviceOrientationEvent`; en iPhone pide permiso con `requestPermission` desde un toque).
3. Paisaje de sierra con pinos (rama `paisaje/*`): hechos el fondo, el asfalto, los pinos y el terreno a los lados; faltan las rocas y cambiar las farolas.
4. Separar `main.js` en módulos (escena, moto, interfaz, datos de proyectos).
5. Probar en móvil y escritorio, y mirar el rendimiento.
6. Publicar en Vercel o Netlify.

## Cómo trabajar aquí
- Cambios pequeños y uno por uno; abrir la página y comprobar el resultado con capturas antes de dar algo por hecho.
- Nombres de piezas del modelo y coordenadas útiles: el centro del cuadro de instrumentos está en (0.003, 0.415, -0.551) en el espacio de la moto; el frente apunta a -z; las ruedas tocan y = -0.482.
