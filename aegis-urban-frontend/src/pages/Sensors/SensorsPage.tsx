import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Sidebar from "../../components/Layout/Sidebar";
import { useWebSocket } from "../../hooks/useWebSocket";
import api from "../../services/api";
import { usePatente } from "../../store/authStore";
import styles from "./SensorsPage.module.css";

interface Sensor {
  id_sensor:        number;
  serial_code:      string;
  sensor_type_code: string;
  sensor_unit:      string;
  city_node_name:   string;
  status:           string;
  lat:              number;
  lon:              number;
  is_simulated:     boolean;
  last_value:       number | null;
  last_status:      string | null;
  last_reading_at:  string | null;
}

const TIPO_ICON: Record<string, string> = {
  FLOOD:       "💧",
  FIRE:        "🔥",
  WIND:        "💨",
  AIR_QUALITY: "🌫",
};

function badgeEstado(estado: string | null) {
  if (!estado) return "ok";
  return estado.toLowerCase();
}

export default function SensorsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage?.startsWith("en") ? "en-GB" : "es-AR";
  const { conectado, ultimaLectura } = useWebSocket();
  const puedeSimular = usePatente("SENSOR_SIMULATE");
  const [sensores, setSensores]      = useState<Sensor[]>([]);
  const [cargando, setCargando]      = useState(true);
  const [errorCarga, setErrorCarga]  = useState(false);
  const [errorAccion, setErrorAccion] = useState(false);
  const [filtroTipo, setFiltroTipo]  = useState<string>("TODOS");
  const [simulando, setSimulando]    = useState<number | null>(null);
  const [flash, setFlash]            = useState<Set<number>>(new Set());

  const cargarSensores = useCallback(async () => {
    try {
      const res = await api.get<{ sensores: Sensor[] }>("/sensores");
      setSensores(res.data.sensores);
      setErrorCarga(false);
    } catch {
      setErrorCarga(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarSensores(); }, [cargarSensores]);

  // Actualiza el sensor que recibió la lectura vía WebSocket
  useEffect(() => {
    if (!ultimaLectura) return;
    setSensores(prev => prev.map(s =>
      s.id_sensor === ultimaLectura.idSensor
        ? { ...s, last_value: ultimaLectura.valor, last_status: ultimaLectura.estadoLectura, last_reading_at: ultimaLectura.registradaEn }
        : s
    ));
    setFlash(prev => new Set(prev).add(ultimaLectura.idSensor));
    setTimeout(() => setFlash(prev => {
      const next = new Set(prev);
      next.delete(ultimaLectura.idSensor);
      return next;
    }), 1500);
  }, [ultimaLectura]);

  const simular = async (id: number) => {
    setSimulando(id);
    setErrorAccion(false);
    try {
      await api.post(`/sensores/${id}/simular`);
    } catch {
      setErrorAccion(true);
    } finally {
      setSimulando(null);
    }
  };

  const tipos = ["TODOS", "FLOOD", "FIRE", "WIND", "AIR_QUALITY"];
  const filtrados = filtroTipo === "TODOS"
    ? sensores
    : sensores.filter(s => s.sensor_type_code === filtroTipo);

  const resumen = {
    ok:       sensores.filter(s => !s.last_status || s.last_status === "OK").length,
    warning:  sensores.filter(s => s.last_status === "WARNING").length,
    critical: sensores.filter(s => s.last_status === "CRITICAL").length,
  };

  return (
    <div className={styles.page}>
      <Sidebar />
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h1 className={styles.pageTitle}>{t("gestion.sensores.titulo")}</h1>
            <p className={styles.subtitle}>{t("gestion.sensores.subtitulo")}</p>
          </div>
          <div className={styles.topbarRight}>
            <span className={`${styles.wsBadge} ${conectado ? styles.wsOn : styles.wsOff}`}>
              {conectado ? t("gestion.comun.live") : t("gestion.comun.offline")}
            </span>
            <button onClick={cargarSensores} className={styles.refreshBtn} title={t("gestion.comun.actualizar")}>↻</button>
          </div>
        </header>

        {(errorCarga || errorAccion) && <div className={styles.errorBanner} role="alert">
          <span>{errorCarga ? t("gestion.sensores.errCarga") : t("gestion.sensores.errLectura")}</span>
          <button onClick={errorCarga ? cargarSensores : () => setErrorAccion(false)}>
            {errorCarga ? t("gestion.comun.reintentar") : t("gestion.comun.cerrar")}
          </button>
        </div>}

        {/* Resumen */}
        <div className={styles.resumenGrid}>
          <div className={`${styles.resumenCard} ${styles["resumenCard--ok"]}`}>
            <span className={styles.resumenVal}>{resumen.ok}</span>
            <span className={styles.resumenLabel}>{t("gestion.sensores.resumen.normales")}</span>
          </div>
          <div className={`${styles.resumenCard} ${styles["resumenCard--warning"]}`}>
            <span className={styles.resumenVal}>{resumen.warning}</span>
            <span className={styles.resumenLabel}>{t("gestion.sensores.resumen.advertencia")}</span>
          </div>
          <div className={`${styles.resumenCard} ${styles["resumenCard--critical"]}`}>
            <span className={styles.resumenVal}>{resumen.critical}</span>
            <span className={styles.resumenLabel}>{t("gestion.sensores.resumen.criticos")}</span>
          </div>
          <div className={`${styles.resumenCard} ${styles["resumenCard--total"]}`}>
            <span className={styles.resumenVal}>{sensores.length}</span>
            <span className={styles.resumenLabel}>{t("gestion.sensores.resumen.total")}</span>
          </div>
        </div>

        {/* Filtros */}
        <div className={styles.filtros}>
          {tipos.map(tipo => (
            <button
              key={tipo}
              onClick={() => setFiltroTipo(tipo)}
              className={`${styles.filtroBtn} ${filtroTipo === tipo ? styles.filtroBtnActive : ""}`}
            >
              {tipo === "TODOS" ? t("gestion.comun.todos") : `${TIPO_ICON[tipo]} ${t(`tipos.${tipo}`)}`}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div className={styles.panelWrap}>
          {cargando ? (
            <div className={styles.loading}>{t("gestion.sensores.cargando")}</div>
          ) : (
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th>{t("gestion.sensores.tabla.tipo")}</th>
                  <th>{t("gestion.sensores.tabla.serial")}</th>
                  <th>{t("gestion.sensores.tabla.distrito")}</th>
                  <th>{t("gestion.sensores.tabla.estado")}</th>
                  <th>{t("gestion.sensores.tabla.ultima")}</th>
                  <th>{t("gestion.sensores.tabla.acciones")}</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? <tr><td colSpan={6} className={styles.sinLectura}>{t("gestion.sensores.vacio")}</td></tr> : filtrados.map(s => (
                  <tr key={s.id_sensor} className={flash.has(s.id_sensor) ? styles.flashRow : ""}>
                    <td>
                      <span className={styles.tipoChip}>
                        {TIPO_ICON[s.sensor_type_code]} {t(`tipos.${s.sensor_type_code}`, { defaultValue: s.sensor_type_code })}
                      </span>
                    </td>
                    <td className={styles.monoCell}>{s.serial_code}</td>
                    <td>{s.city_node_name}</td>
                    <td>
                      <span className={`${styles.estadoBadge} ${styles[`estadoBadge--${badgeEstado(s.last_status)}`]}`}>
                        {s.last_status ?? t("gestion.sensores.sinDatos")}
                      </span>
                    </td>
                    <td className={styles.lecturaCell}>
                      {s.last_value != null ? (
                        <>
                          <span className={styles.lecturaVal}>{parseFloat(String(s.last_value)).toFixed(1)}</span>
                          <span className={styles.lecturaUnit}> {s.sensor_unit}</span>
                          <small className={styles.lecturaTime}>{s.last_reading_at
                            ? new Date(s.last_reading_at).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })
                            : t("gestion.sensores.sinHora")}</small>
                        </>
                      ) : <span className={styles.sinLectura}>{t("gestion.sensores.sinLecturas")}</span>}
                    </td>
                    <td>
                      {(s.status === "SIMULATED" || s.is_simulated) ? (puedeSimular ? <button
                        className={styles.simularBtn}
                        onClick={() => simular(s.id_sensor)}
                        disabled={simulando === s.id_sensor}
                        title={t("gestion.sensores.forzar")}
                      >
                        {simulando === s.id_sensor ? "…" : t("gestion.sensores.simular")}
                      </button> : <span className={styles.sinLectura}>{t("gestion.sensores.soloRoles")}</span>)
                        : <span className={styles.sinLectura}>{t("gestion.sensores.real")}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
