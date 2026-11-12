#!/bin/sh
# Reduce dos bolos de granito de Poly Haven (CC0) para la web y los copia a public/rocas/.
#   namaqualand_boulder_04 -> granito_a.glb   (≈4.700 triángulos)
#   namaqualand_boulder_05 -> granito_b.glb   (≈7.200 triángulos)
# Originales (glTF 1k) en modelos-fuente/rocas/<nombre>/, descargados de https://polyhaven.com/models
# Uso (desde la raíz del proyecto):  sh herramientas/reducir_rocas.sh
# Texturas a 512 px en WebP. Necesita @gltf-transform/cli 4.1.1 (se ejecuta con npx, no se instala en el proyecto).
set -e
GT="npx --yes @gltf-transform/cli@4.1.1"
TMP=$(mktemp -d)
reducir() {
  src="modelos-fuente/rocas/$1/$1_1k.gltf"
  $GT weld "$src" "$TMP/w.glb"
  $GT simplify "$TMP/w.glb" "$TMP/s.glb" --ratio 0.08 --error 0.02
  $GT resize "$TMP/s.glb" "$TMP/r.glb" --width 512 --height 512
  $GT dedup "$TMP/r.glb" "$TMP/d.glb"
  $GT quantize "$TMP/d.glb" "$TMP/q.glb"                 # vértices cuantizados (KHR_mesh_quantization)
  $GT webp "$TMP/q.glb" "public/rocas/$2" --quality 80   # texturas en WebP (EXT_texture_webp)
}
mkdir -p public/rocas
reducir namaqualand_boulder_04 granito_a.glb
reducir namaqualand_boulder_05 granito_b.glb
rm -rf "$TMP"
