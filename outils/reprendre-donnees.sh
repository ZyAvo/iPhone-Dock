#!/usr/bin/env bash
# Récupère les données déjà publiées (branche « donnees ») pour que les scripts repartent de là
if git fetch -q origin donnees 2>/dev/null; then
  git archive FETCH_HEAD | tar -x && echo "Données précédentes récupérées."
else
  echo "Pas encore de branche donnees : on part des fichiers du dépôt."
fi
exit 0
