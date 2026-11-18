// Prueba de rendimiento/carga sin dependencias: node scripts/rendimiento.mjs [segundos] [concurrencia]
// Mide latencia (p50/p95/p99), throughput y errores por endpoint, y el efecto de gzip.
import "dotenv/config";

const API = process.env.API_URL ?? "http://localhost:3001";
const SEG = Number(process.argv[2] ?? 8);
const CONC = Number(process.argv[3] ?? 20);
const USER = process.env.TEST_ADMIN_USER ?? "admin";
const PASS = process.env.TEST_ADMIN_PASS ?? "Admin2026!";

const login = await fetch(`${API}/api/auth/login`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: USER, password: PASS }),
});
if (!login.ok) { console.error(`Login falló (${login.status})`); process.exit(1); }
const token = (await login.json()).token;
const auth = { Authorization: `Bearer ${token}` };

const ENDPOINTS = [
  { nombre: "GET /api/health", ruta: "/api/health" },
  { nombre: "GET /api/publico/avisos (sin auth)", ruta: "/api/publico/avisos" },
  { nombre: "GET /api/sensores", ruta: "/api/sensores", headers: auth },
  { nombre: "GET /api/alertas", ruta: "/api/alertas", headers: auth },
  { nombre: "GET /api/telemetry/estadisticas", ruta: "/api/telemetry/estadisticas", headers: auth },
];

const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))];

async function medir(e) {
  const lat = []; let errores = 0; let limitadas = 0; let bytes = 0;
  const fin = Date.now() + SEG * 1000;
  const inicio = performance.now();
  await Promise.all(Array.from({ length: CONC }, async () => {
    while (Date.now() < fin) {
      const t0 = performance.now();
      try {
        const r = await fetch(API + e.ruta, { headers: { "Accept-Encoding": "gzip", ...(e.headers ?? {}) } });
        const buf = await r.arrayBuffer();
        bytes += buf.byteLength;
        if (r.status === 429) limitadas++; // limitador de tasa: comportamiento esperado, no es un fallo
        else if (r.status >= 400) errores++;
      } catch { errores++; }
      lat.push(performance.now() - t0);
    }
  }));
  const total = (performance.now() - inicio) / 1000;
  lat.sort((a, b) => a - b);
  return {
    endpoint: e.nombre, peticiones: lat.length, "req/s": Math.round(lat.length / total),
    "p50 ms": +pct(lat, 0.5).toFixed(1), "p95 ms": +pct(lat, 0.95).toFixed(1), "p99 ms": +pct(lat, 0.99).toFixed(1),
    "429 (limitador)": limitadas, errores, "KB/resp": +(bytes / lat.length / 1024).toFixed(2),
  };
}

async function gzip() {
  const url = `${API}/api/sensores`;
  const sin = await (await fetch(url, { headers: { ...auth, "Accept-Encoding": "identity" } })).arrayBuffer();
  const con = await fetch(url, { headers: { ...auth, "Accept-Encoding": "gzip" } });
  return { sinCompresion: sin.byteLength, conGzip: con.headers.get("content-encoding") ?? "(sin compresión)" };
}

console.log(`Carga: ${CONC} conexiones concurrentes × ${SEG} s por endpoint contra ${API}\n`);
const filas = [];
for (const e of ENDPOINTS) filas.push(await medir(e));
console.table(filas);
const g = await gzip();
console.log(`Compresión de /api/sensores: ${g.sinCompresion} bytes sin comprimir; Content-Encoding con gzip: ${g.conGzip}`);
const errTotal = filas.reduce((s, f) => s + f.errores, 0);
if (errTotal > 0) { console.error(`\n${errTotal} errores durante la carga`); process.exit(1); }
