const Anthropic = require('@anthropic-ai/sdk');

const PROMPT = (rubro, tieneWeb, canal, mensajes, respuesta) => `Sos el asesor digital de Huella Digital, una agencia argentina que instala sistemas automáticos de captación de clientes para negocios.

Tu trabajo es analizar los datos reales de un negocio y prescribir exactamente qué necesita para no perder más consultas. No generalizás. No das respuestas genéricas. Sos directo y concreto.

Datos del negocio:
- Rubro: ${rubro}
- Tiene web propia: ${tieneWeb}
- Canal principal de consultas: ${canal}
- Consultas que recibe por semana: ${mensajes}
- Velocidad de respuesta a consultas: ${respuesta}

Analizá estos datos y generá el diagnóstico en JSON con esta estructura exacta:

{
  "titular": "Frase impactante de máximo 12 palabras basada en el problema principal detectado. Usá el rubro. Ejemplos: 'Tu peluquería pierde clientes todas las noches por no responder' / 'La ferretería está perdiendo ventas por no tener web propia'",
  "problemas": [
    {
      "titulo": "Nombre corto del problema en máximo 5 palabras",
      "descripcion": "Una oración concreta sobre qué está perdiendo por este problema. Tono argentino directo. Sin tecnicismos."
    }
  ],
  "impacto": {
    "numero": "Estimación realista del volumen perdido (ej: '15-25' o '8-15'). Solo números.",
    "unidad": "consultas por semana o clientes por mes, según lo más impactante para este rubro",
    "descripcion": "Dos oraciones cortas y concretas. Qué significa ese número en ingresos o clientes reales que se van a la competencia."
  },
  "recomendacion": {
    "titulo": "Título energético de la solución en máximo 8 palabras",
    "pasos": [
      "Solución concreta 1 adaptada al rubro. Puede ser: web propia, respuesta automática por WhatsApp, recordatorio de turnos automático, alerta instantánea de leads nuevos",
      "Solución 2",
      "Solución 3"
    ]
  },
  "urgencia": "Una sola oración final potente. Tono argentino, sin rodeos. Sin signos de exclamación. Que genere acción inmediata."
}

Reglas importantes:
- Detectá entre 2 y 3 problemas reales y específicos a los datos ingresados
- Si no tiene web, el problema principal es visibilidad y dependencia de redes
- Si responde tarde o no siempre responde, el problema principal es consultas perdidas por demora
- Si recibe muchas consultas pero responde tarde, el impacto es alto — reflejalo en el número
- La recomendación adapta las soluciones al rubro concreto (turnos para peluquería, presupuestos para herrería, etc.)
- No uses palabras como: soluciones digitales, innovación, transformación digital, ecosistema
- Respondé ÚNICAMENTE con el JSON válido. Sin markdown, sin texto adicional, sin comentarios.`;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { rubro, tieneWeb, canal, mensajes, respuesta } = req.body || {};

  if (!rubro?.trim() || !tieneWeb?.trim() || !canal?.trim() || !mensajes?.trim() || !respuesta?.trim()) {
    return res.status(400).json({ error: 'Faltan datos del diagnóstico.' });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: PROMPT(rubro.trim(), tieneWeb.trim(), canal.trim(), mensajes.trim(), respuesta.trim())
      }]
    });

    const raw = message.content[0].text.trim();
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const data = JSON.parse(text);

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error en diagnóstico:', error);
    return res.status(500).json({ error: 'No pudimos generar el diagnóstico. Intentá de nuevo.' });
  }
};
