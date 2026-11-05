#!/usr/bin/env bash
# mon-ecran-version: 650b7efb
# Récupère les données déjà publiées pour que les scripts repartent de là.
# Usage : bash outils/reprendre-donnees.sh [branche…]   (par défaut « donnees » ; la Publication ajoute « donnees-tv », v51)
[ $# -eq 0 ] && set -- donnees
for b in "$@"; do
  if git fetch -q origin "$b" 2>/dev/null; then
    git archive FETCH_HEAD | tar -x && echo "Données précédentes récupérées ($b)."
  else
    echo "Pas encore de branche $b : on part des fichiers du dépôt."
  fi
done
exit 0
