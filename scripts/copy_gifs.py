#!/usr/bin/env python3
"""
Copy GIF files from GIFS/ source tree to apps/mobile/assets/gifs/,
matching migration paths (unaccented) to disk files (accented).
"""

import os
import shutil
import unicodedata

REPO = "/Users/bravim/Documents/GitHub/projeto-academia"
GIFS_SRC = os.path.join(REPO, "GIFS")
ASSETS_DEST = os.path.join(REPO, "apps/mobile/assets/gifs")

# All unique media_local paths extracted from the migration SQL
MIGRATION_PATHS = [
    "ABDOMEN CORE (1)/ABS alternando pernas.gif",
    "ABDOMEN CORE (1)/ABS banco declinado completo.gif",
    "ABDOMEN CORE (1)/ABS com flexao lateral.gif",
    "ABDOMEN CORE (1)/ABS maquina.gif",
    "ABDOMEN CORE (1)/ABS obliquo.gif",
    "ABDOMEN CORE (1)/ABS polia alta 2.gif",
    "ABDOMEN CORE (1)/ABS polia alta.gif",
    "ABDOMEN CORE (1)/ABS remador pernas extendidas.gif",
    "ABDOMEN CORE (1)/Abs banco.gif",
    "ABDOMEN CORE (1)/Abs bola flexao de quadril.gif",
    "ABDOMEN CORE (1)/Abs lateral.gif",
    "ABDOMEN CORE (1)/Crunch 4.gif",
    "ABDOMEN CORE (1)/Crunch pernas elevadas.gif",
    "ABDOMEN CORE (1)/Crunch reverso.gif",
    "ABDOMEN CORE (1)/Dead bug.gif",
    "ABDOMEN CORE (1)/Flexao de quadril banco.gif",
    "ABDOMEN CORE (1)/Flexao lateral bola.gif",
    "ABDOMEN CORE (1)/Prancha frente tras.gif",
    "ABDOMEN CORE (1)/conventional-sit-up.gif",
    "ABDOMEN CORE (1)/obliquo polia baixa.gif",
    "ABDOMEN CORE (1)/weightedsitups.gif",
    "COSTAS E TRAPÉZIO (1)/Barra fixa nuca.gif",
    "COSTAS E TRAPÉZIO (1)/Encolhimento 3.gif",
    "COSTAS E TRAPÉZIO (1)/Pulldown1.gif",
    "COSTAS E TRAPÉZIO (1)/Puxada alta tradicional.gif",
    "COSTAS E TRAPÉZIO (1)/Puxada alta triangulo.gif",
    "COSTAS E TRAPÉZIO (1)/Puxada unilateral 1.gif",
    "COSTAS E TRAPÉZIO (1)/Remada alta.gif",
    "COSTAS E TRAPÉZIO (1)/Remada apoio banco inclinado.gif",
    "COSTAS E TRAPÉZIO (1)/Remada cabo.gif",
    "COSTAS E TRAPÉZIO (1)/Remada com halteres.gif",
    "COSTAS E TRAPÉZIO (1)/Remada inclinada.gif",
    "COSTAS E TRAPÉZIO (1)/Remada maquina.gif",
    "COSTAS E TRAPÉZIO (1)/Remada unilateral.gif",
    "COSTAS E TRAPÉZIO (1)/band-assisted-pull-up.gif",
    "COSTAS E TRAPÉZIO (1)/banded-wide-grip-row.gif",
    "COSTAS E TRAPÉZIO (1)/cable-face-pull.gif",
    "COSTAS E TRAPÉZIO (1)/cable-wide-grip-row.gif",
    "COSTAS E TRAPÉZIO (1)/single-arm-dumbbell-row.gif",
    "COSTAS E TRAPÉZIO (1)/t-bar-row-muscles.gif",
    "Gifs - Bonus/Biceps/Rosca Concentrada 2.gif",
    "Gifs - Bonus/Biceps/Rosca Scott Unil com Halteres.gif",
    "Gifs - Bonus/Biceps/biceps concentrado unilateral no cross.gif",
    "Gifs - Bonus/Biceps/biceps unilateral polia alta cross.gif",
    "Gifs - Bonus/Biceps/rosca  direta no banco scort.gif",
    "Gifs - Bonus/Biceps/rosca alternada aparelho biarticular.gif",
    "Gifs - Bonus/Biceps/rosca alternada pegada neutra sentado no banco.gif",
    "Gifs - Bonus/Biceps/rosca direta apaiada no banco barra W.gif",
    "Gifs - Bonus/Biceps/rosca direta barra W.gif",
    "Gifs - Bonus/Biceps/rosca direta barra pegada fechada sentado no banco.gif",
    "Gifs - Bonus/Biceps/rosca neutra no banco scort aparelho.gif",
    "Gifs - Bonus/Biceps/rosca no banco scort barra W.gif",
    "Gifs - Bonus/Biceps/rosca unilateral com halteres sentado no banco.gif",
    "Gifs - Bonus/Costas/Barra Livre pegada aberta.gif",
    "Gifs - Bonus/Costas/Hiperextensoes sem dispositivo (banco).gif",
    "Gifs - Bonus/Costas/barra livre pegada aberta joelhos flexionados.gif",
    "Gifs - Bonus/Costas/barra livre pegada pronada.gif",
    "Gifs - Bonus/Costas/barra no graviton em pe.gif",
    "Gifs - Bonus/Costas/levantamento terra no smith.gif",
    "Gifs - Bonus/Costas/pulley costa unilateral.gif",
    "Gifs - Bonus/Costas/pulley pegada aberta atras da nuca.gif",
    "Gifs - Bonus/Costas/pulley pegada aberta pronada.gif",
    "Gifs - Bonus/Costas/remada aberta no banco inclinado com halteres.gif",
    "Gifs - Bonus/Costas/remada baixa no pulley pegada aberta supinada.gif",
    "Gifs - Bonus/Costas/remada baixa unilateral no cross.gif",
    "Gifs - Bonus/Costas/remada cavalino com barra.gif",
    "Gifs - Bonus/Costas/remada inclinada no smith.gif",
    "Gifs - Bonus/Costas/remada inclinda no banco pegada supinda puxada fechada.gif",
    "Gifs - Bonus/Costas/remada livre  com halteres.gif",
    "Gifs - Bonus/Costas/remada no banco inclinado pegada pronada com barra.gif",
    "Gifs - Bonus/Costas/remada unilateral cavalindo barra puxada fechada.gif",
    "Gifs - Bonus/Costas/voador invertido.gif",
    "Gifs - Bonus/Membros Inferiores/Flexao Plantar com peso corporal.gif",
    "Gifs - Bonus/Membros Inferiores/Retrocesso com halteres.gif",
    "Gifs - Bonus/Membros Inferiores/adutora na tracao do cabo cross.gif",
    "Gifs - Bonus/Membros Inferiores/agachamento livre pes juntos.gif",
    "Gifs - Bonus/Membros Inferiores/agachamento na maquina.gif",
    "Gifs - Bonus/Membros Inferiores/agachamento pes afastados.gif",
    "Gifs - Bonus/Membros Inferiores/agachamento sumo com halteres.gif",
    "Gifs - Bonus/Membros Inferiores/flex de joelho  em pe no cabo cross.gif",
    "Gifs - Bonus/Membros Inferiores/leg press pes afastados.gif",
    "Gifs - Bonus/Membros Inferiores/levantamento terra com barra.gif",
    "Gifs - Bonus/Membros Inferiores/passada a frente com barra.gif",
    "Gifs - Bonus/Membros Inferiores/passada com halteres.gif",
    "Gifs - Bonus/Membros Inferiores/stiff no smth.gif",
    "Gifs - Bonus/Membros Inferiores/stiff unilateral com kettibel.gif",
    "Gifs - Bonus/Ombro/Desenvolmento Frontal com Elastico.gif",
    "Gifs - Bonus/Ombro/Desenvolvimento Sentado Smith.gif",
    "Gifs - Bonus/Ombro/Desenvolvimento com Barra.gif",
    "Gifs - Bonus/Ombro/Desenvolvimento com Halteres.gif",
    "Gifs - Bonus/Ombro/Desenvolvimento por tras com barra.gif",
    "Gifs - Bonus/Ombro/Elevacao Frontal Crossover.gif",
    "Gifs - Bonus/Ombro/desenvolvimento com rotacao.gif",
    "Gifs - Bonus/Ombro/desenvolvimento no smith barra na nuca.gif",
    "Gifs - Bonus/Ombro/desnvolvimento barra frente sentado.gif",
    "Gifs - Bonus/Ombro/elevacao bilateral na maquina.gif",
    "Gifs - Bonus/Ombro/elevacao lateral inclinado sentado.gif",
    "Gifs - Bonus/Ombro/elevacao unilateral frontal.gif",
    "Gifs - Bonus/Ombro/elevacao unilateral no cross.gif",
    "Gifs - Bonus/Ombro/remada livre com barra.gif",
    "Gifs - Bonus/Peito/Crucifixo Maquina.gif",
    "Gifs - Bonus/Peito/Dumbbell covers com halteres.gif",
    "Gifs - Bonus/Peito/crucifixo inclinado banco com halteres.gif",
    "Gifs - Bonus/Peito/flex de cotovelo completa.gif",
    "Gifs - Bonus/Peito/flex de cotovelo declinado.gif",
    "Gifs - Bonus/Peito/supino inclinado banco cross.gif",
    "Gifs - Bonus/Peito/supino inclinado banco no smith.gif",
    "Gifs - Bonus/Peito/supino reto pegada aberta.gif",
    "Gifs - Bonus/Peito/voador maquina.gif",
    "Gifs - Bonus/Trapezio/encolhimento livre com halteres.gif",
    "Gifs - Bonus/Trapezio/encolhimento maquina.gif",
    "Gifs - Bonus/Trapezio/encolhimento na barra livre.gif",
    "Gifs - Bonus/Trapezio/encolhimento no smith.gif",
    "Gifs - Bonus/Trapezio/encolhimento pegada fechada barra no cross.gif",
    "Gifs - Bonus/Trapezio/encolhimento sentado no banco com halteres.gif",
    "Gifs - Bonus/Trapezio/encolhimento sentado no banco inlinado com halteres.gif",
    "Gifs - Bonus/Trapezio/remada alta com halteres.gif",
    "Gifs - Bonus/Trapezio/remada alta pegada abeta com barra.gif",
    "Gifs - Bonus/Triceps/Apoio de frente pegada fechada parede.gif",
    "Gifs - Bonus/Triceps/Supino declinado pegada fechada.gif",
    "Gifs - Bonus/Triceps/Triceps testa com halteres.gif",
    "Gifs - Bonus/Triceps/arnold_dips-maschine.gif",
    "Gifs - Bonus/Triceps/flex de cotovelo fechado livre.gif",
    "Gifs - Bonus/Triceps/flex de cotovelo fechado.gif",
    "Gifs - Bonus/Triceps/supino declinado no smit.gif",
    "Gifs - Bonus/Triceps/triceps na paralela maquiba.gif",
    "Gifs - Bonus/Triceps/triceps paralelo no banco.gif",
    "Gifs - Bonus/Triceps/triceps patada unilateral com halteres.gif",
    "Gifs - Bonus/Triceps/triceps tresta com halteres.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/Afundo cruzando perna de tras.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/Afundo lateral com barra.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/Agachamento frontal 02.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/Agchamento smith.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/Avanco com barra.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/Aviao unilateral.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/Cadeira adutora.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/Clean.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/ELEVACAO PELVICA APOIO UNILATERAL.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/Elevacao pelvica pes elevados.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/Elevacao pelvica.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/Extensao 6 apoios.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/Extensao de quadril 01.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/Flexao nordica.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/Flexora em pe unilateral.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/Front squat.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/Good morning.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/Leg press 45.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/Mesa flexora.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/Passadas com halteres.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/Pistol 02.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/Recuo.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/Stiff com halteres.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/band-standing-hip-extension.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/barbell-good-morning.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/barbell-hip-thrust.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/barbell-romanian-deadlift-movement.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/frog-pump.gif",
    "MEMBROS INFERIORES E GLÚTEOS (1)/glute-bridge.gif",
    "PANTURRILHA (1)/seated-calf-raise-dumbbell.gif",
    "PEITORAL (1)/CRUCIFIXO POLIA BAIXA.gif",
    "PEITORAL (1)/Cross over 1.gif",
    "PEITORAL (1)/Cross over 2.gif",
    "PEITORAL (1)/Cross over polia baixa.gif",
    "PEITORAL (1)/Crucifico com halteres.gif",
    "PEITORAL (1)/Crucifixo inclinado com halteres.gif",
    "PEITORAL (1)/Crucifixo inclinado no cabo 2.gif",
    "PEITORAL (1)/Declinado smith.gif",
    "PEITORAL (1)/Flexao apoio alto banco.gif",
    "PEITORAL (1)/Flexao assistida.gif",
    "PEITORAL (1)/INCLINADO NO SMITH.gif",
    "PEITORAL (1)/Paralelas graviton.gif",
    "PEITORAL (1)/Peck deck.gif",
    "PEITORAL (1)/Press alto inclinado.gif",
    "PEITORAL (1)/Press peitoral 3.gif",
    "PEITORAL (1)/SUPINO ALTERNADO COM HALTERES.gif",
    "PEITORAL (1)/Supino barra.gif",
    "PEITORAL (1)/Supino incliando com halteres.gif",
    "PEITORAL (1)/Supino inclinado.gif",
    "PEITORAL (1)/Supino smith.gif",
    "PEITORAL (1)/barbell-decline-bench-press.gif",
    "PEITORAL (1)/bench-press-feet-up.gif",
    "PEITORAL (1)/cable-cross-over.gif",
    "PEITORAL (1)/chest-press-machine.gif",
    "PEITORAL (1)/decline-cable-fly.gif",
    "PEITORAL (1)/dumbbell-chest-press.gif",
    "PEITORAL (1)/dumbbell-one-arm-chest-press.gif",
    "PEITORAL (1)/high-cable-fly.gif",
    "PEITORAL (1)/incline-barbell-bench-press.gif",
    "PEITORAL (1)/low-cable-chest-flys.gif",
    "PEITORAL (1)/pike-push-up.gif",
    "PEITORAL (1)/push-up-bars.gif",
    "TRÍCEPS (1)/Paralelas no graviton.gif",
    "TRÍCEPS (1)/Triceps extensao unilateral.gif",
    "TRÍCEPS (1)/Triceps frances barra w.gif",
    "TRÍCEPS (1)/Triceps frances inclinado com halter.gif",
    "TRÍCEPS (1)/Triceps frances unilateral cabo.gif",
    "TRÍCEPS (1)/Triceps frances.gif",
    "TRÍCEPS (1)/Triceps maquina 01.gif",
    "TRÍCEPS (1)/Triceps maquina 02.gif",
    "TRÍCEPS (1)/Triceps pulley.gif",
    "TRÍCEPS (1)/Triceps testa 01.gif",
    "TRÍCEPS (1)/Triceps testa unilateral.gif",
    "TRÍCEPS (1)/bench-tricep-dips.gif",
    "TRÍCEPS (1)/cable-tricep-kickback.gif",
    "TRÍCEPS (1)/close-grip-bench-press-movement.gif",
    "TRÍCEPS (1)/overhead-cable-tricep-extension.gif",
]

# Subdir mapping for Gifs - Bonus
BONUS_SUBDIR_MAP = {
    "Biceps": "Bíceps (34)",
    "Costas": "Costas (55)",
    "Membros Inferiores": "Membros Inferiores (54)",
    "Ombro": "Ombro (47)",
    "Peito": "Peito (40)",
    "Trapezio": "Trapézio (10)",
    "Triceps": "Tríceps (37)",
}

# Top-level dirs that follow the <name> (1)/<filename> (1).gif pattern
NUMBERED_DIRS = {
    "ABDOMEN CORE (1)",
    "COSTAS E TRAPÉZIO (1)",
    "MEMBROS INFERIORES E GLÚTEOS (1)",
    "PANTURRILHA (1)",
    "PEITORAL (1)",
    "TRÍCEPS (1)",
}


def normalize(s):
    """Lowercase and strip accents for fuzzy matching."""
    s = s.lower()
    # Normalize unicode to decomposed form, then strip combining characters
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return s


def find_file_in_dir(src_dir, target_stem):
    """
    Find a .gif file in src_dir whose stem (without ' (1)') matches target_stem
    using accent-insensitive, case-insensitive comparison.
    Returns the full path or None.
    """
    norm_target = normalize(target_stem)
    try:
        entries = os.listdir(src_dir)
    except FileNotFoundError:
        return None

    for entry in entries:
        if not entry.lower().endswith('.gif'):
            continue
        # Strip the ' (1)' suffix from the disk filename stem
        stem = entry[:-4]  # remove .gif
        if stem.endswith(' (1)'):
            stem = stem[:-4]  # remove ' (1)'
        if normalize(stem) == norm_target:
            return os.path.join(src_dir, entry)
    return None


def resolve_source_path(migration_path):
    """Return the absolute source path on disk for a given migration path, or None."""
    parts = migration_path.split("/")
    top = parts[0]
    filename = parts[-1]
    target_stem = filename[:-4]  # strip .gif

    if top in NUMBERED_DIRS:
        src_dir = os.path.join(GIFS_SRC, top)
        return find_file_in_dir(src_dir, target_stem)

    elif top == "Gifs - Bonus":
        subdir_key = parts[1]
        mapped_subdir = BONUS_SUBDIR_MAP.get(subdir_key)
        if mapped_subdir is None:
            return None
        src_dir = os.path.join(GIFS_SRC, "Gifs - Bonus (1)", mapped_subdir)
        return find_file_in_dir(src_dir, target_stem)

    return None


copied = 0
skipped_already = 0
failed = []

for mpath in MIGRATION_PATHS:
    src = resolve_source_path(mpath)
    if src is None:
        failed.append((mpath, "Source file not found in GIFS/"))
        continue

    dest = os.path.join(ASSETS_DEST, mpath)
    dest_dir = os.path.dirname(dest)
    os.makedirs(dest_dir, exist_ok=True)

    if os.path.exists(dest):
        # Overwrite to ensure fresh copy
        pass

    shutil.copy2(src, dest)
    copied += 1

print(f"\n=== RESULT ===")
print(f"Copied: {copied}")
print(f"Failed: {len(failed)}")
if failed:
    print("\nFailed files:")
    for path, reason in failed:
        print(f"  FAIL: {path}")
        print(f"        {reason}")
else:
    print("All files copied successfully!")
