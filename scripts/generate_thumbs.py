# Gera thumbnails estaticas (1o frame, JPEG ~160px) para os GIFs do catalogo.
# As listas renderizam a thumb (~8 KB) em vez de decodificar o GIF inteiro;
# o GIF cheio continua sendo usado apenas no ExerciseMediaViewer.
#
# Uso (da raiz do repo):  python scripts/generate_thumbs.py
# Saidas: apps/mobile/assets/thumbs/**  +  src/ui/exercises/components/thumbAssets.ts

import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
GIFS = ROOT / 'apps' / 'mobile' / 'assets' / 'gifs'
THUMBS = ROOT / 'apps' / 'mobile' / 'assets' / 'thumbs'
TS_OUT = ROOT / 'apps' / 'mobile' / 'src' / 'ui' / 'exercises' / 'components' / 'thumbAssets.ts'
MAX_SIZE = 160
QUALITY = 70

entries = []
count = 0
for gif in sorted(GIFS.rglob('*.gif')):
    rel = gif.relative_to(GIFS)                      # ex.: PEITO/supino reto.gif
    key = str(rel).replace(os.sep, '/')              # chave identica ao gifAssets
    out = THUMBS / rel.with_suffix('.jpg')
    out.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(gif) as im:
        im.seek(0)                                   # primeiro frame
        frame = im.convert('RGB')
        frame.thumbnail((MAX_SIZE, MAX_SIZE))
        frame.save(out, 'JPEG', quality=QUALITY, optimize=True)

    rel_jpg = str(rel.with_suffix('.jpg')).replace(os.sep, '/')
    entries.append((key, rel_jpg))
    count += 1

lines = [
    '// Auto-generated — do not edit manually. Run scripts/generate_thumbs.py to refresh.',
    '// Thumbs estaticas (1o frame, JPEG) dos GIFs do catalogo — mesmas chaves do gifAssets.',
    '/* eslint-disable */',
    '// prettier-ignore',
    'export const thumbAssets: Record<string, ReturnType<typeof require>> = {',
]
for key, rel_jpg in entries:
    lines.append(f"  '{key}': require('../../../../assets/thumbs/{rel_jpg}'),")
lines.append('};')
lines.append('')

TS_OUT.write_text('\n'.join(lines), encoding='utf-8')

total_kb = sum(f.stat().st_size for f in THUMBS.rglob('*.jpg')) / 1024
print(f'{count} thumbs geradas em {THUMBS} ({total_kb:.0f} KB); mapa em {TS_OUT}')
