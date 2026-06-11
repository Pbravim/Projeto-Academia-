#!/usr/bin/env python3
"""Valida os seeds de exercícios (apps/mobile/src/infrastructure/exercises/seeds/).

Checagens:
  1. IDs únicos entre todos os arquivos de seed.
  2. IDs de alternativas (equivalent/muscle_group) resolvem para um ID conhecido
     (seeds ou catálogo existente em ExpoSQLiteDatabaseClient.ts).
  3. movement_pattern dentro do enum do spec sub-5.
  4. primary_equipment dentro do vocabulário controlado (null permitido).
  5. execution_type dentro do enum.
  6. musculo_alvo é array não-vazio.
  7. _manifest.json: covers[] resolvem, sem overlap entre sessões,
     exercise_count == len(covers).
  8. Nenhum exercício se auto-referencia como alternativa.

Uso: python scripts/validate_exercise_seeds.py [--list-flags]
  --list-flags: lista todos os review_flags abertos nos seeds (curadoria) e sai.
Sai com código 1 se houver erro (uso em CI); warnings não falham o build.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SEEDS_DIR = REPO / "apps/mobile/src/infrastructure/exercises/seeds"
DB_CLIENT = REPO / "apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts"

# Fonte: docs/superpowers/specs/2026-06-05-subproject-5-exercise-intelligence.md
MOVEMENT_PATTERNS = {
    "Horizontal Push", "Vertical Push", "Horizontal Pull", "Vertical Pull",
    "Horizontal Adduction",
    # Extensão 2026-06-10 (sessão ombros_lateral): raises de deltoide single-joint
    "Abduction", "Horizontal Abduction",
    "Squat", "Hinge", "Lunge", "Rotation",
    "Anti-Rotation", "Carry", "Gait", "Jump", "Sprint",
}
PRIMARY_EQUIPMENT = {
    "Barbell", "Dumbbell", "Cable", "Smith Machine", "Hack Squat Machine",
    "Leg Press", "Pec Deck", "Chest Supported Row", "Bodyweight",
    "Resistance Band", "Kettlebell", "Landmine", "Suspension Trainer",
    # Extensão 2026-06-10 (docs/exercises/catalog-maintenance.md §1)
    "Selectorized Machine", "Plate-Loaded Machine", "Assisted Machine",
}
EXECUTION_TYPES = {"Unilateral", "Bilateral", "Can Be Both"}

errors: list[str] = []
warnings: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)


def warn(msg: str) -> None:
    warnings.append(msg)


def load_catalog_ids() -> set[str]:
    """IDs já presentes no catálogo embutido nas migrations."""
    text = DB_CLIENT.read_text(encoding="utf-8")
    return set(re.findall(r"(?:seed|gif)-ex-\d+", text))


def list_review_flags() -> int:
    """Lista review_flags abertos (convenção: catalog-maintenance.md §3)."""
    total = 0
    for path in sorted(SEEDS_DIR.glob("*.json")):
        if path.name == "_manifest.json":
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        for rec in data.get("exercises", []):
            for flag in rec.get("review_flags") or []:
                total += 1
                print(f"{path.name} :: {rec['id']} ({rec.get('name', '?')})")
                print(f"  campo:    {flag.get('field')}")
                print(f"  questão:  {flag.get('concern')}")
                print(f"  revisitar: {flag.get('revisit_when')}  [desde {flag.get('flagged_at')}]")
    print(f"\n{total} flag(s) aberto(s)")
    return 0


def main() -> int:
    if "--list-flags" in sys.argv:
        return list_review_flags()

    catalog_ids = load_catalog_ids()

    seed_files = sorted(p for p in SEEDS_DIR.glob("*.json") if p.name != "_manifest.json")
    if not seed_files:
        err(f"Nenhum arquivo de seed encontrado em {SEEDS_DIR}")

    seed_ids: dict[str, str] = {}  # id -> arquivo
    all_records: list[tuple[str, dict]] = []

    for path in seed_files:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            err(f"{path.name}: JSON inválido — {e}")
            continue
        records = data.get("exercises")
        if not isinstance(records, list):
            err(f"{path.name}: chave 'exercises' ausente ou não é lista")
            continue
        for rec in records:
            rid = rec.get("id")
            if not rid:
                err(f"{path.name}: registro sem 'id': {str(rec)[:60]}")
                continue
            if rid in seed_ids:
                err(f"ID duplicado '{rid}' em {path.name} (já visto em {seed_ids[rid]})")
            seed_ids[rid] = path.name
            all_records.append((path.name, rec))

    known_ids = catalog_ids | set(seed_ids)

    for fname, rec in all_records:
        rid = rec["id"]
        loc = f"{fname}:{rid}"

        mp = rec.get("movement_pattern")
        if mp is not None and mp not in MOVEMENT_PATTERNS:
            err(f"{loc}: movement_pattern '{mp}' fora do enum")

        pe = rec.get("primary_equipment")
        if pe is not None and pe not in PRIMARY_EQUIPMENT:
            err(f"{loc}: primary_equipment '{pe}' fora do vocabulário controlado")

        et = rec.get("execution_type")
        if et is not None and et not in EXECUTION_TYPES:
            err(f"{loc}: execution_type '{et}' inválido")

        ma = rec.get("musculo_alvo")
        if not isinstance(ma, list) or not ma:
            err(f"{loc}: musculo_alvo deve ser array não-vazio (got {ma!r})")

        gm = rec.get("group_muscles")
        if not isinstance(gm, list) or not gm:
            err(f"{loc}: group_muscles deve ser array não-vazio (got {gm!r})")
        if "group_muscle" in rec:
            err(f"{loc}: campo legado 'group_muscle' (string) — usar 'group_muscles' (array)")

        for field in ("equivalent_alternatives", "muscle_group_alternatives"):
            for alt in rec.get(field) or []:
                if alt == rid:
                    err(f"{loc}: {field} contém o próprio exercício")
                elif alt not in known_ids:
                    err(f"{loc}: {field} referencia ID desconhecido '{alt}'")

        if not rec.get("name"):
            err(f"{loc}: 'name' vazio/ausente")

    # ---- Manifest ----
    manifest_path = SEEDS_DIR / "_manifest.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        err(f"_manifest.json ilegível: {e}")
        manifest = {}

    seen_covers: dict[str, str] = {}  # id -> sessão
    for sname, sess in (manifest.get("sessions") or {}).items():
        covers = sess.get("covers") or []
        count = sess.get("exercise_count")
        if count is not None and count != len(covers):
            err(f"_manifest.json:{sname}: exercise_count={count} mas covers tem {len(covers)}")
        for cid in covers:
            if cid not in known_ids:
                err(f"_manifest.json:{sname}: covers referencia ID desconhecido '{cid}'")
            if cid in seen_covers:
                err(f"_manifest.json: '{cid}' coberto por '{seen_covers[cid]}' E '{sname}'")
            seen_covers[cid] = sname
        if sess.get("status") == "complete" and not covers:
            warn(f"_manifest.json:{sname}: sessão completa sem covers[]")

    # Seeds novos que nenhuma sessão do manifest cobre
    uncovered = set(seed_ids) - set(seen_covers)
    if uncovered:
        warn(f"{len(uncovered)} ID(s) de seed fora de qualquer covers[]: {sorted(uncovered)[:10]}")

    # ---- Relatório ----
    print(f"Seeds: {len(seed_files)} arquivo(s), {len(all_records)} registro(s); "
          f"catálogo existente: {len(catalog_ids)} ID(s)")
    for w in warnings:
        print(f"  WARN  {w}")
    for e in errors:
        print(f"  ERRO  {e}")
    if errors:
        print(f"\nFALHOU: {len(errors)} erro(s), {len(warnings)} warning(s)")
        return 1
    print(f"\nOK: 0 erros, {len(warnings)} warning(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
