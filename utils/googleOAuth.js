// Vérification d'un jeton OAuth 2.0 / OpenID Connect délivré par Google.
// Utilisé quand le client (Postman / Thunder Client) envoie un access token Google
// dans l'en-tête  Authorization: Bearer <ACCESS_TOKEN>

const TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";

// Retourne { email, name } si le jeton est valide, sinon null
async function verifyGoogleToken(token) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return null; // OAuth2 désactivé

  // Les access tokens Google commencent par "ya29." ; sinon on suppose un id_token
  const param = token.startsWith("ya29.") ? "access_token" : "id_token";

  try {
    const response = await fetch(`${TOKENINFO_URL}?${param}=${encodeURIComponent(token)}`);
    if (!response.ok) return null;

    const info = await response.json();

    // Le jeton doit avoir été émis pour NOTRE application (client ID)
    const audience = info.aud || info.azp;
    if (audience !== clientId) return null;

    // On exige un e-mail vérifié (scope "email" demandé dans Postman)
    if (!info.email || info.email_verified === "false" || info.email_verified === false) return null;

    return { email: info.email.toLowerCase(), name: info.name || info.email };
  } catch {
    return null;
  }
}

module.exports = verifyGoogleToken;
