const Anthropic = require('@anthropic-ai/sdk');
const { checkLimit, getIP } = require('./_ratelimit');

const PROMPT = ({ nombre, negocio, target, diferencial, color }) => `Sos un estratega de marca y planner web. Tu misión es generar un brief orientativo para un cliente que quiere una página web.

DATOS DEL NEGOCIO:
- Nombre: ${nombre}
- Qué hace: ${negocio}
- Para quién es: ${target}
- Diferencial: ${diferencial}
- Color de marca: ${color}

REGLAS:
1. Usá segunda persona ("tu negocio", "tus clientes")
2. Frases cortas, tono argentino, sin tecnicismos
3. Sé específico — nada de texto genérico
4. Si no te dan diferencial, inventá uno razonable basado en el negocio

FORMATO DE RESPUESTA — usá EXACTAMENTE estos marcadores:

§ESTRUCTURA§
[Listado de 4-5 secciones recomendadas para la web — una por línea]

§TEXTOS§
[H1 suggested]
[Subtítulo suggested]
[Párrafo "Sobre nosotros" sugerido — 2-3 frases]

§SERVICIOS§
[3 servicios con descripción corta cada uno]

§COLORES§
[Paleta sugerida: color principal + 2 colores complementarios en hex]

§IMAGENES§
[3 ideas de tipo de imagen que應該 usar — específico, no "fotos genéricas"]

§CTA§
[Mensaje para el botón de contacto]

Respondé ÚNICAMENTE con el formato. Sin markdown, sin texto extra.`;

function suggestColor(negocio) {
  const n = negocio.toLowerCase();
  if (n.includes('pizza') || n.includes('comida') || n.includes('restaurant')) return '#E53935,#FFFFFF,#0A0A0A';
  if (n.includes('gym') || n.includes('fitness') || n.includes('deporte')) return '#0A0A0A,#FFFFFF,#D62828';
  if (n.includes('limp') || n.includes('mantenimient')) return '#0288D1,#FFFFFF,#0A0A0A';
  if (n.includes('salud') || n.includes('clínica') || n.includes('médic')) return '#00897B,#FFFFFF,#0A0A0A';
  if (n.includes('belleza') || n.includes('peluqu') || n.includes('barber')) return '#D62828,#FFFFFF,#1E1E1E';
  if (n.includes('flor') || n.includes('jardín')) return '#43A047,#FFFFFF,#0A0A0A';
  if (n.includes('música') || n.includes('dj')) return '#7B1FA2,#FFFFFF,#0A0A0A';
  return '#D62828,#FFFFFF,#1E1E1E'; // default
}

function parseColor(input) {
  if (!input) return null;
  const c = input.trim().toLowerCase();
  if (c.startsWith('#')) return c.toUpperCase();
  
  const colors = {
    'rosa': '#E91E63', 'rojo': '#D62828', 'azul': '#2196F3',
    'verde': '#4CAF50', 'negro': '#0A0A0A', 'blanco': '#FFFFFF',
    'gris': '#6B6B66', 'naranja': '#FF9800', 'dorado': '#FFC107',
    'violeta': '#9C27B0', 'celeste': '#03A9F4', 'turquesa': '#009688',
  };
  
  for (const [name, hex] of Object.entries(colors)) {
    if (c.includes(name)) return hex;
  }
  return null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getIP(req);
  const { allowed, minutesLeft } = checkLimit(ip, 10);
  if (!allowed) {
    return res.status(429).json({
      error: `Alcanzaste el límite. Podés volver en ${minutesLeft} minuto${minutesLeft !== 1 ? 's' : ''}.`
    });
  }

  const { nombre, negocio, target, diferencial, color } = req.body || {};

  if (!nombre?.trim() || !negocio?.trim()) {
    return res.status(400).json({ error: 'Faltan datos requeridos.' });
  }

  // Determine color palette
  let palette = suggestColor(negocio);
  if (color) {
    const parsed = parseColor(color);
    if (parsed) palette = `${parsed},#FFFFFF,#0A0A0A`;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send palette first
  res.write(`data: ${JSON.stringify({ palette })}\n\n`);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: PROMPT({
          nombre: nombre.trim(),
          negocio: negocio.trim(),
          target: target?.trim() || 'clientes del barrio',
          diferencial: diferencial?.trim() || 'no especificado',
          color: palette,
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
    console.error('Error generando brief:', error);
    res.write(`data: ${JSON.stringify({ error: 'No pudimos generar el brief. Intentá de nuevo.' })}\n\n`);
    res.end();
  }
};