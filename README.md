# 🧳 MesValises

Application web (installable sur iPhone) pour préparer ses valises en famille :
chaque membre du foyer a sa propre liste de vêtements/matériel, les articles se
répartissent ensuite dans les valises créées pour le voyage, et le poids de
chaque valise est estimé automatiquement à partir de l'âge/la taille de la
personne concernée.

## Fonctionnalités

- **Foyer partagé** : un code à 6 caractères permet à toute la famille de
  rejoindre le même espace, sans mot de passe.
- **Membres du foyer** : prénom, date de naissance, taille — réutilisés pour
  tous les voyages.
- **Voyages** : chaque voyage a ses propres valises et listes.
- **Listes par personne** : chaque membre coche ses articles (vêtements,
  chaussures, hygiène, électronique, documents, santé, accessoires…).
- **Valises** : création de valises/sacs, attribution à une personne, poids
  maximum, répartition des articles avec barre de progression.
- **Estimation du poids** : une bibliothèque d'articles courants avec poids de
  référence adulte, mise à l'échelle selon la taille/l'âge de la personne qui
  porte l'article (les vêtements d'un enfant pèsent moins que ceux d'un
  adulte). Le poids peut aussi être saisi manuellement.
- **PWA** : installable sur l'écran d'accueil de l'iPhone, fonctionne comme une
  vraie app.

## Stack technique

- [Vite](https://vite.dev) + React + TypeScript
- [Supabase](https://supabase.com) (Postgres + Auth anonyme + Realtime) comme
  backend partagé, gratuit pour un usage familial
- `vite-plugin-pwa` pour l'installation sur iPhone

## 1. Créer le projet Supabase (gratuit)

1. Créez un compte sur [supabase.com](https://supabase.com) et un nouveau
   projet.
2. Dans **Authentication → Sign In / Providers → Anonymous Sign-Ins**,
   activez les connexions anonymes (c'est ce qui permet à chaque téléphone de
   se connecter sans créer de compte email/mot de passe).
3. Ouvrez **SQL Editor → New query**, collez le contenu du fichier
   [`supabase/schema.sql`](./supabase/schema.sql) et lancez-le. Cela crée les
   tables, les fonctions `create_household`/`join_household` et les règles de
   sécurité (RLS) qui isolent les données de chaque foyer.
4. Dans **Project Settings → API**, récupérez :
   - `Project URL`
   - `anon public` key

## 2. Configurer l'application

```bash
npm install
cp .env.example .env.local
```

Remplissez `.env.local` :

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

## 3. Lancer en développement

```bash
npm run dev
```

## 4. Déployer

L'app est un site statique (Vite build) : elle se déploie telle quelle sur
Vercel, Netlify, Cloudflare Pages, GitHub Pages, etc. Pensez à configurer les
mêmes variables d'environnement (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`) sur la plateforme choisie, puis :

```bash
npm run build
```

Le résultat est dans `dist/`.

## 5. Installer sur iPhone

1. Ouvrez l'URL de l'app déployée dans **Safari** sur l'iPhone (l'installation
   PWA ne fonctionne qu'avec Safari, pas Chrome).
2. Appuyez sur le bouton **Partager** (icône carrée avec une flèche).
3. Choisissez **Sur l'écran d'accueil**.
4. L'app s'ouvre ensuite en plein écran, comme une app native.

Chaque membre de la famille répète cette installation sur son propre
téléphone, puis rejoint le foyer avec le code partagé par celui qui l'a créé
(visible en tapant sur le badge en haut de l'écran, qui copie aussi le code).

## Comment fonctionne le partage familial

- La première personne crée le foyer (choisit un nom, obtient un code à 6
  caractères).
- Elle partage ce code (message, appel…) aux autres membres.
- Chacun ouvre l'app, choisit « Rejoindre un foyer existant », saisit le code
  et son prénom.
- Toutes les données (personnes, voyages, valises, articles) sont alors
  visibles et modifiables par tout le foyer, et se synchronisent via
  Supabase.

## Estimation du poids

La logique se trouve dans [`src/lib/weightEstimate.ts`](./src/lib/weightEstimate.ts) :

- Un catalogue d'articles courants (T-shirt, pantalon, chaussures, trousse de
  toilette, chargeur…) avec un poids de référence pour un adulte d'environ
  170 cm.
- Un facteur d'échelle calculé à partir de la taille (ou, à défaut, de l'âge)
  de la personne, appliqué aux catégories « vêtements » et « chaussures »
  (les autres catégories, comme l'électronique ou les documents, ne
  dépendent pas de la taille de la personne).
- Un poids unitaire saisi manuellement prime toujours sur l'estimation
  automatique.

Ces chiffres restent des ordres de grandeur pour aider à répartir les valises
et anticiper un dépassement de poids — pas une pesée exacte.

## Structure du projet

```
supabase/schema.sql       Schéma Postgres + RLS à exécuter sur Supabase
src/lib/supabase.ts       Client Supabase
src/lib/weightEstimate.ts Catalogue d'articles + calcul du poids estimé
src/context/              Contexte foyer (auth anonyme, création/adhésion)
src/pages/                Onboarding, Voyages, Famille, Détail d'un voyage
src/components/           Layout (en-tête + navigation basse)
```
