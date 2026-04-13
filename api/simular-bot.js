const Anthropic = require('@anthropic-ai/sdk');

const PROMPT = ({ nombre, rubro, faq1, faq2, faq3 }) => `Sos el sistema de IA de un negocio argentino. Tu trabajo es simular exactamente cómo respondería un bot de WhatsApp profesional para este negocio.

NEGOCIO: ${nombre}
RUBRO: ${rubro}

LAS 3 PREGUNTAS QUE MÁS LE HACEN LOS CLIENTES (usá estas EXACTAMENTE como mensajes del cliente, sin cambiarlas):
1. ${faq1}
2. ${faq2}
3. ${faq3}

GENERÁ la conversación de WhatsApp entre un cliente y el bot del negocio.

REGLAS ESTRICTAS:
- Tono: cálido, directo, argentino. Nada de robot impersonal ni de "Estimado cliente".
- Respuestas cortas y al punto. Es WhatsApp, no un email corporativo.
- El bot puede inventar datos realistas y creíbles para el rubro (precios aproximados, horarios típicos, procesos reales).
- Usá emojis con mucho criterio: máximo 1 por mensaje, solo cuando suma.
- En el primer mensaje del bot, saludá con calidez.
- En el último mensaje (el proactivo), el bot da un próximo paso concreto y claro.
- Prohibido: "¡Claro que sí!", "Por supuesto", "Estimado", "Con gusto", "No dudes en".

FORMATO DE RESPUESTA — JSON válido, sin markdown, sin texto adicional:
{
  "conversacion": [
    {"rol": "cliente", "texto": "${faq1.replace(/"/g, '\\"')}"},
    {"rol": "bot", "texto": "[respuesta natural y directa al FAQ 1]"},
    {"rol": "cliente", "texto": "${faq2.replace(/"/g, '\\"')}"},
    {"rol": "bot", "texto": "[respuesta natural al FAQ 2]"},
    {"rol": "cliente", "texto": "${faq3.replace(/"/g, '\\"')}"},
    {"rol": "bot", "texto": "[respuesta natural al FAQ 3]"},
    {"rol": "bot", "texto": "[mensaje proactivo final: ofrece un próximo paso concreto, por ejemplo reservar, coordinar o consultar]"}
  ]
}`;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nombre, rubro, faq1, faq2, faq3 } = req.body || {};

  if (!nombre?.trim() || !rubro?.trim() || !faq1?.trim() || !faq2?.trim() || !faq3?.trim()) {
    return res.status(400).json({ error: 'Faltan datos requeridos.' });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: PROMPT({
          nombre: nombre.trim(),
          rubro: rubro.trim(),
          faq1: faq1.trim(),
          faq2: faq2.trim(),
          faq3: faq3.trim(),
        })
      }]
    });

    const raw = message.content[0].text.trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const data = JSON.parse(raw);
    return res.status(200).json(data);

  } catch (error) {
    console.error('Error simulando bot:', error);
    return res.status(500).json({ error: 'No pudimos iniciar la simulación. Intentá de nuevo.' });
  }
};
