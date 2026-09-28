# White Account

White Account est une application de gestion commerciale conçue pour les petites entreprises qui vendent des produits ou des abonnements récurrents. Elle réunit les ventes, les achats, les paiements, les documents commerciaux, le stock et le suivi des renouvellements dans une application Windows simple à utiliser.

La version actuelle du client est **0.4.24**.

## Fonctionnalités

- Tableau de bord mensuel avec chiffre d’affaires, encaissements, dépenses, avoirs et activité globale.
- Gestion des clients, fournisseurs et produits.
- Ventes et factures avec paiements partiels, soldes et statuts.
- Achats, mouvements et suivi du stock.
- Devis et bons de commande convertibles en ventes.
- Reçus de paiement et avoirs.
- Dépenses et clôtures mensuelles.
- Filtres mensuels sur les principales pages transactionnelles.
- Alertes de renouvellement à J-7/J-4 puis J-3/jour J.
- Consultation séparée des échéances à venir, expirées et de tout l’historique.
- Génération de documents PDF et envoi des factures/reçus par e-mail.
- Mise à jour automatique signée de l’application Windows.
- Interface Aurora responsive avec tableaux défilables horizontalement.

## Architecture

```text
Application Windows (React + Tauri)
              │
              ▼
      API REST White Account
              │
      ┌───────┴────────┐
      ▼                ▼
 PostgreSQL/Neon   Brevo/Cloudinary
```

Le frontend communique uniquement avec l’API configurée dans `VITE_API_URL`. Le backend, la base de données et les services externes vivent dans des environnements séparés.

## Technologies

- React 19 et TypeScript
- Vite 8
- Tailwind CSS 4
- Tauri 2 et Rust
- Axios et React Router
- Lucide Icons

## Prérequis de développement

- Node.js 20 ou plus récent
- npm
- Rust stable et Cargo
- Les prérequis Windows de Tauri 2 (WebView2 et outils de compilation Microsoft)
- Une instance du backend White Account

## Installation locale

```powershell
git clone https://github.com/Raimon77/white-account-frontend.git
cd white-account-frontend
npm ci
```

Créer un fichier `.env.local` :

```dotenv
VITE_API_URL=http://localhost:5000/api
```

Lancer l’interface web de développement :

```powershell
npm run dev
```

Lancer l’application Tauri :

```powershell
npm run tauri dev
```

## Commandes utiles

| Commande | Description |
| --- | --- |
| `npm run dev` | Lance Vite en développement |
| `npm run build` | Vérifie TypeScript et construit le frontend |
| `npm run lint` | Exécute ESLint |
| `npm run tauri build` | Produit les installateurs Windows |
| `npm run release:check` | Vérifie l’alignement des versions |
| `npm run updater:check` | Valide la configuration publique de l’updater |
| `npm run security:check` | Contrôle la configuration de sécurité Tauri |

## Structure principale

```text
src/
├── api/             Client HTTP
├── assets/          Images et ressources visuelles
├── components/      Composants UI et mise en page
├── lib/             Utilitaires partagés
├── pages/           Modules fonctionnels
└── routes/          Protection et navigation

src-tauri/
├── capabilities/    Permissions Tauri
├── icons/           Icônes de l’application
├── src/             Point d’entrée Rust
└── tauri.conf.json  Bundle, sécurité et updater
```

## Publication d’une version

Une publication nécessite que la même version soit renseignée dans :

- `package.json`
- `package-lock.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`

Avant de créer un tag :

```powershell
npm run build
npm run release:check
npm run updater:check
npm run security:check
cd src-tauri
cargo check
```

Le workflow GitHub Actions se déclenche avec un tag `v*`, construit les installateurs Windows, signe les artefacts de mise à jour et publie le manifeste public utilisé par l’application.

## Sécurité

- Ne jamais committer de mot de passe, clé API, URL PostgreSQL privée ou clé de signature.
- Les secrets de production doivent rester dans Render, GitHub Actions ou le gestionnaire du service concerné.
- La signature Tauri protège l’intégrité des mises à jour. Elle ne remplace pas une signature Windows Authenticode ; un antivirus peut donc analyser plus sévèrement une nouvelle version encore peu téléchargée.
- Les fichiers `.env.local`, clés privées et artefacts temporaires doivent rester ignorés par Git.

## Backend

Le serveur API est maintenu dans le dépôt [`white-account-backend`](https://github.com/Raimon77/white-account-backend).

## Statut

White Account est en développement actif. Toute modification des ventes, achats ou paiements doit préserver la cohérence du stock, des soldes, du tableau de bord et des clôtures mensuelles.
