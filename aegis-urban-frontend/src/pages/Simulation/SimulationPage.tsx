import { useEffect, useState, useCallback, useRef, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import HelpTooltip from "../../components/HelpTooltip/HelpTooltip";
import Sidebar from "../../components/Layout/Sidebar";
import { useWebSocket } from "../../hooks/useWebSocket";
import api from "../../services/api";
import { usePatente } from "../../store/authStore";
import styles from "./SimulationPage.module.css";

interface Sensor {
  id_sensor:        number;
  serial_code:      string;
  sensor_type_code: string;
  sensor_unit:      string;
  status:           string;
  is_simulated:     boolean;
  city_node_name:   string;
  last_value:       number | null;
  last_status:      string | null;
}

interface RespuestaSimulacion {
  mensaje: string;
  tipo:    string;
  valor:   number;
}

interface ResultadoSimulacion {
  idSensor: number;
  tipo:     string;
  valor:    number;
}
interface Escenario { id_scenario: number; name: string; scenario_type: string; status: string; config: { sensorIds?: number[]; intensidad?: string; duracionMinutos?: number } }

const TIPO_ICON: Record<string, string> = {
  FLOOD: "💧", FIRE: "🔥", WIND: "💨", AIR_QUALITY: "🌫",
};

const ESTRATEGIAS = [
  { nombre: "EstrategiaZonal",   clave: "zonal",   icono: "🏘", color: "high" },
  { nombre: "EstraategiaMasiva", clave: "masiva",  icono: "🏙", color: "critical" },
  { nombre: "EstrategiaRefugio", clave: "refugio", icono: "🏠", color: "safe" },
] as const;

export default function SimulationPage() {
  const { t } = useTranslation();
  const { conectado, ultimaLectura } = useWebSocket();
  const puedeSimular = usePatente("SIMULATION_SCENARIOS_CREATE");
  const [sensores, setSensores]       = useState<Sensor[]>([]);
  const [simulando, setSimulando]     = useState<number | "todos" | null>(null);
  const [resultados, setResultados]   = useState<ResultadoSimulacion[]>([]);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  const [errorLista, setErrorLista] = useState(false);
  const [ciclo, setCiclo]             = useState(0);
  const [countdown, setCountdown]     = useState(15);
  const [escenarios, setEscenarios] = useState<Escenario[]>([]);
  const [nombreEscenario, setNombreEscenario] = useState(() => t("gestion.simulacion.nombreDefecto"));
  const [sensoresEscenario, setSensoresEscenario] = useState<number[]>([]);
  const [intensidad, setIntensidad] = useState("WARNING");
  const [intervaloSegundos, setIntervaloSegundos] = useState(15);
  const [duracionMinutos, setDuracionMinutos] = useState(5);
  const [guardandoEscenario, setGuardandoEscenario] = useState(false);
  const countdownRef                  = useRef<ReturnType<typeof setInterval> | null>(null);

  const cargarSensores = useCallback(async () => {
    setErrorLista(false);
    try {
      const res = await api.get<{ sensores: Sensor[] }>("/sensores");
      setSensores(res.data.sensores.filter(s => s.status === "SIMULATED" || s.is_simulated));
      setErrorMensaje(null);
    } catch {
      setErrorLista(true);
      setErrorMensaje(t("gestion.simulacion.errLista"));
    }
  }, []);

  useEffect(() => { cargarSensores(); }, [cargarSensores]);

  const cargarEscenarios = useCallback(async () => {
    try { const r = await api.get<{ escenarios: Escenario[] }>("/simulation/scenarios"); setEscenarios(r.data.escenarios); } catch { /* visibles al siguiente intento */ }
  }, []);
  useEffect(() => { void cargarEscenarios(); }, [cargarEscenarios]);

  const crearEscenario = async (e: FormEvent) => {
    e.preventDefault();
    setGuardandoEscenario(true); setErrorMensaje(null);
    try {
      const creado = await api.post<{ escenario: Escenario }>("/simulation/scenarios", {
        name: nombreEscenario, sensorIds: sensoresEscenario, intensidad, intervaloSegundos, duracionMinutos,
      });
      await api.post(`/simulation/scenarios/${creado.data.escenario.id_scenario}/iniciar`);
      await cargarEscenarios();
    } catch { setErrorMensaje(t("gestion.simulacion.errIniciar")); }
    finally { setGuardandoEscenario(false); }
  };

  const detenerEscenario = async (id: number) => {
    try { await api.delete(`/simulation/scenarios/${id}`); await cargarEscenarios(); }
    catch { setErrorMensaje(t("gestion.simulacion.errDetener")); }
  };

  // Countdown del motor (cada 15s el backend ejecuta un ciclo)
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCiclo(c => c + 1);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  // Cuando llega una lectura WS, reinicia el countdown visual
  useEffect(() => {
    if (ultimaLectura) {
      setCountdown(15);
      setCiclo(c => c + 1);
    }
  }, [ultimaLectura]);

  const simularSensor = async (id: number) => {
    setSimulando(id);
    setErrorMensaje(null);
    try {
      const res = await api.post<RespuestaSimulacion>(`/sensores/${id}/simular`);
      setResultados(prev => [{ idSensor: id, tipo: res.data.tipo, valor: res.data.valor }, ...prev.slice(0, 19)]);
    } catch {
      setErrorMensaje(t("gestion.simulacion.errSimular"));
    } finally {
      setSimulando(null);
    }
  };

  const simularTodos = async () => {
    setSimulando("todos");
    setErrorMensaje(null);
    const resultadosBatch: ResultadoSimulacion[] = [];
    let fallos = 0;
    for (const s of sensores) {
      try {
        const res = await api.post<RespuestaSimulacion>(`/sensores/${s.id_sensor}/simular`);
        resultadosBatch.push({ idSensor: s.id_sensor, tipo: res.data.tipo, valor: res.data.valor });
      } catch { fallos += 1; }
    }
    setResultados(prev => [...resultadosBatch, ...prev].slice(0, 20));
    if (fallos) setErrorMensaje(t("gestion.simulacion.errVarios", { n: fallos }));
    setSimulando(null);
  };

  const pct = ((15 - countdown) / 15) * 100;

  return (
    <div className={styles.page}>
      <Sidebar />
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h1 className={styles.pageTitle}>{t("gestion.simulacion.titulo")}<HelpTooltip texto={t("help.simulation")} /></h1>
            <p className={styles.subtitle}>{t("gestion.simulacion.subtitulo")}</p>
          </div>
          <span className={`${styles.wsBadge} ${conectado ? styles.wsOn : styles.wsOff}`}>
            {conectado ? t("gestion.comun.live") : t("gestion.comun.offline")}
          </span>
        </header>

        {errorMensaje && <div className={styles.errorBanner} role="alert">
          <span>{errorMensaje}</span>
          {errorLista
            ? <button onClick={cargarSensores}>{t("gestion.comun.reintentar")}</button>
            : <button onClick={() => setErrorMensaje(null)}>{t("gestion.comun.cerrar")}</button>}
        </div>}

        <section className={styles.panel}>
          <div className={styles.panelHeader}><h2 className={styles.panelTitle}>{t("gestion.simulacion.escenarios")}</h2></div>
          {puedeSimular && <form onSubmit={crearEscenario} className={styles.estrategiasGrid}>
            <label>{t("gestion.simulacion.nombre")}<input required maxLength={200} value={nombreEscenario} onChange={e => setNombreEscenario(e.target.value)} /></label>
            <label>{t("gestion.simulacion.sensoresSim")}<select multiple required value={sensoresEscenario.map(String)} onChange={e => setSensoresEscenario(Array.from(e.target.selectedOptions, o => Number(o.value)))}>
              {sensores.map(s => <option key={s.id_sensor} value={s.id_sensor}>{s.city_node_name} · {s.sensor_type_code} · {s.serial_code}</option>)}
            </select><small>{t("gestion.simulacion.ayudaMultiple")}</small></label>
            <label>{t("gestion.simulacion.intensidad")}<select value={intensidad} onChange={e => setIntensidad(e.target.value)}><option value="NORMAL">{t("gestion.simulacion.intensidades.NORMAL")}</option><option value="WARNING">{t("gestion.simulacion.intensidades.WARNING")}</option><option value="CRITICAL">{t("gestion.simulacion.intensidades.CRITICAL")}</option></select></label>
            <label>{t("gestion.simulacion.intervalo")}<input type="number" min={5} max={300} value={intervaloSegundos} onChange={e => setIntervaloSegundos(Number(e.target.value))}/></label>
            <label>{t("gestion.simulacion.duracion")}<input type="number" min={1} max={240} value={duracionMinutos} onChange={e => setDuracionMinutos(Number(e.target.value))}/></label>
            <button className={styles.btnTodos} type="submit" disabled={guardandoEscenario || sensoresEscenario.length === 0}>{guardandoEscenario ? t("gestion.simulacion.iniciando") : t("gestion.simulacion.crear")}</button>
          </form>}
          {escenarios.length > 0 && <ul className={styles.logList}>{escenarios.map(esc => <li className={styles.logItem} key={esc.id_scenario}>
            <span>{esc.name} · {esc.scenario_type} · {esc.status} · {esc.config.intensidad ?? "—"} · {esc.config.duracionMinutos ?? "—"} {t("gestion.simulacion.min")}</span>
            {puedeSimular && esc.status === "RUNNING" && <button className={styles.btnSimular} onClick={() => void detenerEscenario(esc.id_scenario)}>{t("gestion.simulacion.detener")}</button>}
          </li>)}</ul>}
        </section>

        {/* Panel del motor */}
        <div className={styles.motorPanel}>
          <div className={styles.motorStatus}>
            <div className={styles.motorDot} />
            <span className={styles.motorLabel}>{t("gestion.simulacion.motorActivo")}</span>
            <span className={styles.motorCiclo}>{t("gestion.simulacion.ciclo", { n: ciclo })}</span>
          </div>
          <div className={styles.countdownWrap}>
            <div className={styles.countdownBar}>
              <div className={styles.countdownFill} style={{ width: `${pct}%` }} />
            </div>
            <span className={styles.countdownNum}>{t("gestion.simulacion.proximo", { s: countdown })}</span>
          </div>
          {puedeSimular && <button
            className={styles.btnTodos}
            onClick={simularTodos}
            disabled={simulando !== null}
          >
            {simulando === "todos" ? t("gestion.simulacion.simulandoTodos") : t("gestion.simulacion.simularTodos")}
          </button>}
        </div>

        <div className={styles.columnas}>
          {/* Tabla de sensores */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>{t("gestion.simulacion.sensoresTitulo")}</h2>
              <span className={styles.panelBadge}>{sensores.length}</span>
            </div>
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th>{t("gestion.simulacion.tabla.tipo")}</th>
                  <th>{t("gestion.simulacion.tabla.serial")}</th>
                  <th>{t("gestion.simulacion.tabla.ultimo")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sensores.map(s => (
                  <tr key={s.id_sensor}>
                    <td>{TIPO_ICON[s.sensor_type_code]} {t(`tipos.${s.sensor_type_code}`, { defaultValue: s.sensor_type_code })}</td>
                    <td className={styles.mono}>{s.serial_code}</td>
                    <td className={styles.mono}>
                      {s.last_value != null
                        ? <span className={`${styles.val} ${styles[`val--${(s.last_status ?? "ok").toLowerCase()}`]}`}>{parseFloat(String(s.last_value)).toFixed(1)} {s.sensor_unit}</span>
                        : <span className={styles.muted}>—</span>}
                    </td>
                    <td>
                      {puedeSimular && <button
                        className={styles.btnSimular}
                        onClick={() => simularSensor(s.id_sensor)}
                        disabled={simulando !== null}
                      >
                        {simulando === s.id_sensor ? "…" : "▶"}
                      </button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Log de simulaciones manuales */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>{t("gestion.simulacion.log")}</h2>
              <span className={styles.panelBadge}>{resultados.length}</span>
            </div>
            {resultados.length === 0 ? (
              <div className={styles.logEmpty}>{t("gestion.simulacion.logVacio")}</div>
            ) : (
              <ul className={styles.logList}>
                {resultados.map((r, i) => (
                  <li key={i} className={styles.logItem}>
                    <span className={styles.logIcon}>{TIPO_ICON[r.tipo] ?? "📡"}</span>
                    <span className={styles.logSensor}>{t("gestion.simulacion.sensorN", { id: r.idSensor })}</span>
                    <span className={styles.logTipo}>{t(`tipos.${r.tipo}`, { defaultValue: r.tipo })}</span>
                    <span className={styles.logValor}>{typeof r.valor === "number" ? r.valor.toFixed(1) : "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Estrategias */}
        <div className={styles.estrategiasSection}>
          <h2 className={styles.seccionTitle}>{t("gestion.simulacion.estrategiasTitulo")}</h2>
          <p className={styles.seccionDesc}>{t("gestion.simulacion.estrategiasDesc")}</p>
          <div className={styles.estrategiasGrid}>
            {ESTRATEGIAS.map(e => (
              <div key={e.nombre} className={`${styles.estrategiaCard} ${styles[`estrategiaCard--${e.color}`]}`}>
                <div className={styles.estrategiaHeader}>
                  <span className={styles.estrategiaIcon}>{e.icono}</span>
                  <div>
                    <div className={styles.estrategiaNombre}>{e.nombre}</div>
                    <div className={styles.estrategiaPatron}>«Strategy»</div>
                  </div>
                </div>
                <div className={styles.estrategiaMeta}>
                  <span className={styles.metaChip}>{t("gestion.simulacion.nivel", { v: t(`gestion.simulacion.estr.${e.clave}.nivel`) })}</span>
                  <span className={styles.metaChip}>{t("gestion.simulacion.personas", { v: t(`gestion.simulacion.estr.${e.clave}.personas`) })}</span>
                  <span className={styles.metaChip}>{t("gestion.simulacion.radio", { v: t(`gestion.simulacion.estr.${e.clave}.radio`) })}</span>
                </div>
                <p className={styles.estrategiaDesc}>{t(`gestion.simulacion.estr.${e.clave}.desc`)}</p>
                <ul className={styles.estrategiaInst}>
                  {(t(`gestion.simulacion.estr.${e.clave}.pasos`, { returnObjects: true }) as unknown as string[]).map((inst, i) => <li key={i}>{inst}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
