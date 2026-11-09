# twilight

Page d'accueil sans autre but que l'ambiance : décor rouge sang animé, salutations qui défilent avec un kaomoji et musique en fond.

## Ce que fait le site

- **Entrée** : le site tente de lancer la musique dès l'ouverture. Si le navigateur bloque le son, un écran « click to enter (ﾉ◕ヮ◕)ﾉ » s'affiche ; le clic lance la musique et l'animation d'entrée (décor qui sort du noir, puis le message, puis le lecteur).
- **Salutations** : 16 paires texte + kaomoji qui alternent toutes les 3 s (`GREETINGS` et `GREETING_INTERVAL` dans `src/main.jsx`).
- **Décor** : lumière de fenêtre et ombres de feuillage animées sur canvas (`src/components/DappledLight.jsx`).
- **Lecteur** : en pied de page, sans cadre, fondu dans le décor. Pochette, titre et artiste lus dans les métadonnées du fichier audio (bandes noires des pochettes rognées automatiquement), barre de progression, temps, coupure du son et bouton lecture en « brume de sang » animée. Le spectre audio rouge réagit à la musique et s'efface en pause.
- **Accessibilité** : les animations s'arrêtent si « réduire les animations » est activé.

## Musique

Déposer un fichier dans `public/music/` (MP3, WAV, OGG, M4A, AAC, FLAC, WEBM). Le premier par ordre alphabétique est lu en boucle à 50 % du volume. Après un changement, reconstruire et redéployer.

## Commandes

```
npm install        # dépendances
npm run dev        # développement local
npm run build      # build dans dist/
npx vercel --prod  # mise en ligne (ou double-clic sur deploy-vercel.bat)
```

`.vercelignore` exclut `node_modules`, `dist`, `backup` et les fichiers `.env*` (dont la clé React Bits).

## Structure

```
src/main.jsx                  page, écran d'entrée, lecteur
src/styles.css                styles et animations
src/audioMetadata.js          lecture des tags et de la pochette
src/components/AudioSpectrum  spectre audio (Web Audio)
src/components/DappledLight   décor animé
src/components/GradientText   texte en dégradé (React Bits)
backup/player-coin/           ancienne version du lecteur (dans le coin)
```

## Crédits et licences

- **Gradient Text** : [React Bits](https://github.com/DavidHDev/react-bits), licence dans `src/components/REACT-BITS-LICENSE.md`.
- **DappledLight** : implémentation canvas originale inspirée de l'aperçu public de Dappled Light (React Bits Pro), sans le code Pro.
- **Lokeya** (ReyreyBlue) : [dafont](https://www.dafont.com/fr/lokeya.font), usage personnel uniquement ; licence commerciale sur [Creative Fabrica](https://www.creativefabrica.com/product/lokeya/ref/397981/).
