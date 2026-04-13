const Anthropic = require('@anthropic-ai/sdk');

const PROMPT = ({ nombre, rubro, audiencia, dolor, diferencial, tono }) => `Sos un Copywriter Senior y Estratega de Marca experto en el framework StoryBrand. Tu misión es generar el contenido principal de una landing page para un emprendedor argentino.

DATOS DEL NEGOCIO:
- Nombre: ${nombre}
- Rubro: ${rubro}
- Público objetivo: ${audiencia}
- Problema que resuelve: ${dolor}
- Diferencial clave: ${diferencial}
- Tono de voz: ${tono}

REGLAS DE ESCRITURA:
1. PROHIBIDO: "soluciones integrales", "empoderar", "excelencia", "en el mundo de hoy", "potenciar", "sinergia"
2. Usá segunda persona siempre ("tu negocio", "tus clientes")
3. El cliente es el HÉROE. El negocio es el GUÍA que lo ayuda a ganar
4. Frases cortas y directas. Tono argentino, sin tecnicismos
5. Claridad sobre creatividad: mejor ser claro que sonar inteligente
6. Respetá el tono especificado al pie de la letra

FORMATO DE RESPUESTA — usá EXACTAMENTE estos marcadores, en este orden, sin markdown ni texto extra:
§H1§
[Titular en menos de 10 palabras — el beneficio principal que obtiene el cliente]
§H2§
[Subtítulo: qué hacés y para quién, máximo 18 palabras]
§CTA§
[Texto del botón de acción, máximo 5 palabras]
§ABOUT§
[Párrafo 1: Por qué entendés el problema del cliente — contalo desde su perspectiva, no la tuya]
[Párrafo 2: Tu autoridad para resolverlo — sin sonar arrogante, con evidencia concreta]
§S1_TITULO§
[Nombre del primer servicio o propuesta]
§S1_DESC§
[Resultado que obtiene el cliente con este servicio — enfocate en el beneficio, no en la característica]
§S2_TITULO§
[Nombre del segundo servicio]
§S2_DESC§
[Resultado del segundo servicio]
§S3_TITULO§
[Nombre del tercer servicio]
§S3_DESC§
[Resultado del tercer servicio]
§ONELINER§
[Una sola frase potente que resume el negocio — el emprendedor la puede usar en cualquier conversación]

Respondé ÚNICAMENTE con el formato especificado. Sin explicaciones, sin markdown, sin texto adicional antes o después.`;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nombre, rubro, audiencia, dolor, diferencial, tono } = req.body || {};

  if (!nombre?.trim() || !rubro?.trim() || !audiencia?.trim() || !dolor?.trim() || !diferencial?.trim()) {
    return res.status(400).json({ error: 'Faltan datos requeridos.' });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: PROMPT({
          nombre: nombre.trim(),
          rubro: rubro.trim(),
          audiencia: audiencia.trim(),
          dolor: dolor.trim(),
          diferencial: diferencial.trim(),
          tono: tono || 'Cercano y familiar',
        })
      }]
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Error generando landing:', error);
    res.write(`data: ${JSON.stringify({ error: 'No pudimos generar el contenido. Intentá de nuevo.' })}\n\n`);
    res.end();
  }
};
