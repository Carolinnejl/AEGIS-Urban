import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { useAuth } from "../../context/AuthContext";
import { useAuthStore } from "../../store/authStore";
import { useVerificacionStore } from "../../store/verificacionStore";
import {
  verificacionApi, soloCodigo, type CanalVerificacion, type EstadoVerificacion,
} from "../../services/verificacion";
import styles from "./VerifyPage.module.css";

const ESPERA_S = 30;
const mensajeDe = (e: unknown, defecto: string) =>
  isAxiosError(e) && e.response?.data?.error ? String(e.response.data.error) : defecto;

interface TarjetaProps {
  canal: CanalVerificacion;
  titulo: string;
  icono: string;
  verificado: boolean;
  /** true = el mensaje es simulado (se muestra en pantalla); false = se envió de verdad. */
  simulado: boolean;
  destino: string | null;
  onEstado: (e: EstadoVerificacion) => void;
}

/** Un canal (email o celular): muestra el mensaje "recibido" (simulado), pide el código y permite reenviar. */
function TarjetaCanal({ canal, titulo, icono, verificado, simulado, destino, onEstado }: TarjetaProps) {
  const emitido = useVerificacionStore((s) => s.codigos[canal]);
  const guardar = useVerificacionStore((s) => s.guardar);
  const aviso = useVerificacionStore((s) => s.avisos[canal]);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return;
    const id = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [espera]);

  async function confirmar() {
    setError(null); setCargando(true);
    try { onEstado(await verificacionApi.confirmar(canal, codigo)); setCodigo(""); }
    catch (e) { setError(mensajeDe(e, "No se pudo confirmar el código")); }
    finally { setCargando(false); }
  }

  async function reenviar() {
    setError(null); setCargando(true);
    try { guardar(await verificacionApi.reenviar(canal)); setCodigo(""); setEspera(ESPERA_S); }
    catch (e) { setError(mensajeDe(e, "No se pudo pedir un código nuevo")); }
    finally { setCargando(false); }
  }

  return (
    <section className={`${styles.canal} ${verificado ? styles.ok : ""}`} aria-label={titulo}>
      <header className={styles.canalHead}>
        <span className={styles.icono} aria-hidden="true">{icono}</span>
        <div>
          <h2>{titulo}</h2>
          <p className={styles.destino}>{destino ?? "—"}</p>
        </div>
        <span className={verificado ? styles.chipOk : styles.chipPend}>{verificado ? "VERIFICADO ✓" : "PENDIENTE"}</span>
      </header>

      {!verificado && (
        <>
          {simulado ? (
            // Bandeja / SMS de mentira: acá "llega" el mensaje con el código
            <div className={styles.bandeja} role="note">
              <small>{canal === "EMAIL" ? "📥 Bandeja de entrada (simulada)" : "💬 SMS (simulado)"}</small>
              {emitido?.codigoSimulado
                ? <p>Tu código de verificación de AEGIS Urban es <strong className={styles.codigo}>{emitido.codigoSimulado}</strong>. Vence en 10 minutos.</p>
                : <p className={styles.sinCodigo}>Todavía no hay un mensaje. Pedí un código nuevo para verlo acá.</p>}
            </div>
          ) : (
            // Correo real: el código NO se muestra acá, llega a la casilla de la persona
            <div className={styles.bandejaReal} role="note">
              <small>✉ Correo real</small>
              <p>{aviso ?? <>Te enviamos un código a <strong>{destino}</strong>. Puede tardar un minuto; revisá también la carpeta de spam.</>}</p>
            </div>
          )}

          <label htmlFor={`cod-${canal}`} className={styles.label}>Código de 6 dígitos</label>
          <div className={styles.fila}>
            <input id={`cod-${canal}`} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" maxLength={6}
              value={codigo} onChange={(e) => setCodigo(soloCodigo(e.target.value))}
              onKeyDown={(e) => { if (e.key === "Enter" && codigo.length === 6 && !cargando) void confirmar(); }}
              disabled={cargando} />
            <button className={styles.primario} onClick={() => void confirmar()} disabled={codigo.length !== 6 || cargando}>Confirmar</button>
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button className={styles.enlace} onClick={() => void reenviar()} disabled={cargando || espera > 0}>
            {espera > 0 ? `Pedir otro código en ${espera} s` : "Reenviar código"}
          </button>
        </>
      )}
    </section>
  );
}

export default function VerifyPage() {
  const navegar = useNavigate();
  const { cerrarSesion } = useAuth();
  const usuario = useAuthStore((s) => s.usuario);
  const [estado, setEstado] = useState<EstadoVerificacion | null>(null);
  const [falla, setFalla] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try { setEstado(await verificacionApi.estado()); setFalla(null); }
    catch (e) { setFalla(mensajeDe(e, "No se pudo consultar el estado de tu perfil")); }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  return (
    <div className={styles.page}>
      <main className={styles.caja}>
        <p className={styles.kicker}>AEGIS URBAN · VERIFICACIÓN</p>
        <h1>Verificá tu perfil{usuario ? `, ${usuario.username}` : ""}</h1>
        <p className={styles.intro}>Confirmá el código de tu correo y el de tu celular para completar tu cuenta.</p>

        <p className={styles.simulacion} role="note">
          {estado && !estado.emailSimulado ? (
            <><strong>Correo real, celular simulado:</strong> el código del correo se envía de verdad a tu casilla. En esta versión no se envía ningún SMS real: el código del celular aparece en el SMS simulado de abajo.</>
          ) : (
            <><strong>Modo simulación:</strong> en esta versión no se envía ningún correo ni SMS real. Los códigos aparecen en las bandejas simuladas de abajo, como pasaría con un proveedor de envío.</>
          )}
        </p>

        {falla && <p className={styles.error} role="alert">{falla} <button className={styles.enlace} onClick={() => void cargar()}>Reintentar</button></p>}

        {estado && (
          <>
            <TarjetaCanal canal="EMAIL" titulo="Correo electrónico" icono="✉" verificado={estado.emailVerificado}
              simulado={estado.emailSimulado} destino={estado.emailEnmascarado} onEstado={setEstado} />
            <TarjetaCanal canal="PHONE" titulo="Celular" icono="📱" verificado={estado.telefonoVerificado}
              simulado={estado.telefonoSimulado} destino={estado.telefonoEnmascarado} onEstado={setEstado} />

            {estado.verificado && (
              <section className={styles.listo} role="status">
                <h2>¡Perfil verificado!</h2>
                <p>Ya podés usar todas las funciones de tu cuenta.</p>
                <button className={styles.primario} onClick={() => navegar("/ciudadano", { replace: true })}>Ir a la vista ciudadana</button>
              </section>
            )}
          </>
        )}

        <footer className={styles.pie}>
          {estado?.verificado ? <span /> : <Link to="/ciudadano">Seguir sin verificar</Link>}
          <button className={styles.enlace} onClick={() => void cerrarSesion()}>Cerrar sesión</button>
        </footer>
      </main>
    </div>
  );
}
