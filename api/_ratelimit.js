/**
 * Rate limiter en memoria por IP.
 * Límite: N requests en una ventana deslizante de 1 hora.
 * Nota: cada instancia de Vercel Function tiene su propio mapa.
 * Para tráfico bajo/medio es suficiente. Si se necesita algo distribuido, usar Upstash.
 */

const store = new Map(); // ip -> [timestamps]

// Limpia entradas viejas cada 30 minutos para no acumular memoria
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [ip, times] of store) {
    const fresh = times.filter(t => t > cutoff);
    if (fresh.length === 0) store.delete(ip);
    else store.set(ip, fresh);
  }
}, 30 * 60 * 1000);

/**
 * @param {string} ip
 * @param {number} limit - máximo de requests por hora
 * @returns {{ allowed: boolean, remaining: number, minutesLeft: number }}
 */
function checkLimit(ip, limit = 5) {
  const now = Date.now();
  const window = 60 * 60 * 1000; // 1 hora
  const cutoff = now - window;

  const times = (store.get(ip) || []).filter(t => t > cutoff);

  if (times.length >= limit) {
    const oldest = Math.min(...times);
    const minutesLeft = Math.ceil((oldest + window - now) / 60000);
    return { allowed: false, remaining: 0, minutesLeft };
  }

  times.push(now);
  store.set(ip, times);
  return { allowed: true, remaining: limit - times.length, minutesLeft: 0 };
}

/**
 * Extrae la IP real del request (Vercel pone x-forwarded-for).
 * Bypasea rate limit en localhost para desarrollo.
 */
function getIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  let ip = forwarded ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress || 'unknown';
  
  // Bypass para localhost en desarrollo
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    return 'localhost-bypass';
  }
  
  return ip;
}

module.exports = { checkLimit, getIP };
