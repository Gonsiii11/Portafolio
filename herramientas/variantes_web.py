"""Genera las texturas de la web en WebP, en varios tamaños, para la carga por fases (ver «loadTiered» en src/main.js).

Cada textura tiene una versión pequeña que se ve enseguida y otra grande que la sustituye cuando el navegador
está libre; el tamaño grande depende del equipo (móvil/conexión lenta = tier 1, escritorio = tier 2).

Uso (desde la raíz del proyecto):  python3 -I herramientas/variantes_web.py
Antes, el panorama maestro se genera sin pérdidas con:
  python3 -I herramientas/hdr2jpg.py modelos-fuente/fondo/rolling_hills_4k.hdr modelos-fuente/fondo/rolling_hills_4096.png 1.0 4096 0.85 2.4 35
"""
from pathlib import Path
from PIL import Image

# (origen, destino sin extensión, {sufijo: lado mayor en px}, calidad WebP)
JOBS = [
    ('modelos-fuente/fondo/rolling_hills_4096.png', 'public/fondo/cielo', {'1k': 1024, '2k': 2048, '4k': 4096}, 78),
    ('modelos-fuente/terreno/aerial_grass_rock_diff_2k.jpg', 'public/terreno/hierba', {'512': 512, '1k': 1024, '2k': 2048}, 76),
    ('modelos-fuente/terreno/aerial_grass_rock_nor_gl_2k.jpg', 'public/terreno/hierba_normal', {'1k': 1024, '2k': 2048}, 80),
    ('modelos-fuente/terreno/stony_dirt_path_diff_1k.jpg', 'public/terreno/grava', {'512': 512, '1k': 1024}, 76),
    ('modelos-fuente/carretera/asfalto_girado.jpg', 'public/carretera/asfalto', {'': 1024}, 85),
    ('modelos-fuente/carretera/clean_asphalt/clean_asphalt_nor_gl_1k.jpg', 'public/carretera/asfalto_normal', {'': 1024}, 88),
]

for src, dst, sizes, q in JOBS:
    im = Image.open(src).convert('RGB')
    for suf, side in sizes.items():
        w, h = im.size
        s = min(1.0, side / max(w, h))
        out = im if s == 1.0 else im.resize((round(w * s), round(h * s)), Image.LANCZOS)
        path = Path(f'{dst}_{suf}.webp' if suf else f'{dst}.webp')
        out.save(path, 'WEBP', quality=q, method=6)
        print(f'{path}  {out.size[0]}x{out.size[1]}  {path.stat().st_size // 1024} KB')
