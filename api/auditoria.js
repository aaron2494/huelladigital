const Anthropic = require('@anthropic-ai/sdk');

const PROMPT = (negocio, rubro, ciudad) => `Sos un experto en marketing digital especializado en el mercado argentino.
Tu trabajo es hacer auditorías de presencia digital para negocios que todavía no tienen internet.

Negocio: ${negocio}
Rubro: ${rubro}
Ciudad: ${ciudad}

Generá una auditoría impactante en JSON con esta estructura exacta:
{
  "titular": "Frase directa y poderosa, máximo 12 palabras. Usá el nombre del negocio y la ciudad. Ejemplo: 'Tu ferretería es invisible para 2.000 personas que buscan tornillos en Mendoza'",
  "busquedas": ["frase exacta que usaría un cliente en Google 1", "frase 2", "frase 3"],
  "perdida": {
    "clientes_mes": "número estimado realista (solo el número, ej: '40-60')",
    "descripcion": "2-3 oraciones concretas y visuales. Qué pasa cuando alguien busca este negocio en Google y no lo encuentra. Mencioná que la competencia sí aparece."
  },
  "solucion": {
    "titulo": "Título energético para la sección de solución",
    "puntos": ["beneficio específico 1 para este rubro puntual", "beneficio 2", "beneficio 3"]
  },
  "urgencia": "Una oración final potente. Tono argentino directo, sin rodeos, que genere acción inmediata."
}

Respondé ÚNICAMENTE con el JSON válido. Sin markdown, sin texto adicional, sin comentarios.`;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { negocio, rubro, ciudad } = req.body || {};

  if (!negocio?.trim() || !rubro?.trim() || !ciudad?.trim()) {
    return res.status(400).json({ error: 'Faltan datos: negocio, rubro y ciudad son requeridos.' });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: PROMPT(negocio.trim(), rubro.trim(), ciudad.trim()) }]
    });

    const text = message.content[0].text.trim();
    const data = JSON.parse(text);

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error en auditoría:', error);
    return res.status(500).json({ error: 'No pudimos generar la auditoría. Intentá de nuevo.' });
  }
};
