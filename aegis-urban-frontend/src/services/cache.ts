/**
 * Caché en memoria con vencimiento (TTL) y deduplicación de pedidos simultáneos.
 *
 * Objetivo: minimizar las peticiones al servidor. Si dos componentes piden lo mismo a la vez
 * se hace UNA sola petición, y mientras el dato no venza se responde desde la memoria.
 * Los errores no se guardan: el próximo pedido vuelve a intentar.
 */
interface Entrada { valor: unknown; expira: number }

const memoria = new Map<string, Entrada>();
const enVuelo = new Map<string, Promise<unknown>>();
export const estadisticas = { aciertos: 0, fallos: 0, deduplicados: 0 };

export function conCache<T>(clave: string, ttlMs: number, cargar: () => Promise<T>): Promise<T> {
  const guardado = memoria.get(clave);
  if (guardado && guardado.expira > Date.now()) {
    estadisticas.aciertos++;
    return Promise.resolve(guardado.valor as T);
  }

  const pendiente = enVuelo.get(clave);
  if (pendiente) {
    estadisticas.deduplicados++;
    return pendiente as Promise<T>;
  }

  estadisticas.fallos++;
  const promesa = cargar()
    .then((valor) => { memoria.set(clave, { valor, expira: Date.now() + ttlMs }); return valor; })
    .finally(() => { enVuelo.delete(clave); });
  enVuelo.set(clave, promesa);
  return promesa;
}

/** Descarta lo guardado cuyo nombre empieza con `prefijo` (o todo si no se indica). Usar al cambiar datos o cerrar sesión. */
export function invalidar(prefijo = ""): void {
  for (const k of [...memoria.keys()]) if (k.startsWith(prefijo)) memoria.delete(k);
}
