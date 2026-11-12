"""Copia «Scots Pine Trees Set» (Maksim Batyrev, CC BY 4.0) a public/pinos/ con texturas reducidas.
La geometría (scene.bin) se copia tal cual; las texturas se reducen y se guardan en WebP (con alfa donde hace falta),
y scene.gltf se reescribe para apuntar a los .webp.
Uso (desde la raíz del proyecto):  python3 -I herramientas/reducir_pinos.py
"""
import json
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
shutil.copyfile(SRC / 'scene.bin', DST / 'scene.bin')
gltf = json.loads((SRC / 'scene.gltf').read_text())
for img in gltf['images']:
    img['uri'] = str(Path(img['uri']).with_suffix('.webp'))
    img.pop('mimeType', None)
(DST / 'scene.gltf').write_text(json.dumps(gltf, separators=(',', ':')))
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
    out = (DST / 'textures' / name).with_suffix('.webp')
    if im.mode == 'RGBA':
        im.save(out, 'WEBP', quality=82, method=6, exact=True)
    else:
        im.convert('RGB').save(out, 'WEBP', quality=80, method=6)
    print(name, im.size, out.stat().st_size, 'bytes')
lic = (SRC / 'license.txt').read_text()
(DST / 'LICENSE-modelo.txt').write_text(lic + '\n\nCambios para esta web: texturas reducidas (1024/512 px) y en WebP; follaje engrosado; '
                                        'no se usa el plano de suelo «Box001»; los árboles se colocan por separado en la escena.\n')
