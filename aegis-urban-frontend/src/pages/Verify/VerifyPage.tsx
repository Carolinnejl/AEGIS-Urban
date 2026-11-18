import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { useAuth } from "../../context/AuthContext";
import { useAuthStore } from "../../store/authStore";
import { useVerificacionStore } from "../../store/verificacionStore";
import LanguageSwitcher from "../../components/LanguageSwitcher/LanguageSwitcher";
import {
  verificacionApi, soloCodigo, type CanalVerificacion, type EstadoVerificacion,
} from "../../services/verificacion";
import styles from "./VerifyPage.module.css";

const ESPERA_S = 30;
// El servidor responde en español; si no hay mensaje se usa el texto traducido.
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
  const { t } = useTranslation();
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
    catch (e) { setError(mensajeDe(e, t("verificacion.errConfirmar"))); }
    finally { setCargando(false); }
  }

  async function reenviar() {
    setError(null); setCargando(true);
    try { guardar(await verificacionApi.reenviar(canal)); setCodigo(""); setEspera(ESPERA_S); }
    catch (e) { setError(mensajeDe(e, t("verificacion.errReenviar"))); }
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
        <span className={verificado ? styles.chipOk : styles.chipPend}>{verificado ? t("verificacion.verificado") : t("verificacion.pendiente")}</span>
      </header>

      {!verificado && (
        <>
          {simulado ? (
            // Bandeja / SMS de mentira: acá "llega" el mensaje con el código
            <div className={styles.bandeja} role="note">
              <small>{canal === "EMAIL" ? t("verificacion.bandejaSim") : t("verificacion.smsSim")}</small>
              {emitido?.codigoSimulado
                ? <p><Trans i18nKey="verificacion.mensajeCodigo" values={{ codigo: emitido.codigoSimulado }} components={[<span key="0" />, <strong key="1" className={styles.codigo} />]} /></p>
                : <p className={styles.sinCodigo}>{t("verificacion.sinMensaje")}</p>}
            </div>
          ) : (
            // Correo real: el código NO se muestra acá, llega a la casilla de la persona
            <div className={styles.bandejaReal} role="note">
              <small>{t("verificacion.correoReal")}</small>
              <p>{aviso ?? <Trans i18nKey="verificacion.correoRealTexto" values={{ destino }} components={[<span key="0" />, <strong key="1" />]} />}</p>
            </div>
          )}

          <label htmlFor={`cod-${canal}`} className={styles.label}>{t("verificacion.codigo")}</label>
          <div className={styles.fila}>
            <input id={`cod-${canal}`} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" maxLength={6}
              value={codigo} onChange={(e) => setCodigo(soloCodigo(e.target.value))}
              onKeyDown={(e) => { if (e.key === "Enter" && codigo.length === 6 && !cargando) void confirmar(); }}
              disabled={cargando} />
            <button className={styles.primario} onClick={() => void confirmar()} disabled={codigo.length !== 6 || cargando}>{t("verificacion.confirmar")}</button>
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button className={styles.enlace} onClick={() => void reenviar()} disabled={cargando || espera > 0}>
            {espera > 0 ? t("verificacion.reenviarEn", { s: espera }) : t("verificacion.reenviar")}
          </button>
        </>
      )}
    </section>
  );
}

export default function VerifyPage() {
  const { t } = useTranslation();
  const navegar = useNavigate();
  const { cerrarSesion } = useAuth();
  const usuario = useAuthStore((s) => s.usuario);
  const [estado, setEstado] = useState<EstadoVerificacion | null>(null);
  const [falla, setFalla] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try { setEstado(await verificacionApi.estado()); setFalla(null); }
    catch (e) { setFalla(mensajeDe(e, t("verificacion.errEstado"))); }
  }, [t]);
  useEffect(() => { void cargar(); }, [cargar]);

  return (
    <div className={styles.page}>
      <LanguageSwitcher flotante />
      <main className={styles.caja}>
        <p className={styles.kicker}>{t("verificacion.kicker")}</p>
        <h1>{t("verificacion.titulo")}{usuario ? `, ${usuario.username}` : ""}</h1>
        <p className={styles.intro}>{t("verificacion.intro")}</p>

        <p className={styles.simulacion} role="note">
          <Trans i18nKey={estado && !estado.emailSimulado ? "verificacion.simulacionParcial" : "verificacion.simulacionTotal"}
            components={[<span key="0" />, <strong key="1" />]} />
        </p>

        {falla && <p className={styles.error} role="alert">{falla} <button className={styles.enlace} onClick={() => void cargar()}>{t("verificacion.reintentar")}</button></p>}

        {estado && (
          <>
            <TarjetaCanal canal="EMAIL" titulo={t("verificacion.correo")} icono="✉" verificado={estado.emailVerificado}
              simulado={estado.emailSimulado} destino={estado.emailEnmascarado} onEstado={setEstado} />
            <TarjetaCanal canal="PHONE" titulo={t("verificacion.celular")} icono="📱" verificado={estado.telefonoVerificado}
              simulado={estado.telefonoSimulado} destino={estado.telefonoEnmascarado} onEstado={setEstado} />

            {estado.verificado && (
              <section className={styles.listo} role="status">
                <h2>{t("verificacion.listo")}</h2>
                <p>{t("verificacion.listoTexto")}</p>
                <button className={styles.primario} onClick={() => navegar("/ciudadano", { replace: true })}>{t("verificacion.irCiudadana")}</button>
              </section>
            )}
          </>
        )}

        <footer className={styles.pie}>
          {estado?.verificado ? <span /> : <Link to="/ciudadano">{t("verificacion.seguirSin")}</Link>}
          <button className={styles.enlace} onClick={() => void cerrarSesion()}>{t("verificacion.salir")}</button>
        </footer>
      </main>
    </div>
  );
}
