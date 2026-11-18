# MediEquip — Tests de l'API avec Postman

**Étudiante :** Khadidja Ait Hocine
**Module :** WAMD — TD-TP 4 (Intégration Full-Stack) — ENSTA, SS/IA, 2026
**Collection Postman :** MediEquip API Tests
**URL de base :** `http://localhost:3000/api`

Ce document accompagne le `README.md` et présente les tests de l'API réalisés avec Postman, ainsi que les captures d'écran correspondantes (dossier `postman-screenshots/`).

---

## 1. Préparation

### Prérequis

1. MongoDB est démarré et la base est remplie (`npm run seed`).
2. Le serveur est lancé : `npm run dev` (`http://localhost:3000`).
3. Test de santé : `GET /api/health` doit renvoyer `{ "success": true, "message": "API MediEquip opérationnelle" }`.

### Utilisation du token dans Postman

1. Envoyer `POST /api/auth/login` et copier la valeur du champ `token`.
2. Dans la requête protégée, ouvrir l'onglet **Authorization**, choisir **Bearer Token** et coller le token.
3. Postman ajoute alors l'en-tête `Authorization: Bearer <token>`.

### Comptes utilisés

| Compte | Rôle | Usage |
|---|---|---|
| `testuser@mediequip.com` | `user` | Inscription, connexion et route `/auth/me` |
| Compte admin créé par `npm run seed` | `admin` | Création, modification et suppression de produits (`REQUIRE_ADMIN=true`) |

---

## 2. Résumé des tests

| # | Test | Méthode et URL | Auth | Statut obtenu | Capture |
|---|---|---|---|---|---|
| 1 | Liste des produits | `GET /api/products` | Aucune | **200 OK** | `01-get-products.png` |
| 2 | Détail d'un produit | `GET /api/products/6af1cef0fd383bb26a9553f5` | Aucune | **200 OK** | `02-get-product-by-id.png` |
| 3 | Inscription | `POST /api/auth/register` | Aucune | **201 Created** | `03-register.png` |
| 4 | Connexion | `POST /api/auth/login` | Aucune | **200 OK** | `04-login.png` |
| 5 | Utilisateur connecté, avec token | `GET /api/auth/me` | Bearer Token | **200 OK** | `05-me-with-token.png` |
| 6 | Utilisateur connecté, sans token | `GET /api/auth/me` | Aucune | **401 Unauthorized** | `06-me-without-token.png` |
| 7 | Création d'un produit | `POST /api/products` | Bearer Token | **201 Created** | `07-create-product.png` |
| 8 | Modification d'un produit | `PUT /api/products/6afd76d620feacb83fffc834` | Bearer Token | **200 OK** | `08-update-product.png` |
| 9 | Suppression d'un produit | `DELETE /api/products/6afd76d620feacb83fffc834` | Bearer Token | **200 OK** | `09-delete-product.png` |
| 10 | Lecture du produit supprimé | `GET /api/products/6afd76d620feacb83fffc834` | Aucune | **404 Not Found** | `10-get-deleted-product.png` |

---

## 3. Détail des tests

### Test 1 — Lister les produits

- **Requête :** `GET http://localhost:3000/api/products`
- **Accès :** public
- **Résultat attendu :** 200 OK avec `success: true`, `count: 9` et le tableau `products` renvoyé par MongoDB.
- **Résultat observé :** 200 OK en 604 ms, 9 produits renvoyés. Le premier est « Tensiomètre électronique professionnel ».
- **Capture :** `01-get-products.png`

### Test 2 — Détail d'un produit

- **Requête :** `GET http://localhost:3000/api/products/6af1cef0fd383bb26a9553f5`
- **Accès :** public
- **Résultat attendu :** 200 OK avec l'objet `product` complet.
- **Résultat observé :** 200 OK. Le produit contient `name`, `description`, `price: 18500`, `oldPrice: 22000`, `category: "Diagnostic"`, `imageUrl`, `stock: 25`, `badge: "Populaire"`, `createdAt` et `updatedAt`.
- **Capture :** `02-get-product-by-id.png`

### Test 3 — Inscription

- **Requête :** `POST http://localhost:3000/api/auth/register`
- **En-tête :** `Content-Type: application/json`
- **Corps (raw / JSON) :**
  ```json
  {
    "name": "Test User",
    "email": "testuser@mediequip.com",
    "password": "Test123456"
  }
  ```
- **Résultat attendu :** 201 Created, message « Compte créé avec succès », utilisateur avec le rôle `user`, **sans mot de passe** dans la réponse.
- **Résultat observé :** 201 Created. La réponse contient `name`, `email`, `role: "user"`, `_id`, `createdAt` et `updatedAt`. Aucun champ lié au mot de passe n'est renvoyé.
- **Capture :** `03-register.png`

### Test 4 — Connexion et obtention du JWT

- **Requête :** `POST http://localhost:3000/api/auth/login`
- **Corps (raw / JSON) :**
  ```json
  {
    "email": "testuser@mediequip.com",
    "password": "Test123456"
  }
  ```
- **Résultat attendu :** 200 OK avec un `token` JWT et l'objet `user`.
- **Résultat observé :** 200 OK. Le token est composé de trois parties séparées par des points (`en-tête.payload.signature`). Le payload contient l'`id` de l'utilisateur, son `role`, `iat` et `exp`.
- **Capture :** `04-login.png`

### Test 5 — Route protégée avec un token valide

- **Requête :** `GET http://localhost:3000/api/auth/me`
- **Authorization :** Bearer Token (token obtenu au test 4)
- **Résultat attendu :** 200 OK avec l'utilisateur identifié par le token.
- **Résultat observé :** 200 OK. La réponse contient `id`, `email`, `role: "user"` et `provider: "jwt"`, ce qui confirme que le token a été vérifié par le middleware `protect`.
- **Capture :** `05-me-with-token.png`

### Test 6 — Route protégée sans token

- **Requête :** `GET http://localhost:3000/api/auth/me`
- **Authorization :** No Auth
- **Résultat attendu :** 401 Unauthorized.
- **Résultat observé :** 401 Unauthorized avec :
  ```json
  { "success": false, "message": "Authentification requise : jeton manquant" }
  ```
- **Conclusion :** la route est bien protégée, et l'accès sans token est refusé.
- **Capture :** `06-me-without-token.png`

### Test 7 — Créer un produit

- **Requête :** `POST http://localhost:3000/api/products`
- **Authorization :** Bearer Token
- **Corps (raw / JSON) :**
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
- **Résultat attendu :** 201 Created, message « Produit créé » et le produit enregistré avec son `_id`.
- **Résultat observé :** 201 Created, message « Produit créé ». Le produit renvoyé reprend les valeurs envoyées.
- **Capture :** `07-create-product.png`

### Test 8 — Modifier un produit

- **Requête :** `PUT http://localhost:3000/api/products/6afd76d620feacb83fffc834`
- **Authorization :** Bearer Token
- **Corps (raw / JSON) :**
  ```json
  {
    "name": "Produit Test MediEquip - Updated",
    "description": "Produit de test modifié avec succès via API",
    "price": 2200,
    "oldPrice": 2800,
    "category": "Diagnostic",
    "imageUrl": "https://placehold.co/600x400",
    "stock": 15,
    "badge": "UPDATED"
  }
  ```
- **Résultat attendu :** 200 OK et le produit mis à jour.
- **Résultat observé :** 200 OK. `name`, `price: 2200`, `oldPrice: 2800`, `stock: 15` et `badge: "UPDATED"` sont modifiés. `updatedAt` (10:00:41) est postérieur à `createdAt` (09:58:46), ce qui prouve que la modification a bien été enregistrée.
- **Capture :** `08-update-product.png`

### Test 9 — Supprimer un produit

- **Requête :** `DELETE http://localhost:3000/api/products/6afd76d620feacb83fffc834`
- **Authorization :** Bearer Token
- **Résultat attendu :** 200 OK, message « Produit supprimé ».
- **Résultat observé :** 200 OK avec :
  ```json
  { "success": true, "message": "Produit supprimé" }
  ```
- **Capture :** `09-delete-product.png`

### Test 10 — Vérifier la suppression

- **Requête :** `GET http://localhost:3000/api/products/6afd76d620feacb83fffc834`
- **Résultat attendu :** 404 Not Found, puisque le produit n'existe plus.
- **Résultat observé :** 404 Not Found avec :
  ```json
  { "success": false, "message": "Produit introuvable" }
  ```
- **Conclusion :** la suppression a bien été appliquée dans MongoDB.
- **Capture :** `10-get-deleted-product.png`

---

## 4. Tests complémentaires recommandés

Ces tests couvrent les autres comportements de sécurité de l'API (voir `README.md`, sections 5 à 7).

| Test | Requête | Résultat attendu |
|---|---|---|
| Mauvais mot de passe | `POST /api/auth/login` avec un mot de passe erroné | 401 — « E-mail ou mot de passe incorrect » |
| E-mail déjà utilisé | `POST /api/auth/register` avec `testuser@mediequip.com` | 409 — « Un compte existe déjà avec cet e-mail » |
| Données d'inscription invalides | `POST /api/auth/register` avec un mot de passe de moins de 8 caractères | 400 — « Données invalides » avec la liste `errors` |
| Création sans token | `POST /api/products` sans Authorization | 401 — « Authentification requise : jeton manquant » |
| Token invalide | `POST /api/products` avec un token falsifié | 401 — « Jeton invalide ou expiré » |
| Utilisateur non admin | `POST /api/products` avec le token de `testuser@mediequip.com` | 403 — « Accès refusé : droits administrateur requis » (si `REQUIRE_ADMIN=true`) |
| Données produit invalides | `POST /api/products` avec `category: "Autre"` ou un `price` négatif | 400 — « Données invalides » |
| Identifiant invalide | `GET /api/products/abc` | 400 — « Identifiant de produit invalide » |
| Rate limiting du login | 6 requêtes `POST /api/auth/login` en moins de 15 minutes | 429 — « Trop de tentatives de connexion… » |

---

## 5. Conclusion

Les dix tests montrent que l'API :

- renvoie les produits stockés dans MongoDB (tests 1 et 2) ;
- enregistre un utilisateur sans exposer son mot de passe (test 3) ;
- authentifie l'utilisateur et délivre un JWT (test 4) ;
- accepte le token sur les routes protégées (test 5) et refuse les requêtes sans token (test 6) ;
- permet de créer, modifier et supprimer un produit avec un token (tests 7 à 9) ;
- renvoie une erreur 404 claire pour une ressource supprimée (test 10).

L'API et la base de données répondent comme attendu, et le frontend React peut donc les utiliser.
