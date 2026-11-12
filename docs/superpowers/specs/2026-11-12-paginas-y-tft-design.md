# Páginas a pantalla completa y la TFT como menú — diseño

Fecha: 2026-11-12 · Proyecto: portfolio 3D de Iván Herrera (ver `CLAUDE.md`)

## Intención

Iván no está convencido ni de cómo se ven «Sobre mí» y «Proyectos» ni, en parte, de lo que cuentan. Quiere dos cosas:

1. **Cuando se lee información, la moto pasa a segundo plano.** Hoy la cámara se acerca al mando y se abre un panel lateral genérico; la información compite con la escena.
2. **La pantalla TFT de la moto orquesta las secciones.** Desde el asiento, la TFT es el menú principal: se toca una sección en la pantalla y se abre su página.

Y un cambio de mensaje: lo primero que debe transmitir el portfolio es que **a Iván le gusta crear software y construir soluciones**; la pasión por la automoción va después, como nota personal, no como límite («no quiero centrarme 100 % en eso»).

## Objetivos

- La TFT, vista desde el asiento, es un cuadro de moto completo y creíble que además funciona como menú táctil.
- Al elegir una sección (en la TFT o en el menú de arriba), su contenido ocupa toda la pantalla y la escena queda detrás, oscurecida y desenfocada.
- Los textos del inicio y de «Sobre mí» siguen el nuevo orden: soluciones primero, automoción al final.
- Proyectos se muestran como ahora: breve descripción, el proyecto en sí o su enlace, y el stack.

## No objetivos

- Rellenar los datos de contacto o inventar proyectos: siguen los huecos `[...]` (regla 5 de `CLAUDE.md`).
- Rehacer el renderizado (posprocesado) o añadir otro renderizador (CSS3D).
- Cambiar las curvas, la carga por fases, el paisaje o la quietud del fondo (preferencias ya fijadas; ver `CLAUDE.md`).

## Anti-objetivos (sería un fracaso aunque funcione)

- Que la TFT no se pueda leer o no se acierte con el ratón o el dedo en la vista inicial de escritorio.
- Que las páginas parezcan una plantilla genérica o que la moto siga robando la atención mientras se lee.
- Afirmar logros que no existen: los dos proyectos están «Planificado» y «En preparación»; ningún titular puede decir «he construido».

## Restricciones

- three.js 0.128.0 fijada; JavaScript sin framework; sin dependencias nuevas.
- Créditos siempre visibles (regla 1): línea `#credit` sobre la escena y `#pcredit` dentro de las páginas, con el botón «Créditos».
- 400 px de ancho, `prefers-reduced-motion` y versión sin 3D (`#nogl`) tienen que seguir funcionando.
- El fondo (cielo y montañas) no se mueve más de lo que ya se mueve (memoria «curvas-referencia»).

## Enfoques considerados

1. **TFT pintada en un canvas de la escena + páginas HTML encima** *(elegido por Iván)*. La TFT se sigue dibujando en el canvas de `src/moto/tablero.js`; al tocarla, el rayo de `src/camara/controles.js` da el punto de la pantalla (coordenadas UV del plano) y de ahí la opción. Las páginas son HTML a pantalla completa; la escena se desenfoca con CSS y se dibuja a pocos fotogramas mientras hay una página abierta. Reutiliza lo que ya funciona e integra la TFT con la luz y los reflejos. Las opciones de la TFT no son botones accesibles: lo cubre el menú de arriba, que se mantiene.
2. **TFT como HTML real proyectado (`CSS3DRenderer`)**: botones accesibles y texto nítido, pero el HTML siempre queda por encima del 3D (no le afectan luz, reflejos ni parabrisas) y añade un segundo renderizador. Descartado.
3. **Desenfoque por posprocesado en WebGL**: más control, pero obliga a rehacer el pipeline; para un fondo borroso no compensa. Descartado.

## Lo decidido

### La TFT (pantalla de la moto)

Mismo plano y canvas que hoy (`screen` en `src/moto/moto.js`, 0,15 × 0,075 m; canvas 1024 × 512 en `tablero.js`), rediseñado según la maqueta elegida (`.superpowers/brainstorm/…/tft-completa-v2.html`, opción A):

- **Barra superior:** hora local real `HH:MM` a la izquierda; «● BUSCO PRÁCTICAS» en cian a la derecha. **Sin «MODO»** (Iván: no aporta nada).
- **Izquierda — reloj redondo de competición:** esfera con anillo interior, arco de 0 a 14 (×1000 rpm) con marcas numeradas, zona roja de 12 a 14, aguja naranja con brillo, velocidad digital grande en el centro (velocidad real de la escena en km/h) con «KM/H» debajo, y la marcha en un recuadro dentro de la esfera.
- **Derecha — menú en lista:** tres opciones, **SOBRE MÍ · PROYECTOS · CONTACTO** (sin «Ver la moto»; Iván lo pidió). Cada fila con «›». La fila bajo el ratón se resalta en naranja (fondo `#FF5A36`, texto oscuro), como en la maqueta.
- **Barra inferior:** `TRIP` con los km recorridos en la escena (un decimal, coma decimal), `BASE MADRID`, `DISP. 20 H/SEM`, `CURSO 3.º`.
- **Interacción:** tocar o hacer clic en una fila abre su página. El cursor pasa a «mano» sobre las filas.
- La TFT es ahora el único elemento pulsable de la moto: desaparecen las zonas pulsables del manillar, el arranque y el depósito, y las etiquetas flotantes (`#pins`). *(Mi propuesta, para que la TFT sea claramente «el» mando; ver «Decisiones mías».)*

### Vista inicial

La cámara del asiento se acerca a la TFT lo justo para que, en escritorio de 1440 px, la TFT mida al menos unos 280 px de ancho y cada fila del menú unos 24 px de alto en pantalla (hoy la TFT mide ~150 px). Se sigue viendo la carretera por encima del cuadro. El texto de ayuda pasa a «ARRASTRA PARA MIRAR · TOCA LA PANTALLA».

### Páginas a pantalla completa (Sobre mí, Proyectos, Contacto)

Según la maqueta elegida (`proyectos-marco.html`, opción A):

- Al abrir una sección, la escena queda detrás, **oscurecida y desenfocada**; el contenido ocupa la pantalla, centrado y con ancho de lectura cómodo, con desplazamiento vertical propio.
- El **menú de arriba se mantiene** visible (Inicio, Sobre mí, Proyectos, Contacto, Ver la moto) y marca la sección activa. Cerrar (botón ✕ y Escape) vuelve al asiento con la TFT como menú.
- Mientras hay una página abierta la escena se dibuja a baja frecuencia (no se ve con detalle) para ahorrar batería.
- La cámara no hace zoom a los mandos al abrir una sección (ya no hace falta; la escena está desenfocada).
- **Proyectos:** cuadrícula de tarjetas (dos columnas en escritorio, una en móvil). Cada tarjeta: línea de categoría, estado (Planificado / En preparación…), título, descripción breve, ilustración o captura si la hay (la trazada del circuito ya existe como SVG), stack en etiquetas y enlace «Ver proyecto ↗» o el hueco `[...]` si aún no hay enlace. Se mantiene el filtro Todo / Automoción / Software general. Titular honesto (sin «he construido»), p. ej. «Lo que estoy construyendo».
- **Sobre mí** y **Contacto** usan el mismo marco de página.

### Textos

- **Inicio (hero):** titular **«Construyo soluciones con software.»** (elegido por Iván). Texto de debajo: «Estudiante de 3.º de desarrollo de software. Me gusta construir soluciones que funcionan, de la web al backend y los algoritmos. Busco prácticas en Madrid.» Se mantiene la píldora «Busco prácticas · Madrid · 20 h/semana».
- **Sobre mí**, en este orden (Iván):
  1. Que le gusta crear software y construir soluciones: titular propuesto «Me gusta construir cosas que resuelven problemas» *(propuesta, pendiente de que Iván lo valide)* y un primer párrafo sobre pasar de un problema a algo que funciona.
  2. Lo práctico: 3.º de desarrollo de software, prácticas en Madrid, 20 h/semana, abierto a cualquier equipo que haga buen software.
  3. Al final, como nota personal: la pasión por la automoción (coches, motos, aviación), que explica el diseño de la web.
  - Ficha: Formación · Ubicación · Disponibilidad · **Busco: prácticas** (se quita «Foco: Software de automoción»).
  - Tecnologías: PHP, Laravel, Python, C++ y el hueco `[+ las tuyas]` hasta que Iván lo rellene.
  - Si Iván da un ejemplo concreto de solución, se nombra en el primer párrafo; si no, el texto se queda general (sin inventar).
- **Proyectos y Contacto:** mismo contenido que hoy, en el nuevo marco.

## Lo que queda al constructor

- Posición exacta de la cámara de la vista inicial (cumpliendo los tamaños mínimos de arriba) y su versión en vertical/móvil.
- Cantidad de desenfoque y oscurecimiento, transición de entrada y salida (instantánea con `prefers-reduced-motion`), frecuencia de dibujo con página abierta.
- Cómo se calcula la marcha y las revoluciones a partir de la velocidad (bandas de marcha plausibles), y el comportamiento de la aguja al arrancar la página.
- Tamaños de letra de la TFT para que sus etiquetas se lean a su tamaño real en pantalla.
- Puntos de corte de la cuadrícula, espaciados y estilos concretos dentro del sistema visual actual (colores `--accent`, `--cyan`, fuentes Space Grotesk / Inter / JetBrains Mono).
- Gestión de foco y accesibilidad de la página (foco al abrir, Escape, fondo inerte), y la versión sin 3D (página sobre fondo oscuro, sin escena).

## Decisiones mías (para revisar)

- Quitar las zonas pulsables del manillar, arranque y depósito y las etiquetas flotantes: la TFT pasa a ser el único mando. «Ver la moto» sigue en el menú de arriba.
- «Contacto» en el mismo formato de página completa.
- Titular de Proyectos sin «he construido» mientras los proyectos no estén terminados.
- Acercar la cámara inicial a la TFT.
- Sin ratón (pantallas táctiles) no hay fila resaltada por defecto: al tocar, la fila se enciende un instante en naranja y se abre la página.
- Con el botón de arranque desaparece la animación de «arranque» (la aguja subiendo antes de abrir Contacto); la aguja pasa a seguir la velocidad de la moto.
