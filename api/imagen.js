// Proxy para Pexels API — oculta la API key del cliente
// Requiere: PEXELS_API_KEY en variables de entorno de Vercel

const RUBRO_MAP = {
  // Belleza
  'peluqueria':   'hair salon barber',
  'peluquería':   'hair salon barber',
  'estetica':     'beauty spa wellness treatment',
  'estética':     'beauty spa wellness treatment',
  'spa':          'spa wellness relaxation',
  'barberia':     'barber shop grooming',
  'barbería':     'barber shop grooming',
  'manicuria':    'nail salon beauty',
  'manicuría':    'nail salon beauty',
  'maquillaje':   'makeup beauty artist',
  // Gastronomía
  'pizzeria':     'pizza restaurant',
  'pizzería':     'pizza restaurant',
  'restaurant':   'restaurant food dining',
  'restaurante':  'restaurant food dining',
  'cafeteria':    'coffee cafe cozy',
  'cafetería':    'coffee cafe cozy',
  'panaderia':    'bakery bread pastry',
  'panadería':    'bakery bread pastry',
  'pasteleria':   'pastry cake dessert',
  'pastelería':   'pastry cake dessert',
  'heladeria':    'ice cream dessert',
  'heladería':    'ice cream dessert',
  'hamburgueseria': 'burger restaurant grill',
  'hamburguesería': 'burger restaurant grill',
  'sushi':        'sushi japanese restaurant',
  'comida':       'food restaurant kitchen',
  // Salud
  'clinica':      'medical clinic doctor',
  'clínica':      'medical clinic doctor',
  'dentista':     'dentist dental clinic',
  'odontologia':  'dentist dental clinic',
  'odontología':  'dentist dental clinic',
  'medico':       'doctor medical health',
  'médico':       'doctor medical health',
  'farmacia':     'pharmacy medicine',
  'veterinaria':  'veterinary pet animals',
  'psicologia':   'therapy counseling calm',
  'psicología':   'therapy counseling calm',
  'nutricion':    'nutrition healthy food',
  'nutrición':    'nutrition healthy food',
  'kinesiologa':  'physiotherapy rehabilitation',
  'kinesiología': 'physiotherapy rehabilitation',
  // Fitness
  'gimnasio':     'gym fitness workout',
  'pilates':      'pilates yoga studio',
  'yoga':         'yoga meditation wellness',
  'crossfit':     'crossfit gym training',
  'natacion':     'swimming pool sports',
  'natación':     'swimming pool sports',
  // Automotriz
  'mecanico':     'auto mechanic garage car repair',
  'mecánico':     'auto mechanic garage car repair',
  'taller':       'auto workshop mechanic',
  'gomeria':      'tire shop mechanic',
  'gomería':      'tire shop mechanic',
  // Comercio
  'ropa':         'clothing fashion store boutique',
  'indumentaria': 'clothing fashion boutique',
  'zapateria':    'shoe store fashion',
  'zapatería':    'shoe store fashion',
  'ferreteria':   'hardware store tools',
  'ferretería':   'hardware store tools',
  'libreria':     'bookstore library',
  'librería':     'bookstore stationery',
  'florerias':    'flower shop florist',
  'florerías':    'flower shop florist',
  // Servicios profesionales
  'contador':     'accounting office professional',
  'contadora':    'accounting office professional',
  'abogado':      'lawyer office professional',
  'abogada':      'lawyer office professional',
  'arquitecto':   'architecture design modern',
  'inmobiliaria': 'real estate building property',
  'seguros':      'insurance office professional',
  // Tecnología
  'tecnologia':   'technology computer office',
  'tecnología':   'technology computer office',
  'diseño':       'design creative studio',
  'marketing':    'marketing office creative',
  'fotografia':   'photography camera studio',
  'fotografía':   'photography camera studio',
  // Educación
  'escuela':      'school education classroom',
  'instituto':    'education learning institute',
  'academia':     'academy learning education',
  'guarderia':    'daycare children kids',
  'guardería':    'daycare children kids',
  // Construcción / Hogar
  'construccion': 'construction building architecture',
  'construcción': 'construction building architecture',
  'plomero':      'plumbing pipes home repair',
  'electricista': 'electrician wiring home',
  'pintor':       'painting home renovation',
  'limpieza':     'cleaning home service',
  'mudanza':      'moving service truck',
  'jardineria':   'garden landscaping plants',
  'jardinería':   'garden landscaping plants',
  // Transporte
  'remis':        'car transport service',
  'taxi':         'taxi car transport',
  'transporte':   'transport logistics vehicle',
};

function resolveKeyword(rubro) {
  const clean = rubro.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Exact match
  if (RUBRO_MAP[clean]) return RUBRO_MAP[clean];

  // Partial match
  for (const [key, val] of Object.entries(RUBRO_MAP)) {
    const keyClean = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (clean.includes(keyClean) || keyClean.includes(clean)) return val;
  }

  // Fallback: use original word + generic terms
  return `${rubro} business professional service`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q = 'business', count = '2' } = req.query;
  const keyword = resolveKeyword(q);
  const perPage = Math.min(parseInt(count) || 2, 4);

  if (!process.env.PEXELS_API_KEY) {
    return res.status(500).json({ error: 'PEXELS_API_KEY no configurada.' });
  }

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&per_page=${perPage}&orientation=landscape`,
      { headers: { Authorization: process.env.PEXELS_API_KEY } }
    );

    if (!response.ok) {
      return res.status(502).json({ error: 'Error al consultar Pexels.' });
    }

    const data = await response.json();
    const photos = (data.photos || []).map(p => ({
      hero:  p.src.large2x || p.src.large,
      about: p.src.portrait || p.src.large,
      alt:   p.alt || keyword,
    }));

    // Cache 1 hora en Vercel CDN
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json({ photos, keyword });

  } catch (error) {
    console.error('Error imagen:', error);
    return res.status(500).json({ error: 'No pudimos cargar las imágenes.' });
  }
};
