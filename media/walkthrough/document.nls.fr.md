# Un document, sa propre conception

Placez un bloc tout en haut d'un fichier Markdown pour ne changer que ce document :

```yaml
---
title: Rapport trimestriel
author: Marie Dupont
pdf:
  orientation: landscape
  footer:
    center_text: "Brouillon, page {page}"
---
```

Pendant que vous tapez dans le bloc `pdf:`, VS Code suggère les clés et leurs valeurs. L'aperçu montre le résultat au fur et à mesure.

`author` est ce qu'imprime `{author}`. Définissez une valeur par défaut une fois dans votre fichier de paramètres (`"author": "Marie Dupont"`) ; le `author:` propre à un document la remplace, et `author: none` n'imprime aucun auteur.

Toutes les clés du bloc `pdf:`, avec des exemples : [One document, its own design](https://markdown-pdf.matinfo.tech/advanced/per-document) (en anglais).
