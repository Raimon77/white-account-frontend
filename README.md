# White Account

White Account est une application de gestion commerciale conçue pour les petites entreprises qui vendent des produits ou des abonnements récurrents. Elle réunit les ventes, les achats, les paiements, les documents commerciaux, le stock et le suivi des renouvellements dans une application Windows simple à utiliser.

La version actuelle du client est **0.4.25**.

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

## Application Android native (premier APK de test)

La branche `android-native` ajoute un client Tauri 2 pour Android 7.0/API 24 et
versions ultérieures. Le premier APK cible les téléphones ARM64 (`arm64-v8a`).
Il utilise la même API HTTPS et les mêmes comptes que les autres clients ;
une connexion Internet reste nécessaire.

Le workflow **Android test APK** compile un APK signé avec une clé de débogage,
vérifie sa signature et conserve l'APK avec son empreinte SHA-256 dans l'artefact
`White-Account-Android-arm64-test` pendant 30 jours. Télécharger l'artefact de
l'exécution GitHub Actions, extraire le ZIP puis installer le fichier `.apk`
sur le téléphone (autoriser l'installation depuis cette source si Android le demande).
L'identifiant de test est `com.whiteaccount.mobile.debug`, distinct de la PWA.
Ce paquet sert aux essais ; il ne constitue pas une publication Google Play.
La clé de débogage du runner peut changer entre les compilations : une nouvelle
version de test peut nécessiter une désinstallation, qui efface la session locale.
Les données métier restent sur le backend.

Pour une compilation locale, installer Node 22, Rust stable, Java 21 et les
outils Android SDK. La version verrouillée du CLI utilise Android SDK 37,
Build Tools 37.0.0 et le workflow sélectionne NDK 27.2.12479018.
Définir `JAVA_HOME`, `ANDROID_HOME` et `NDK_HOME`, puis :

```bash
npm ci
rustup target add aarch64-linux-android
npm run android:init
npm run android:check
VITE_API_URL=https://white-account-backend.onrender.com/api npm run tauri -- android build --debug --apk --target aarch64 --ci
```

Le projet Gradle est généré par le CLI verrouillé dans `src-tauri/gen/android`.
L'APK est produit dans `src-tauri/gen/android/app/build/outputs/apk`.
Les mises à jour Windows et l'instance unique restent réservées au PC.
Les reçus et factures s'ouvrent avec l'application externe disponible sur Android.

Avant une distribution stable, créer et conserver une clé Android dédiée hors
Git, configurer la signature Gradle via des secrets et produire une version
`release` (APK pour distribution directe ou AAB pour Google Play). Ne jamais
utiliser la clé de test pour la distribution stable. Tester sur téléphone la
connexion, les corrections de paiements et l'ouverture des PDF avant publication.
