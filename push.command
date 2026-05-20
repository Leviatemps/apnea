#!/bin/bash

# Aller dans le dossier du projet (même si le script est lancé depuis ailleurs)
cd "$(dirname "$0")"

echo "📦 Stamina — Push vers GitHub"
echo "================================"

# Afficher les fichiers modifiés
echo ""
echo "Fichiers modifiés :"
git status --short

echo ""

# Demander un message de commit
read -p "Message de commit (Enter pour 'Mise à jour'): " MSG
MSG=${MSG:-"Mise à jour"}

# Ajouter tous les fichiers, committer et pousser
git add -A
git commit -m "$MSG"
git push origin main

echo ""
echo "✅ Push terminé vers https://github.com/Leviatemps/apnea"
echo ""
read -p "Appuie sur Entrée pour fermer..."
