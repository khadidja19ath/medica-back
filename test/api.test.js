// Test d'intégration de bout en bout (nécessite MongoDB accessible via MONGODB_URI).
// Usage : npm test   -> utilise une base dédiée "<nom>_test" pour ne pas toucher vos données.
require("dotenv").config({ quiet: true });
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const mongoose = require("mongoose");

// Base de test dédiée + limite de login élevée pour la suite principale
const baseUri = process.env.MONGODB_URI.replace(/\/([^/?]+)(\?|$)/, (_m, db, q) => `/${db}_apitest${q}`);
process.env.MONGODB_URI = baseUri;
process.env.RATE_LIMIT_LOGIN_MAX = "50";
process.env.REQUIRE_ADMIN = "true";
process.env.GOOGLE_CLIENT_ID = "test-client-id";

const createApp = require("../app");
const User = require("../models/User");
const Product = require("../models/Product");
const bcrypt = require("bcryptjs");

let passed = 0;
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  OK   ${name}`);
  } catch (error) {
    console.log(`  FAIL ${name}\n       ${error.message}`);
    process.exitCode = 1;
  }
}

const sample = {
  name: "Produit test", description: "Description test", price: 1000, category: "Diagnostic",
  imageUrl: "https://exemple.com/img.jpg", stock: 10,
};

async function main() {
  await mongoose.connect(baseUri);
  await mongoose.connection.dropDatabase();
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, path, { body, token, raw } = {}) => {
    const response = await fetch(base + path, {
      method,
      headers: { ...(body || raw ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: raw ?? (body ? JSON.stringify(body) : undefined),
    });
    return { status: response.status, data: await response.json().catch(() => null) };
  };

  await User.create({ name: "Admin", email: "admin@test.dz", passwordHash: await bcrypt.hash("Admin12345", 10), role: "admin" });
  let userToken, adminToken, productId;

  console.log("\nAuthentification");
  await check("register : 201 + mot de passe haché en base", async () => {
    const r = await call("POST", "/api/auth/register", { body: { name: "Sara", email: "Sara@Test.dz", password: "motdepasse1" } });
    assert.equal(r.status, 201);
    assert.equal(r.data.user.passwordHash, undefined);
    const stored = await User.findOne({ email: "sara@test.dz" }).select("+passwordHash");
    assert.notEqual(stored.passwordHash, "motdepasse1");
    assert.ok(stored.passwordHash.startsWith("$2"));
    assert.equal(stored.role, "user");
  });
  await check("register : e-mail déjà utilisé => 409", async () => {
    const r = await call("POST", "/api/auth/register", { body: { name: "Sara", email: "sara@test.dz", password: "motdepasse1" } });
    assert.equal(r.status, 409);
  });
  await check("register : champs invalides => 400", async () => {
    const r = await call("POST", "/api/auth/register", { body: { name: "", email: "pas-un-mail", password: "123" } });
    assert.equal(r.status, 400);
    assert.equal(r.data.errors.length, 3);
  });
  await check("register : impossible de s'attribuer le rôle admin", async () => {
    await call("POST", "/api/auth/register", { body: { name: "Hack", email: "hack@test.dz", password: "motdepasse1", role: "admin" } });
    assert.equal((await User.findOne({ email: "hack@test.dz" })).role, "user");
  });
  await check("login valide => 200 + token", async () => {
    const r = await call("POST", "/api/auth/login", { body: { email: "sara@test.dz", password: "motdepasse1" } });
    assert.equal(r.status, 200);
    assert.ok(r.data.token);
    userToken = r.data.token;
  });
  await check("login admin => token admin", async () => {
    const r = await call("POST", "/api/auth/login", { body: { email: "admin@test.dz", password: "Admin12345" } });
    assert.equal(r.data.user.role, "admin");
    adminToken = r.data.token;
  });
  await check("login mauvais mot de passe / e-mail inconnu => 401", async () => {
    assert.equal((await call("POST", "/api/auth/login", { body: { email: "sara@test.dz", password: "faux" } })).status, 401);
    assert.equal((await call("POST", "/api/auth/login", { body: { email: "inconnu@test.dz", password: "faux" } })).status, 401);
  });
  await check("login sans champs => 400", async () => {
    assert.equal((await call("POST", "/api/auth/login", { body: {} })).status, 400);
  });
  await check("JSON malformé => 400", async () => {
    assert.equal((await call("POST", "/api/auth/login", { raw: "{pas du json" })).status, 400);
  });
  await check("GET /auth/me avec token => 200, sans token => 401", async () => {
    assert.equal((await call("GET", "/api/auth/me", { token: userToken })).data.user.email, "sara@test.dz");
    assert.equal((await call("GET", "/api/auth/me")).status, 401);
  });

  console.log("\nProduits");
  await check("POST produit avec token admin => 201", async () => {
    const r = await call("POST", "/api/products", { body: sample, token: adminToken });
    assert.equal(r.status, 201);
    productId = r.data.product._id;
  });
  await check("GET liste (public) => 200", async () => {
    const r = await call("GET", "/api/products");
    assert.equal(r.status, 200);
    assert.equal(r.data.count, 1);
  });
  await check("GET un produit => 200", async () => {
    assert.equal((await call("GET", `/api/products/${productId}`)).data.product.name, "Produit test");
  });
  await check("PUT produit avec token admin => 200", async () => {
    const r = await call("PUT", `/api/products/${productId}`, { body: { price: 1500, stock: 7 }, token: adminToken });
    assert.equal(r.status, 200);
    assert.equal(r.data.product.price, 1500);
    assert.equal(r.data.product.name, "Produit test"); // champs non envoyés conservés
  });
  await check("PUT avec valeur invalide => 400", async () => {
    assert.equal((await call("PUT", `/api/products/${productId}`, { body: { price: -5 }, token: adminToken })).status, 400);
  });
  await check("POST sans token => 401", async () => {
    assert.equal((await call("POST", "/api/products", { body: sample })).status, 401);
  });
  await check("POST avec token invalide => 401", async () => {
    assert.equal((await call("POST", "/api/products", { body: sample, token: "abc.def.ghi" })).status, 401);
  });
  await check("POST avec token d'un simple utilisateur => 403 (REQUIRE_ADMIN=true)", async () => {
    assert.equal((await call("POST", "/api/products", { body: sample, token: userToken })).status, 403);
  });
  await check("ID invalide => 400, ID inexistant => 404", async () => {
    assert.equal((await call("GET", "/api/products/123")).status, 400);
    assert.equal((await call("GET", "/api/products/64b7f0f0f0f0f0f0f0f0f0f0")).status, 404);
    assert.equal((await call("DELETE", "/api/products/64b7f0f0f0f0f0f0f0f0f0f0", { token: adminToken })).status, 404);
  });
  await check("POST données manquantes / catégorie invalide => 400", async () => {
    const r = await call("POST", "/api/products", { body: { name: "x" }, token: adminToken });
    assert.equal(r.status, 400);
    assert.ok(r.data.errors.length >= 4);
    assert.equal((await call("POST", "/api/products", { body: { ...sample, category: "Autre" }, token: adminToken })).status, 400);
  });
  await check("POST ignore les champs inconnus (ex. _id, isAdmin)", async () => {
    const r = await call("POST", "/api/products", { body: { ...sample, isAdmin: true, _id: "64b7f0f0f0f0f0f0f0f0f0f1" }, token: adminToken });
    assert.equal(r.status, 201);
    assert.notEqual(r.data.product._id, "64b7f0f0f0f0f0f0f0f0f0f1");
    assert.equal(r.data.product.isAdmin, undefined);
  });
  await check("DELETE avec token admin => 200 puis 404", async () => {
    assert.equal((await call("DELETE", `/api/products/${productId}`, { token: adminToken })).status, 200);
    assert.equal((await call("GET", `/api/products/${productId}`)).status, 404);
  });
  await check("route inconnue => 404 JSON", async () => {
    const r = await call("GET", "/api/nimporte");
    assert.equal(r.status, 404);
    assert.equal(r.data.success, false);
  });

  console.log("\nCORS");
  await check("en-tête CORS pour http://localhost:5173", async () => {
    const r = await fetch(base + "/api/products", { headers: { Origin: "http://localhost:5173" } });
    assert.equal(r.headers.get("access-control-allow-origin"), "http://localhost:5173");
  });

  console.log("\nOAuth2 Google (réponse Google simulée)");
  const realFetch = global.fetch;
  const mockGoogle = (info, ok = true) => {
    global.fetch = (url, opts) => String(url).startsWith("https://oauth2.googleapis.com/tokeninfo")
      ? Promise.resolve({ ok, json: async () => info })
      : realFetch(url, opts);
  };
  await check("access token Google valide (e-mail inconnu) => /me OK, écriture produit 403", async () => {
    mockGoogle({ aud: "test-client-id", email: "inconnu@gmail.com", email_verified: "true" });
    assert.equal((await call("GET", "/api/auth/me", { token: "ya29.valide" })).data.user.provider, "google");
    assert.equal((await call("POST", "/api/products", { body: sample, token: "ya29.valide" })).status, 403);
  });
  await check("access token Google d'un e-mail admin => création produit 201", async () => {
    mockGoogle({ aud: "test-client-id", email: "admin@test.dz", email_verified: "true" });
    assert.equal((await call("POST", "/api/products", { body: sample, token: "ya29.admin" })).status, 201);
  });
  await check("jeton Google émis pour une autre application => 401", async () => {
    mockGoogle({ aud: "autre-client", email: "admin@test.dz", email_verified: "true" });
    assert.equal((await call("GET", "/api/auth/me", { token: "ya29.autre" })).status, 401);
  });
  await check("jeton rejeté par Google => 401", async () => {
    mockGoogle({ error: "invalid_token" }, false);
    assert.equal((await call("GET", "/api/auth/me", { token: "ya29.mauvais" })).status, 401);
  });
  global.fetch = realFetch;

  console.log("\nRéglage REQUIRE_ADMIN=false (énoncé strict : JWT suffit)");
  await check("utilisateur simple peut créer un produit", async () => {
    process.env.REQUIRE_ADMIN = "false";
    assert.equal((await call("POST", "/api/products", { body: sample, token: userToken })).status, 201);
    process.env.REQUIRE_ADMIN = "true";
  });

  server.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();

  // Rate limiting : vrai serveur avec les limites par défaut de l'énoncé (100 / 5)
  console.log("\nRate limiting (limites par défaut : 100 et 5)");
  const child = spawn("node", ["server.js"], {
    env: { ...process.env, PORT: "3099", MONGODB_URI: baseUri, RATE_LIMIT_LOGIN_MAX: "5", RATE_LIMIT_MAX: "100" },
    stdio: "ignore",
  });
  await new Promise((r) => setTimeout(r, 2500));
  try {
    await check("login : 5 requêtes passent (401), la 6e => 429", async () => {
      const codes = [];
      for (let i = 0; i < 7; i++) {
        const r = await fetch("http://127.0.0.1:3099/api/auth/login", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "x@x.dz", password: "faux" }),
        });
        codes.push(r.status);
      }
      assert.deepEqual(codes, [401, 401, 401, 401, 401, 429, 429]);
    });
    await check("API générale : 100 requêtes passent, la suivante => 429 JSON", async () => {
      let last;
      let ok = 0;
      for (let i = 0; i < 101; i++) {
        last = await fetch("http://127.0.0.1:3099/api/products");
        if (last.status === 200) ok++;
      }
      // 7 requêtes de login déjà comptées dans la même fenêtre : il reste 93
      assert.equal(last.status, 429);
      assert.equal((await last.json()).success, false);
      assert.ok(ok >= 90 && ok <= 100, `succès=${ok}`);
    });
  } finally {
    child.kill();
  }

  console.log(`\n${passed} tests réussis${process.exitCode ? " — ÉCHECS ci-dessus" : ""}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
