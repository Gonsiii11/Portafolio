"""Copia «Scots Pine Trees Set» (Maksim Batyrev, CC BY 4.0) a public/pinos/ con texturas reducidas.
La geometría (scene.bin) y scene.gltf se copian tal cual; solo cambian las texturas, con el mismo nombre.
Uso (desde la raíz del proyecto):  python3 -I herramientas/reducir_pinos.py
"""
import shutil
from pathlib import Path
from PIL import Image

SRC = Path('modelos-fuente/pinos/scots_pine_trees_set')
DST = Path('public/pinos')
SIZES = {  # nombre -> lado máximo en px
    'Mat_Foliage_1_baseColor.png': 1024,
    'Material_28_baseColor.png': 512,
    'Mat_Trunk_baseColor.jpeg': 512,
}

(DST / 'textures').mkdir(parents=True, exist_ok=True)
for f in ('scene.gltf', 'scene.bin'):
    shutil.copyfile(SRC / f, DST / f)
for name, side in SIZES.items():
    im = Image.open(SRC / 'textures' / name)
    if im.mode == 'RGBA':
        # Thicken the needles: grow the alpha mask by a few px (colour bleeds from neighbours) so the
        # foliage cards don't vanish into thin lines once mipmapped at a distance.
        from PIL import ImageFilter
        r, g, b, a = im.split()
        grown = a.filter(ImageFilter.MaxFilter(7))
        rgb = Image.merge('RGB', (r, g, b))
        blur = rgb.filter(ImageFilter.BoxBlur(4))
        rgb = Image.composite(rgb, blur, a.point(lambda v: 255 if v > 32 else 0))
        im = Image.merge('RGBA', (*rgb.split(), grown))
    im.thumbnail((side, side), Image.LANCZOS)
    out = DST / 'textures' / name
    if name.endswith('.png'):
        im.save(out, optimize=True)
    else:
        im.convert('RGB').save(out, quality=82, optimize=True, progressive=True)
    print(name, im.size, out.stat().st_size, 'bytes')
lic = (SRC / 'license.txt').read_text()
(DST / 'LICENSE-modelo.txt').write_text(lic + '\n\nCambios para esta web: texturas reducidas (1024/512 px); '
                                        'no se usa el plano de suelo «Box001»; los árboles se colocan por separado en la escena.\n')
