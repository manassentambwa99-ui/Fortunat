// Proxy serveur pour l'analyse de photos (fonction serverless Vercel).
// La clé Groq n'existe QUE ici, dans la variable d'environnement GROQ_API_KEY :
// elle n'est jamais envoyée au navigateur et n'est jamais écrite dans le dépôt.

const MODEL = process.env.GROQ_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

const PROMPT =
  "Tu es agronome. Analyse cette photo de plante ou de sol. " +
  "Réponds UNIQUEMENT en français, avec ces 8 lignes exactement :\n" +
  "ESPECE: nom vernaculaire (nom latin)\n" +
  "AGE: âge approximatif et stade phénologique\n" +
  "ENGRAIS: engrais recommandé et dosage\n" +
  "ARROSAGE: fréquence et volume\n" +
  "EXPOSITION: exposition conseillée\n" +
  "MATURITE: nombre entier entre 0 et 100\n" +
  "TITRE: 4 à 7 mots sur l'état général\n" +
  "DESC: 2 phrases de conseil pratique";

// Limite de taille d'une image encodée en base64 (Groq : 4 Mo ; Vercel : 4,5 Mo par requête)
const MAX_IMAGE_CHARS = 4 * 1024 * 1024;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // Optionnel : n'accepter que les appels venant de votre site (ex. https://agrifortunat.vercel.app)
  const allowed = process.env.ALLOWED_ORIGIN;
  const origin = req.headers.origin;
  if (allowed && origin && origin !== allowed) {
    return res.status(403).json({ error: 'forbidden_origin' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('GROQ_API_KEY manquante dans les variables d\'environnement.');
    return res.status(500).json({ error: 'server_not_configured' });
  }

  const image = req.body && req.body.image;
  if (typeof image !== 'string' || !/^data:image\/(jpeg|jpg|png|webp);base64,/.test(image)) {
    return res.status(400).json({ error: 'invalid_image' });
  }
  if (image.length > MAX_IMAGE_CHARS) {
    return res.status(413).json({ error: 'image_too_large' });
  }

  try {
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.35,
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: image } }
          ]
        }]
      })
    });

    if (!upstream.ok) {
      console.error('Groq a répondu HTTP', upstream.status);
      return res.status(502).json({ error: 'upstream_error', status: upstream.status });
    }

    const data = await upstream.json();
    const text = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content : '';
    return res.status(200).json({ text: text || '' });
  } catch (err) {
    console.error('Erreur proxy :', err && err.message);
    return res.status(502).json({ error: 'upstream_unreachable' });
  }
};
