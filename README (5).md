# MediEquip — Application E-Commerce Full-Stack

**Étudiante :** Khadidja Ait Hocine
**Établissement :** ENSTA (École Nationale Supérieure des Technologies Avancées) — SS/IA, Semestre 1, 2026
**Module :** WAMD — TD-TP 4 : Intégration Full-Stack (React ↔ API REST Express ↔ MongoDB)
**Encadrant :** Dr. S. SENHADJI

---

## Sommaire

1. [Description de l'application](#1-description-de-lapplication)
2. [Technologies utilisées](#2-technologies-utilisées)
3. [Architecture et structure du projet](#3-architecture-et-structure-du-projet)
4. [Modèles de base de données](#4-modèles-de-base-de-données)
5. [Endpoints de l'API et conditions d'accès](#5-endpoints-de-lapi-et-conditions-daccès)
6. [Mécanisme d'authentification JWT](#6-mécanisme-dauthentification-jwt)
7. [Sécurité complémentaire](#7-sécurité-complémentaire)
8. [Installation et exécution](#8-installation-et-exécution)
9. [Configuration de MongoDB et des variables d'environnement](#9-configuration-de-mongodb-et-des-variables-denvironnement)
10. [Intégration du frontend React](#10-intégration-du-frontend-react)
11. [Tests](#11-tests)
12. [Déploiement](#12-déploiement)

---

## 1. Description de l'application

**MediEquip** est une boutique en ligne de matériel médical professionnel (tensiomètres, oxymètres, stéthoscopes, mobilier d'examen, consommables, etc.).

Ce TD-TP assemble les deux parties développées dans les TD précédents :

- le **frontend** React (catalogue, détail produit, panier, connexion, inscription, espace d'administration) ;
- le **backend** Node.js / Express / MongoDB (API REST, authentification JWT).

```
React (Vite + Redux)  ──HTTP/JSON──▶  API REST Express  ──Mongoose──▶  MongoDB
   localhost:5173                       localhost:3000
```

Fonctionnalités :

- affichage des produits lus depuis MongoDB ;
- inscription et connexion des utilisateurs, session conservée côté navigateur ;
- gestion des produits (création, modification, suppression) depuis la page `/admin`, réservée aux utilisateurs autorisés ;
- gestion des états de chargement, des erreurs réseau et des réponses d'erreur de l'API.

## 2. Technologies utilisées

| Couche | Technologie | Rôle |
|---|---|---|
| Frontend | React 18 + Vite | Interface web |
| Frontend | Redux Toolkit / React-Redux | État global (panier, produits, authentification) |
| Frontend | React Router | Navigation |
| Frontend | Fetch API | Requêtes HTTP vers l'API |
| Backend | Node.js | Environnement d'exécution |
| Backend | Express 5 | API REST |
| Backend | MongoDB + Mongoose | Base de données et modélisation |
| Backend | jsonwebtoken | Génération et vérification des JWT |
| Backend | bcryptjs | Hachage des mots de passe |
| Backend | express-rate-limit | Limitation du nombre de requêtes |
| Backend | helmet, cors | En-têtes de sécurité, autorisation du frontend |
| Backend | dotenv | Variables d'environnement |
| Tests | Postman, `test/api.test.js` | Tests manuels et automatisés de l'API |
| Versionnement | Git / GitHub | Suivi et rendu du projet |

## 3. Architecture et structure du projet

### Backend (`MediEquip-backend/`)

```
server.js              démarrage : vérifie la config, connecte MongoDB, lance le serveur
app.js                 configuration d'Express (helmet, CORS, JSON, rate limit, routes, erreurs)
seed.js                insère les produits d'exemple et crée le compte admin
config/db.js           connexion Mongoose
models/                User.js, Product.js
controllers/           authController.js, productController.js
routes/                authRoutes.js, productRoutes.js
middleware/            auth.js (protect, adminOnly), rateLimiter.js, errorHandler.js
utils/googleOAuth.js   vérification optionnelle d'un jeton Google (OAuth 2.0)
test/api.test.js       test d'intégration automatisé
.env.example           modèle du fichier de configuration
```

### Frontend (`MediEquip-frontend/`)

```
src/services/api.js    couche d'accès à l'API (fetch, gestion des erreurs)
src/store/             Redux : cartSlice, productsSlice, authSlice, store
src/pages/             Home, Shop, ProductDetails, Cart, Contact, Login, Register, Admin, NotFound
src/components/        Navbar, Footer, ProductCard, SectionHeading, AdminRoute
```

## 4. Modèles de base de données

### User

| Champ | Type | Contraintes |
|---|---|---|
| `_id` | ObjectId | Généré par MongoDB |
| `name` | String | Obligatoire, 2 à 80 caractères |
| `email` | String | Obligatoire, **unique**, converti en minuscules |
| `passwordHash` | String | Hash bcrypt, jamais renvoyé par l'API (`select: false`) |
| `role` | String | `user` (défaut) ou `admin` |
| `createdAt`, `updatedAt` | Date | Générés automatiquement |

### Product

| Champ | Type | Contraintes |
|---|---|---|
| `_id` | ObjectId | Généré par MongoDB |
| `name` | String | Obligatoire, 150 caractères max |
| `description` | String | Obligatoire, 1000 caractères max |
| `price` | Number | Obligatoire, ≥ 0 |
| `oldPrice` | Number | Optionnel, ≥ 0 (affichage des promotions) |
| `category` | String | Obligatoire : `Diagnostic`, `Mobilier`, `Instruments` ou `Consommables` |
| `imageUrl` | String | Obligatoire |
| `stock` | Number | Obligatoire, entier ≥ 0 |
| `badge` | String | Optionnel, 30 caractères max (ex. « Populaire ») |
| `createdAt`, `updatedAt` | Date | Générés automatiquement |

## 5. Endpoints de l'API et conditions d'accès

URL de base : `http://localhost:3000/api`

### Authentification

| Méthode | Endpoint | Accès | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Crée un compte (`name`, `email`, `password` ≥ 8 caractères). Le rôle est toujours `user`. |
| POST | `/auth/login` | Public (5 requêtes / 15 min / IP) | Vérifie les identifiants et renvoie un JWT. |
| GET | `/auth/me` | Token requis | Renvoie l'utilisateur identifié par le token. |

### Produits

| Méthode | Endpoint | Accès | Description |
|---|---|---|---|
| GET | `/products` | Public | Liste des produits (`count` + `products`). |
| GET | `/products/:id` | Public | Détail d'un produit. |
| POST | `/products` | Token requis + rôle `admin` | Crée un produit. |
| PUT | `/products/:id` | Token requis + rôle `admin` | Modifie un produit. |
| DELETE | `/products/:id` | Token requis + rôle `admin` | Supprime un produit. |

### Divers

| Méthode | Endpoint | Accès | Description |
|---|---|---|---|
| GET | `/health` | Public | Vérifie que l'API fonctionne. |

> **Contrôle du rôle admin.** Par défaut (`REQUIRE_ADMIN=true`), seul un administrateur peut créer, modifier ou supprimer un produit. Avec `REQUIRE_ADMIN=false`, tout utilisateur disposant d'un JWT valide le peut, ce qui correspond à l'énoncé du TP pris à la lettre.

### Codes de réponse

| Code | Signification |
|---|---|
| 200 | Succès |
| 201 | Ressource créée |
| 400 | Données invalides, JSON mal formé ou identifiant MongoDB invalide |
| 401 | Token absent, invalide ou expiré, ou identifiants de connexion incorrects |
| 403 | Token valide mais droits administrateur manquants |
| 404 | Ressource ou route introuvable |
| 409 | E-mail déjà utilisé |
| 429 | Trop de requêtes (rate limiting) |
| 500 | Erreur interne du serveur |

Format de réponse : `{ "success": true, ... }` en cas de succès, `{ "success": false, "message": "...", "errors": [...] }` en cas d'erreur.

### Exemples de corps de requête

`POST /api/auth/register`
```json
{ "name": "Test User", "email": "testuser@mediequip.com", "password": "Test123456" }
```

`POST /api/auth/login`
```json
{ "email": "testuser@mediequip.com", "password": "Test123456" }
```

`POST /api/products` (en-tête `Authorization: Bearer <token>`)
```json
{
  "name": "Produit Test MediEquip",
  "description": "Produit de test pour vérifier la création via API",
  "price": 2500,
  "oldPrice": 3000,
  "category": "Diagnostic",
  "imageUrl": "https://placehold.co/600x400",
  "stock": 10,
  "badge": "TEST"
}
```

## 6. Mécanisme d'authentification JWT

1. **Inscription** — `POST /api/auth/register` valide les champs, refuse un e-mail déjà utilisé (409), hache le mot de passe avec **bcrypt** (10 tours de salage) et enregistre l'utilisateur. Le mot de passe n'est jamais stocké en clair. Le rôle n'est pas lu dans la requête : un nouveau compte est toujours `user`, ce qui empêche de s'attribuer le rôle admin.
2. **Connexion** — `POST /api/auth/login` compare le mot de passe au hash. Si les identifiants sont corrects, le serveur renvoie un **JWT** signé avec `JWT_SECRET`, dont le payload contient l'`id` et le `role` de l'utilisateur, ainsi que les dates `iat` et `exp`. Sa durée de vie est fixée par `JWT_EXPIRES_IN` (2 h par défaut). Le message d'erreur est identique que l'e-mail n'existe pas ou que le mot de passe soit faux, pour ne pas révéler quels comptes existent.
3. **Envoi du token** — le client ajoute le token à chaque requête protégée :
   ```
   Authorization: Bearer <token>
   ```
4. **Vérification** — le middleware `protect` (`middleware/auth.js`) extrait le token, vérifie sa signature et son expiration, puis recharge l'utilisateur en base. En cas de succès, `req.user` contient `id`, `email`, `role` et `provider`. Sinon, l'API répond **401** (« Authentification requise : jeton manquant » ou « Jeton invalide ou expiré »).
5. **Autorisation** — le middleware `adminOnly` s'exécute après `protect` et répond **403** si le rôle n'est pas `admin` (désactivable avec `REQUIRE_ADMIN=false`).
6. **Côté React** — après connexion, le token et l'utilisateur sont conservés dans le store Redux et dans `localStorage` (clé `mediequip_auth`) pour survivre au rechargement de la page. Les thunks de gestion des produits ajoutent automatiquement l'en-tête `Authorization`. Si l'API répond 401 pendant une action d'administration, l'utilisateur est déconnecté et invité à se reconnecter. La page `/admin` est protégée par le composant `AdminRoute`.
7. **OAuth 2.0 Google (optionnel)** — si `GOOGLE_CLIENT_ID` est renseigné, `protect` accepte aussi un access token Google, vérifié auprès de Google (`tokeninfo`). Le token doit avoir été émis pour l'application et contenir un e-mail vérifié. Si l'e-mail correspond à un compte existant, son rôle est repris. Laisser la variable vide désactive cette option.

## 7. Sécurité complémentaire

- **Rate limiting** : 100 requêtes / 15 min / IP sur toute l'API, et 5 requêtes / 15 min / IP sur le login (protection contre le brute-force). Dépassement : **429**.
- **Helmet** : en-têtes HTTP de sécurité.
- **CORS** : seules les origines listées dans `CLIENT_URL` sont autorisées.
- **Validation** : contrôles à l'inscription, validation Mongoose sur les produits (y compris lors de la mise à jour) et rejet des identifiants MongoDB invalides.
- **Liste blanche de champs** : seuls `name`, `description`, `price`, `oldPrice`, `category`, `imageUrl`, `stock` et `badge` sont acceptés pour un produit.
- **Secrets** : `.env` est exclu de Git, et le serveur refuse de démarrer si `JWT_SECRET` est absent ou resté à sa valeur d'exemple.

## 8. Installation et exécution

### Prérequis

- Node.js 20 ou supérieur et npm
- MongoDB (installation locale avec Compass) **ou** un cluster MongoDB Atlas
- Git

### Backend

```bash
git clone <URL_DU_DEPOT_BACKEND>
cd MediEquip-backend
npm install
cp .env.example .env        # puis renseigner les valeurs (voir section 9)
npm run seed                # insère les produits d'exemple et crée le compte admin
npm run dev                 # ou : npm start
```

L'API est disponible sur `http://localhost:3000`. Test rapide : `GET http://localhost:3000/api/health`.

### Frontend

```bash
git clone <URL_DU_DEPOT_FRONTEND>
cd MediEquip-frontend
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:3000/api
npm run dev                 # http://localhost:5173
```

Le backend doit être démarré pour que les produits s'affichent.

### Scripts du backend

| Commande | Action |
|---|---|
| `npm start` | Lance le serveur |
| `npm run dev` | Lance le serveur avec rechargement automatique |
| `npm run seed` | Réinitialise les produits et crée le compte admin |
| `npm test` | Lance les tests d'intégration automatisés |

> `npm run seed` **supprime tous les produits existants** avant d'insérer les produits d'exemple.

## 9. Configuration de MongoDB et des variables d'environnement

### MongoDB

- **Local** : démarrer le service MongoDB, puis utiliser `MONGODB_URI=mongodb://127.0.0.1:27017/mediequip`. La base `mediequip` est créée automatiquement au premier enregistrement et visible dans MongoDB Compass.
- **Atlas** : créer un cluster gratuit, créer un utilisateur de base de données, autoriser l'adresse IP (Network Access), puis copier la chaîne « Connect → Drivers » dans `MONGODB_URI` en ajoutant `/mediequip` avant le `?`.

### Fichier `.env` du backend

| Variable | Rôle | Exemple / défaut |
|---|---|---|
| `PORT` | Port du serveur | `3000` |
| `MONGODB_URI` | Chaîne de connexion MongoDB | `mongodb://127.0.0.1:27017/mediequip` |
| `JWT_SECRET` | Secret de signature des JWT (obligatoire) | longue chaîne aléatoire |
| `JWT_EXPIRES_IN` | Durée de validité du token | `2h` |
| `CLIENT_URL` | Origine(s) du frontend autorisée(s) par CORS, séparées par des virgules | `http://localhost:5173` |
| `REQUIRE_ADMIN` | `true` : seul un admin gère les produits. `false` : tout utilisateur connecté | `true` |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Compte admin créé par `npm run seed` | `admin@mediequip.dz` |
| `GOOGLE_CLIENT_ID` | Active OAuth 2.0 Google (optionnel, vide = désactivé) | vide |
| `RATE_LIMIT_WINDOW_MIN` | Fenêtre du rate limiting, en minutes | `15` |
| `RATE_LIMIT_MAX` | Requêtes max par fenêtre sur toute l'API | `100` |
| `RATE_LIMIT_LOGIN_MAX` | Tentatives de login max par fenêtre | `5` |

Générer un `JWT_SECRET` :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Fichier `.env` du frontend

```env
VITE_API_URL=http://localhost:3000/api
```

> Ne jamais publier le fichier `.env` sur GitHub : il est déjà listé dans `.gitignore`.

## 10. Intégration du frontend React

La communication avec l'API est centralisée dans `src/services/api.js`.

| Tâche du TP | Réalisation |
|---|---|
| Connexion frontend / backend | `fetch` configuré avec `VITE_API_URL` ; CORS autorisé côté API |
| Affichage des produits | `fetchProducts` (thunk) appelé au démarrage dans `App.jsx` et stocké dans Redux |
| Inscription et connexion | Thunks `register` (inscription puis connexion automatique) et `login` dans `authSlice` |
| Gestion du JWT | Token conservé dans Redux et `localStorage`, ajouté en `Bearer` aux requêtes protégées |
| Opérations CRUD | Page `/admin` : formulaire de création/modification et suppression, via `createProduct`, `updateProduct`, `deleteProduct` |
| Chargement et erreurs | États `idle / loading / succeeded / failed` ; messages « Chargement… » et « Chargement impossible » ; erreurs API affichées dans les formulaires ; message dédié si le serveur est injoignable ; déconnexion automatique si le token expire |
| Protection des pages | `AdminRoute` redirige vers `/connexion` si non connecté, et affiche « Accès refusé » si non admin |

Le backend renvoie `_id` et `imageUrl`. La fonction `normalizeProduct` les convertit en `id` et `image`, noms utilisés par les composants React.

## 11. Tests

- **Postman** : les tests manuels de l'API (liste, détail, inscription, connexion, route protégée avec et sans token, création, modification, suppression, produit supprimé) sont décrits dans le document **[POSTMAN_TESTS.md](POSTMAN_TESTS.md)**, avec les captures d'écran dans `postman-screenshots/`.
- **Tests automatisés** : `npm test` exécute 31 vérifications d'intégration sur une base séparée (`<nom>_apitest`) : inscription, doublon, connexion, JWT, CRUD, codes 400 / 401 / 403 / 404 / 409, CORS, OAuth 2.0 (réponse Google simulée) et rate limiting.
- **Test full-stack** : lancer le backend et le frontend, puis vérifier dans le navigateur l'affichage des produits, l'inscription, la connexion, puis les opérations de création, modification et suppression depuis `/admin` avec le compte administrateur.

## 12. Déploiement

L'application est déployée sur **Render** :

| Partie | URL |
|---|---|
| Frontend (React) | https://medica-front.onrender.com |
| Backend (API REST) | https://medica-back-ys7e.onrender.com |
| Test de santé de l'API | https://medica-back-ys7e.onrender.com/api/health |
| Liste des produits (exemple) | https://medica-back-ys7e.onrender.com/api/products |

- **Dépôt GitHub :** [URL_DU_DEPOT]

Configuration de production :

- Backend : `CLIENT_URL=https://medica-front.onrender.com` (autorise le frontend via CORS), ainsi que `MONGODB_URI` (Atlas), `JWT_SECRET`, `JWT_EXPIRES_IN` et `REQUIRE_ADMIN`.
- Frontend : `VITE_API_URL=https://medica-back-ys7e.onrender.com/api`.
- Sur l'offre gratuite de Render, le serveur se met en veille après une période d'inactivité : la première requête peut prendre une minute environ.
