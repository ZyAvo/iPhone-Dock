#!/usr/bin/env bash
# mon-ecran-version: 42198f72
# Publie des fichiers de données sur une branche de données qui ne garde qu'UN seul enregistrement
# (aucun historique : le dépôt ne grossit plus). Les autres fichiers déjà présents sur la branche sont conservés.
# Usage : bash outils/publier-donnees.sh [--branche NOM] [--retirer CHEMIN]… [CHEMIN…]
#   --branche NOM     branche visée (par défaut « donnees » ; v51 : le catalogue TV va sur « donnees-tv »)
#   --retirer CHEMIN  enlève ce chemin de la branche (v51 : donnees/tv quitte « donnees »)
# Rien de changé sur la branche → rien n'est envoyé. Écrit change=0|1 pour la tâche (GITHUB_OUTPUT).
set -u
branche=donnees; files=(); retirer=()
while [ $# -gt 0 ]; do
  case "$1" in
    --branche) branche="$2"; shift 2 ;;
    --retirer) retirer+=("$2"); shift 2 ;;
    *) [ -e "$1" ] && files+=("$1"); shift ;;
  esac
done
sortie(){ [ -n "${GITHUB_OUTPUT:-}" ] && echo "change=$1" >> "$GITHUB_OUTPUT"; }
[ ${#files[@]} -eq 0 ] && [ ${#retirer[@]} -eq 0 ] && { echo "Rien à publier."; sortie 0; exit 0; }
git config user.name "mon-ecran"
git config user.email "mon-ecran@users.noreply.github.com"
export GIT_INDEX_FILE="$(mktemp -u)"
for i in 1 2 3 4 5; do
  base=""
  if git fetch -q origin "$branche" 2>/dev/null; then
    base=$(git rev-parse FETCH_HEAD); git read-tree "$base"; lease="--force-with-lease=$branche:$base"
  else
    git read-tree --empty; lease="--force-with-lease=$branche:"
  fi
  for p in "${retirer[@]}" "${files[@]}"; do git rm -r -q -f --cached --ignore-unmatch "$p"; done
  [ ${#files[@]} -gt 0 ] && git add -f "${files[@]}"
  tree=$(git write-tree)
  if [ -n "$base" ] && [ "$tree" = "$(git rev-parse "$base^{tree}")" ]; then
    echo "Rien de changé sur la branche $branche."; rm -f "$GIT_INDEX_FILE"; sortie 0; exit 0
  fi
  commit=$(echo "Données $(date -u +%Y-%m-%dT%H:%MZ)" | git commit-tree "$tree")
  if git push -q $lease origin "$commit:refs/heads/$branche"; then
    echo "Publié sur la branche $branche : ${files[*]:-}${retirer[*]:+ (retiré : ${retirer[*]})}"; rm -f "$GIT_INDEX_FILE"; sortie 1; exit 0
  fi
  echo "Branche $branche modifiée entre-temps, nouvel essai ($i)…"; sleep $((i * 3))
done
echo "Échec de la publication des données"; exit 1
