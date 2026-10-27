#!/usr/bin/env bash
# Publie des fichiers de données sur la branche « donnees », qui ne garde qu'UN seul enregistrement
# (aucun historique : le dépôt ne grossit plus). Les autres fichiers déjà présents sur la branche sont conservés.
# Usage : bash outils/publier-donnees.sh tv.json donnees/sport
set -u
files=()
for p in "$@"; do [ -e "$p" ] && files+=("$p"); done
[ ${#files[@]} -eq 0 ] && { echo "Rien à publier."; exit 0; }
git config user.name "mon-ecran"
git config user.email "mon-ecran@users.noreply.github.com"
export GIT_INDEX_FILE="$(mktemp -u)"
for i in 1 2 3 4 5; do
  if git fetch -q origin donnees 2>/dev/null; then
    base=$(git rev-parse FETCH_HEAD); git read-tree "$base"; lease="--force-with-lease=donnees:$base"
  else
    git read-tree --empty; lease="--force-with-lease=donnees:"
  fi
  for p in "${files[@]}"; do git rm -r -q --cached --ignore-unmatch "$p"; done
  git add -f "${files[@]}"
  tree=$(git write-tree)
  commit=$(echo "Données $(date -u +%Y-%m-%dT%H:%MZ)" | git commit-tree "$tree")
  if git push -q $lease origin "$commit:refs/heads/donnees"; then echo "Publié sur la branche donnees : ${files[*]}"; rm -f "$GIT_INDEX_FILE"; exit 0; fi
  echo "Branche modifiée entre-temps, nouvel essai ($i)…"; sleep $((i * 3))
done
echo "Échec de la publication des données"; exit 1
