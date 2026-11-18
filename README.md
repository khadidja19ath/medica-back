# MediEquip — Backend (API REST)

**Étudiante :** Khadidja Ait Hocine — ENSTA, module WAMD, TD-TP 3

## Description

API REST de la boutique de matériel médical **MediEquip**. Elle gère les produits, l'inscription et la connexion des utilisateurs (JWT), protège les routes d'administration (JWT + OAuth2 Google optionnel) et limite le nombre de requêtes (rate limiting). Le frontend React/Redux la consomme via HTTP/JSON.

## Technologies

Node.js, Express 5, MongoDB + Mongoose, JSON Web Token (jsonwebtoken), bcryptjs, express-rate-limit, cors, helmet, dotenv.

## Structure

```
server.js            démarrage (connexion MongoDB + écoute du port)
app.js               configuration d'Express (CORS, routes, erreurs)
seed.js              produits d'exemple + compte admin
config/db.js         connexion Mongoose
models/              User.js, Product.js
controllers/         authController.js, productController.js
routes/              authRoutes.js, productRoutes.js
middleware/          auth.js (JWT/OAuth2), rateLimiter.js, errorHandler.js
utils/googleOAuth.js vérification d'un jeton Google
test/api.test.js     test d'intégration automatisé
```

## Modèles de données

**Product** : `name`, `description`, `price`, `category` (Diagnostic | Mobilier | Instruments | Consommables), `imageUrl`, `stock` (+ `oldPrice`, `badge` utilisés par le design du frontend).

**User** : `name`, `email` (unique), `passwordHash` (bcrypt, jamais renvoyé par l'API), `role` (`user` par défaut, `admin`).

## Endpoints

| Méthode | Route | Accès |
|---|---|---|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public (5 requêtes / 15 min / IP) |
| GET | `/api/auth/me` | Token requis |
| GET | `/api/products` | Public |
| GET | `/api/products/:id` | Public |
| POST | `/api/products` | Token requis (+ admin) |
| PUT | `/api/products/:id` | Token requis (+ admin) |
| DELETE | `/api/products/:id` | Token requis (+ admin) |
| GET | `/api/health` | Public |

Codes : 200, 201, 400 (données ou ID invalides), 401 (token absent/invalide), 403 (pas admin), 404, 409 (e-mail déjà utilisé), 429 (trop de requêtes), 500.
Format d'erreur unique : `{ "success": false, "message": "...", "errors": [...] }`.

## Authentification JWT

1. `POST /api/auth/login` vérifie l'e-mail et le mot de passe (bcrypt) puis renvoie un JWT signé avec `JWT_SECRET` (durée `JWT_EXPIRES_IN`).
2. Le client envoie `Authorization: Bearer <JWT_TOKEN>` sur les routes protégées.
3. Le middleware `protect` vérifie le jeton : valide → la requête continue ; sinon **401**.
4. Le middleware `adminOnly` exige le rôle `admin` (**403** sinon). Pour appliquer l'énoncé à la lettre (tout utilisateur connecté), mettre `REQUIRE_ADMIN=false`.
5. Un nouveau compte est toujours `user` ; le compte admin est créé par `npm run seed`.

## OAuth 2.0 (Google, optionnel)

Renseigner `GOOGLE_CLIENT_ID` dans `.env`. Le middleware `protect` accepte alors aussi un access token Google : l'API le vérifie auprès de Google (`tokeninfo`), contrôle qu'il a été émis pour votre client ID et qu'un e-mail vérifié est présent. Si l'e-mail correspond à un compte existant, son rôle est repris.
Dans Postman / Thunder Client : Authorization → OAuth 2.0 → Authorization Code (PKCE), scopes `openid email profile`, URL d'autorisation `https://accounts.google.com/o/oauth2/v2/auth`, URL du token `https://oauth2.googleapis.com/token`, redirect URI identique à celle enregistrée dans Google Cloud Console. Puis envoyer le token sur `GET /api/auth/me`.

## Rate limiting

Général : 100 requêtes / 15 min sur `/api`. Login : 5 requêtes / 15 min / IP. Dépassement → **429**. Valeurs modifiables dans `.env`.

## Installation

```bash
npm install
cp .env.example .env     # puis remplir les valeurs
npm run seed             # produits d'exemple + compte admin
npm run dev              # ou npm start
```

## Configuration MongoDB et .env

- **MongoDB local** (visible dans Compass) : `MONGODB_URI=mongodb://127.0.0.1:27017/mediequip`
- **Atlas** : copier la chaîne « Connect → Drivers » et y ajouter `/mediequip` avant le `?`.
- `JWT_SECRET` : longue chaîne aléatoire, par ex. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` : identifiants du compte admin créé par le seed.
- Ne jamais committer `.env` (déjà dans `.gitignore`).

## Tests

`npm test` exécute 31 vérifications automatiques sur une base séparée (`<nom>_apitest`) : inscription, doublon, login, JWT, CRUD, 401/403/404/409/400, CORS, OAuth2 (réponse Google simulée) et rate limiting.
