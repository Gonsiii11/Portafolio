"""Radiance .hdr (RLE RGBE) -> tonemapped sRGB JPG.  usage: hdr2jpg.py in.hdr out.jpg [exposure] [width]"""
import sys
import numpy as np
from PIL import Image

def read_hdr(path):
    data = open(path, 'rb').read()
    pos = 0
    while True:  # header lines until blank line
        end = data.index(b'\n', pos)
        line = data[pos:end]; pos = end + 1
        if line == b'':
            break
    end = data.index(b'\n', pos)
    dims = data[pos:end].split(); pos = end + 1
    h, w = int(dims[1]), int(dims[3])
    img = np.zeros((h, w, 4), np.uint8)
    buf = np.frombuffer(data, np.uint8)
    for y in range(h):
        if buf[pos] == 2 and buf[pos + 1] == 2:
            pos += 4
            for c in range(4):
                x = 0
                row = img[y, :, c]
                while x < w:
                    n = int(buf[pos]); pos += 1
                    if n > 128:
                        n -= 128
                        row[x:x + n] = buf[pos]; pos += 1
                    else:
                        row[x:x + n] = buf[pos:pos + n]; pos += n
                    x += n
        else:
            img[y] = buf[pos:pos + w * 4].reshape(w, 4); pos += w * 4
    e = img[..., 3].astype(np.float32)
    scale = np.where(e > 0, np.ldexp(1.0, (e - 136).astype(np.int32)), 0.0)
    return img[..., :3].astype(np.float32) * scale[..., None]

def aces(x):
    a, b, c, d, e = 2.51, 0.03, 2.43, 0.59, 0.14
    return np.clip((x * (a * x + b)) / (x * (c * x + d) + e), 0, 1)

src, dst = sys.argv[1], sys.argv[2]
exposure = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
width = int(sys.argv[4]) if len(sys.argv) > 4 else 2048
lin = read_hdr(src)
# rotate so the sun lands at u = sun_u (three.js equirect: u=0.25 is -Z, straight ahead)
sun_u = float(sys.argv[5]) if len(sys.argv) > 5 else None
if sun_u is not None:
    lum = lin.sum(axis=2)
    sy, sx = np.unravel_index(np.argmax(lum), lum.shape)
    W = lin.shape[1]
    lin = np.roll(lin, int(round(sun_u * W)) - sx, axis=1)
    print('sun at px', sx, sy, '-> u', sun_u, ' v', round(sy / lin.shape[0], 3))
rgb = aces(lin * exposure)
srgb = np.where(rgb <= 0.0031308, rgb * 12.92, 1.055 * np.power(rgb, 1 / 2.4) - 0.055)
im = Image.fromarray((srgb * 255 + 0.5).astype(np.uint8))
if im.width != width:
    im = im.resize((width, width // 2), Image.LANCZOS)
im.save(dst, quality=82, optimize=True, progressive=True)
print(dst, im.size)
