import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import HelpTooltip from "../../components/HelpTooltip/HelpTooltip";
import Sidebar from "../../components/Layout/Sidebar";
import { useWebSocket } from "../../hooks/useWebSocket";
import api from "../../services/api";
import { conCache } from "../../services/cache";
import { usePatente } from "../../store/authStore";
import styles from "./AlertsPage.module.css";

interface Alerta {
  id_alert:       number;
  level:          string;
  alert_type:     string;
  message:        string;
  status:         string;
  created_at:     string;
  updated_at:     string;
  serial_code:    string;
  lat:            number;
  lon:            number;
  sensor_type:    string;
  city_node_name: string;
  id_city_node: number;
}
interface Zona { id_node: number; name: string; node_type: string }
interface Paginacion { page: number; pageSize: number; total: number; totalPages: number }

/** Plan tal como lo devuelve POST /alertas/:id/evacuar. */
interface PlanEvacuacion {
  estrategiaUsada:    string;
  personasEstimadas:  number;
  instrucciones:      string;
  radioMetros:        number;
  zona:               string;
  idSensor:           number;
  tipoAlerta:         string;
  centro:             { lat: number; lon: number };
  puntosEncuentro:    { nombre: string; lat: number; lon: number }[];
}

const NIVEL_CONFIG: Record<string, { cls: string }> = {
  WARNING:      { cls: "medium" },
  CRITICAL:     { cls: "high" },
  CATASTROPHIC: { cls: "critical" },
};

const TIPO_ICON: Record<string, string> = {
  FLOOD: "💧", FIRE: "🔥", WIND: "💨", AIR_QUALITY: "🌫", POWER_OUT: "⚡",
};

export default function AlertsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage?.startsWith("en") ? "en-GB" : "es-AR";
  const { conectado, ultimaAlerta } = useWebSocket();
  const puedeOperar = usePatente("ALERT_ACKNOWLEDGE");
  const [alertas, setAlertas]       = useState<Alerta[]>([]);
  const [cargando, setCargando]     = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [filtro, setFiltro]         = useState<"TODOS" | "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED">("TODOS");
  const [filtroNivel, setFiltroNivel] = useState("TODOS");
  const [busqueda, setBusqueda]     = useState("");
  const [accionando, setAccionando] = useState<number | null>(null);
  const [plan, setPlan]             = useState<PlanEvacuacion | null>(null);
  const [planAlertaId, setPlanAlertaId] = useState<number | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [zonaId, setZonaId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [pagina, setPagina] = useState<Paginacion>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });

  const cargarAlertas = useCallback(async () => {
    try {
      const params = { page: pagina.page, pageSize: pagina.pageSize, zonaId: zonaId || undefined,
        desde: desde || undefined, hasta: hasta || undefined, estado: filtro === "TODOS" ? undefined : filtro,
        nivel: filtroNivel === "TODOS" ? undefined : filtroNivel, busqueda: busqueda.trim() || undefined };
      const res = await api.get<{ alertas: Alerta[]; paginacion: Paginacion }>("/alertas", { params });
      setAlertas(res.data.alertas);
      setPagina(res.data.paginacion);
      setErrorCarga(false);
    } catch {
      setErrorCarga(true);
    } finally {
      setCargando(false);
    }
  }, [pagina.page, pagina.pageSize, zonaId, desde, hasta, filtro, filtroNivel, busqueda]);

  useEffect(() => { void conCache("alertas:zonas", 5 * 60_000, () => api.get<{ zonas: Zona[] }>("/alertas/zonas").then(r => r.data.zonas)).then(setZonas).catch(() => undefined); }, []);
  useEffect(() => { cargarAlertas(); }, [cargarAlertas]);
  useEffect(() => { if (ultimaAlerta) cargarAlertas(); }, [ultimaAlerta, cargarAlertas]);

  const reconocer = async (id: number) => {
    setAccionando(id);
    setErrorAccion(null);
    try {
      await api.patch(`/alertas/${id}/reconocer`);
      setAlertas(prev => prev.map(a =>
        a.id_alert === id ? { ...a, status: "ACKNOWLEDGED" } : a
      ));
    } catch {
      setErrorAccion(t("gestion.alertas.errReconocer"));
    } finally {
      setAccionando(null);
    }
  };

  const evacuar = async (id: number) => {
    setAccionando(id);
    setErrorAccion(null);
    try {
      const res = await api.post<{ plan: PlanEvacuacion }>(`/alertas/${id}/evacuar`);
      setPlan(res.data.plan);
      setPlanAlertaId(id);
    } catch {
      setErrorAccion(t("gestion.alertas.errEvacuar"));
    } finally {
      setAccionando(null);
    }
  };

  const resolver = async (id: number) => {
    setAccionando(id);
    setErrorAccion(null);
    try {
      await api.patch(`/alertas/${id}/resolver`);
      setAlertas(prev => prev.map(a => a.id_alert === id ? { ...a, status: "RESOLVED" } : a));
    } catch {
      setErrorAccion(t("gestion.alertas.errResolver"));
    } finally {
      setAccionando(null);
    }
  };

  const filtradas = alertas;
  const cambiarFiltro = (actualizar: () => void) => { actualizar(); setPagina(p => ({ ...p, page: 1 })); };

  const conteo = {
    active:       alertas.filter(a => a.status === "ACTIVE").length,
    acknowledged: alertas.filter(a => a.status === "ACKNOWLEDGED").length,
    resolved:     alertas.filter(a => a.status === "RESOLVED").length,
    critical:     alertas.filter(a => ["CRITICAL", "CATASTROPHIC"].includes(a.level) && a.status !== "RESOLVED").length,
  };

  return (
    <div className={styles.page}>
      <Sidebar />
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h1 className={styles.pageTitle}>{t("gestion.alertas.titulo")}<HelpTooltip texto={t("ayuda.tooltips.evacuar")} /></h1>
            <p className={styles.subtitle}>{t("gestion.alertas.subtitulo")}</p>
          </div>
          <div className={styles.topbarRight}>
            <span className={`${styles.wsBadge} ${conectado ? styles.wsOn : styles.wsOff}`}>
              {conectado ? t("gestion.comun.live") : t("gestion.comun.offline")}
            </span>
            <button onClick={cargarAlertas} className={styles.refreshBtn} title={t("gestion.comun.actualizar")}>↻</button>
          </div>
        </header>

        {/* Resumen */}
        <div className={styles.resumenGrid}>
          <div className={`${styles.resumenCard} ${styles["resumenCard--danger"]}`}>
            <span className={styles.resumenVal}>{conteo.active}</span>
            <span className={styles.resumenLabel}>{t("gestion.alertas.resumen.activas")}</span>
          </div>
          <div className={`${styles.resumenCard} ${styles["resumenCard--critical"]}`}>
            <span className={styles.resumenVal}>{conteo.critical}</span>
            <span className={styles.resumenLabel}>{t("gestion.alertas.resumen.criticas")}</span>
          </div>
          <div className={`${styles.resumenCard} ${styles["resumenCard--warning"]}`}>
            <span className={styles.resumenVal}>{conteo.acknowledged}</span>
            <span className={styles.resumenLabel}>{t("gestion.alertas.resumen.reconocidas")}</span>
          </div>
          <div className={`${styles.resumenCard} ${styles["resumenCard--ok"]}`}>
            <span className={styles.resumenVal}>{conteo.resolved}</span>
            <span className={styles.resumenLabel}>{t("gestion.alertas.resumen.resueltas")}</span>
          </div>
        </div>

        {/* Filtros */}
        {errorAccion && <div className={styles.actionError} role="alert">{errorAccion}</div>}
        <div className={styles.filtros}>
          {(["TODOS", "ACTIVE", "ACKNOWLEDGED", "RESOLVED"] as const).map(f => (
            <button
              key={f}
              onClick={() => cambiarFiltro(() => setFiltro(f))}
              className={`${styles.filtroBtn} ${filtro === f ? styles.filtroBtnActive : ""}`}
            >
              {f === "TODOS" ? t("gestion.alertas.filtros.todas") : f === "ACTIVE" ? t("gestion.alertas.filtros.activas") : f === "ACKNOWLEDGED" ? t("gestion.alertas.filtros.reconocidas") : t("gestion.alertas.filtros.resueltas")}
            </button>
          ))}
        </div>

        <div className={styles.filtroDetalle}>
          <label className={styles.busquedaWrap}>
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={busqueda}
              onChange={e => cambiarFiltro(() => setBusqueda(e.target.value))}
              placeholder={t("gestion.alertas.buscar")}
              aria-label={t("gestion.alertas.buscarAria")}
            />
          </label>
          <label className={styles.nivelSelectWrap}>
            <span>{t("gestion.alertas.severidad")}</span>
            <select value={filtroNivel} onChange={e => cambiarFiltro(() => setFiltroNivel(e.target.value))} aria-label={t("gestion.alertas.severidadAria")}>
              <option value="TODOS">{t("gestion.comun.todas")}</option>
              <option value="WARNING">{t("gestion.alertas.nivelesSel.WARNING")}</option>
              <option value="CRITICAL">{t("gestion.alertas.nivelesSel.CRITICAL")}</option>
              <option value="CATASTROPHIC">{t("gestion.alertas.nivelesSel.CATASTROPHIC")}</option>
            </select>
          </label>
          <label className={styles.nivelSelectWrap}><span>{t("gestion.alertas.zona")}</span><select value={zonaId} onChange={e => cambiarFiltro(() => setZonaId(e.target.value))}>
            <option value="">{t("gestion.comun.todas")}</option>{zonas.map(z => <option key={z.id_node} value={z.id_node}>{z.name} · {z.node_type}</option>)}
          </select></label>
          <label className={styles.nivelSelectWrap}><span>{t("gestion.alertas.desde")}</span><input type="date" value={desde} onChange={e => cambiarFiltro(() => setDesde(e.target.value))}/></label>
          <label className={styles.nivelSelectWrap}><span>{t("gestion.alertas.hasta")}</span><input type="date" value={hasta} onChange={e => cambiarFiltro(() => setHasta(e.target.value))}/></label>
          <span className={styles.resultadosFiltro}>{t("gestion.alertas.total", { n: pagina.total })}</span>
        </div>

        {/* Lista de alertas */}
        <div className={styles.alertasList}>
          {errorCarga && alertas.length === 0 ? (
            <div className={styles.empty}>
              <p>{t("gestion.alertas.errorCarga")}</p>
              <button className={styles.filtroBtn} onClick={cargarAlertas}>{t("gestion.comun.reintentar")}</button>
            </div>
          ) : cargando ? (
            <div className={styles.empty}>{t("gestion.alertas.cargando")}</div>
          ) : filtradas.length === 0 ? (
            <div className={styles.empty}>
              <p>{t("gestion.alertas.vacio")}</p>
              <small>{t("gestion.alertas.vacioSub")}</small>
            </div>
          ) : (
            filtradas.map(a => {
              const nivel = { label: t(`gestion.alertas.niveles.${a.level}`, { defaultValue: a.level }), cls: NIVEL_CONFIG[a.level]?.cls ?? "info" };
              return (
                <div key={a.id_alert} className={`${styles.alertaCard} ${styles[`alertaCard--${nivel.cls}`]}`}>
                  <div className={styles.alertaHeader}>
                    <div className={styles.alertaHeaderLeft}>
                      <span className={`${styles.nivelBadge} ${styles[`nivelBadge--${nivel.cls}`]}`}>
                        {nivel.label}
                      </span>
                      <span className={styles.alertaTipo}>
                        {TIPO_ICON[a.sensor_type] ?? "📡"} {t(`tipos.${a.alert_type}`, { defaultValue: a.alert_type })}
                      </span>
                      <span className={styles.alertaDistrito}>{a.city_node_name}</span>
                    </div>
                    <div className={styles.alertaHeaderRight}>
                      <span className={`${styles.statusBadge} ${styles[`statusBadge--${a.status.toLowerCase()}`]}`}>
                        {t(`gestion.alertas.estados.${a.status}`, { defaultValue: a.status })}
                      </span>
                      <span className={styles.alertaTime}>
                        {new Date(a.created_at).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>
                  </div>
                  <p className={styles.alertaMensaje}>{a.message}</p>
                  <div className={styles.alertaFooter}>
                    <span className={styles.alertaSerial}>📡 {a.serial_code}</span>
                    {puedeOperar && a.status !== "RESOLVED" && (
                      <div className={styles.alertaAcciones}>
                        {a.status === "ACTIVE" && <button
                          className={styles.btnReconocer}
                          onClick={() => reconocer(a.id_alert)}
                          disabled={accionando === a.id_alert}
                        >
                          {accionando === a.id_alert ? "…" : t("gestion.alertas.reconocer")}
                        </button>}
                        <button
                          className={styles.btnEvacuar}
                          onClick={() => evacuar(a.id_alert)}
                          disabled={accionando === a.id_alert}
                        >
                          {accionando === a.id_alert ? "…" : t("gestion.alertas.evacuar")}
                        </button>
                        {a.status === "ACKNOWLEDGED" && <button
                          className={styles.btnReconocer}
                          onClick={() => resolver(a.id_alert)}
                          disabled={accionando === a.id_alert}
                        >
                          {accionando === a.id_alert ? "…" : t("gestion.alertas.resolver")}
                        </button>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className={styles.filtros} aria-label={t("gestion.alertas.paginacion")}>
          <button className={styles.filtroBtn} disabled={pagina.page <= 1} onClick={() => setPagina(p => ({ ...p, page: p.page - 1 }))}>{t("gestion.alertas.anterior")}</button>
          <span className={styles.resultadosFiltro}>{t("gestion.alertas.pagina", { p: pagina.page, t: Math.max(1, pagina.totalPages) })}</span>
          <button className={styles.filtroBtn} disabled={pagina.page >= pagina.totalPages} onClick={() => setPagina(p => ({ ...p, page: p.page + 1 }))}>{t("gestion.alertas.siguiente")}</button>
        </div>

        {/* Modal plan de evacuación */}
        {plan && (() => {
          const pasos = t(`gestion.alertas.plan.pasos.${plan.estrategiaUsada}`, {
            returnObjects: true, radio: plan.radioMetros, radioKm: plan.radioMetros / 1000, sensor: plan.idSensor,
          }) as unknown;
          return (
            <div className={styles.modalBackdrop} onClick={() => setPlan(null)}>
              <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2 className={styles.modalTitle}>{t("gestion.alertas.plan.titulo")}</h2>
                  <button className={styles.modalClose} onClick={() => setPlan(null)} aria-label={t("gestion.comun.cerrar")}>✕</button>
                </div>
                <div className={styles.modalBody}>
                  <div className={styles.planRow}>
                    <span className={styles.planLabel}>{t("gestion.alertas.plan.estrategia")}</span>
                    <span className={styles.planVal}>{t(`gestion.alertas.plan.estrategias.${plan.estrategiaUsada}`, { defaultValue: plan.estrategiaUsada })}</span>
                  </div>
                  <div className={styles.planRow}>
                    <span className={styles.planLabel}>{t("gestion.alertas.plan.zona")}</span>
                    <span className={styles.planVal}>{plan.zona}</span>
                  </div>
                  <div className={styles.planRow}>
                    <span className={styles.planLabel}>{t("gestion.alertas.plan.sensor")}</span>
                    <span className={styles.planVal}>#{plan.idSensor} · {t(`tipos.${plan.tipoAlerta}`, { defaultValue: plan.tipoAlerta })}</span>
                  </div>
                  <div className={styles.planRow}>
                    <span className={styles.planLabel}>{t("gestion.alertas.plan.personas")}</span>
                    <span className={styles.planVal}>{plan.personasEstimadas.toLocaleString(locale)}</span>
                  </div>
                  <div className={styles.planRow}>
                    <span className={styles.planLabel}>{t("gestion.alertas.plan.radio")}</span>
                    <span className={styles.planVal}>{t("gestion.alertas.plan.metros", { n: plan.radioMetros })}</span>
                  </div>
                  <div className={styles.planRow}>
                    <span className={styles.planLabel}>{t("gestion.alertas.plan.centro")}</span>
                    <span className={styles.planVal}>{plan.centro.lat.toFixed(4)}, {plan.centro.lon.toFixed(4)}</span>
                  </div>
                  {plan.puntosEncuentro.length > 0 && (
                    <div className={styles.planRow}>
                      <span className={styles.planLabel}>{t("gestion.alertas.plan.puntos")}</span>
                      <span className={styles.planVal}>{plan.puntosEncuentro.map(p => p.nombre).join(", ")}</span>
                    </div>
                  )}
                  <div className={styles.instruccionesTitle}>{t("gestion.alertas.plan.instrucciones")}:</div>
                  <ol className={styles.instrucciones}>
                    {(Array.isArray(pasos) ? (pasos as string[]) : [plan.instrucciones]).map((inst, i) => <li key={i}>{inst}</li>)}
                  </ol>
                  <div className={styles.planAlertaId}>{t("gestion.alertas.plan.nota", { id: planAlertaId })}</div>
                  <div className={styles.planAlertaId}>{t("gestion.alertas.plan.supuesto")}</div>
                </div>
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
}
