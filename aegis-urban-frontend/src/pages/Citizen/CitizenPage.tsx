import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "../../context/AuthContext";
import { useAuthStore } from "../../store/authStore";
import { useUbicacionStore } from "../../store/ubicacionStore";
import { useUbicacion } from "../../hooks/useUbicacion";
import DangerOverlay from "../../components/DangerOverlay/DangerOverlay";
import LanguageSwitcher from "../../components/LanguageSwitcher/LanguageSwitcher";
import HelpTooltip from "../../components/HelpTooltip/HelpTooltip";
import { grupoClima, tipoDeZona, direccionTraducida } from "../../i18n/ayudas";
import { publicoApi, type Aviso, type Clima, type EvaluacionRiesgo, type ZonaRiesgo } from "../../services/publico";
import { verificacionApi } from "../../services/verificacion";
import styles from "./CitizenPage.module.css";

const BUENOS_AIRES = { lat: -34.6037, lon: -58.3816 };
const COLOR_NIVEL = { WARNING: "#FFB020", CRITICAL: "#FF4D6D", CATASTROPHIC: "#FF2D55" } as const;
const CLAVE_GPS = { inactivo: "inactivo", buscando: "buscando", activo: "activo", denegado: "denegado", "no-soportado": "noSoportado", error: "error" } as const;

interface PosicionPrueba { lat: number; lon: number; etiqueta: string }
const METROS_POR_GRADO = 111_320;

export default function CitizenPage() {
  const { t, i18n } = useTranslation();
  const { cerrarSesion } = useAuth();
  const { autenticado, usuario } = useAuthStore();
  const { consentida, notificaciones, fijarConsentimiento, fijarNotificaciones } = useUbicacionStore();
  const locale = i18n.resolvedLanguage?.startsWith("en") ? "en-GB" : "es-AR";

  const [prueba, setPrueba] = useState<PosicionPrueba | null>(null);
  const { posicion: gps, estado: estadoGps } = useUbicacion(consentida === true && !prueba);
  const posicion = prueba ?? gps;

  const [clima, setClima] = useState<Clima | null>(null);
  const [climaOk, setClimaOk] = useState(true);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [zonas, setZonas] = useState<ZonaRiesgo[]>([]);
  const [evaluacion, setEvaluacion] = useState<EvaluacionRiesgo | null>(null);
  const [descartado, setDescartado] = useState<{ id: number; hasta: number } | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  // Estado de la verificación del perfil (solo para cuentas ciudadanas con sesión).
  const [perfilVerificado, setPerfilVerificado] = useState<boolean | null>(null);
  const esCiudadanoConCuenta = autenticado && usuario?.familia === "CIUDADANO";
  useEffect(() => {
    if (!esCiudadanoConCuenta) { setPerfilVerificado(null); return; }
    verificacionApi.estado().then((e) => setPerfilVerificado(e.verificado)).catch(() => setPerfilVerificado(null));
  }, [esCiudadanoConCuenta]);

  const lat = posicion?.lat ?? BUENOS_AIRES.lat;
  const lon = posicion?.lon ?? BUENOS_AIRES.lon;
  // El clima y los avisos solo necesitan una posición aproximada (~1 km).
  const latAprox = Math.round(lat * 100) / 100;
  const lonAprox = Math.round(lon * 100) / 100;

  // ── Carga periódica de clima, avisos y zonas
  const cargar = useCallback(async () => {
    const [c, a, z] = await Promise.allSettled([
      publicoApi.clima(latAprox, lonAprox), publicoApi.avisos(latAprox, lonAprox), publicoApi.zonas(),
    ]);
    if (c.status === "fulfilled") { setClima(c.value.clima); setClimaOk(c.value.disponible); }
    if (a.status === "fulfilled") setAvisos(a.value.avisos);
    if (z.status === "fulfilled") setZonas(z.value);
  }, [latAprox, lonAprox]);

  useEffect(() => {
    void cargar();
    const id = setInterval(() => void cargar(), 30_000);
    return () => clearInterval(id);
  }, [cargar]);

  // ── Evaluación de riesgo según la ubicación (solo si hay posición consentida o de prueba)
  const evaluar = useCallback(async () => {
    if (!posicion) { setEvaluacion(null); return; }
    try { setEvaluacion(await publicoApi.riesgo(posicion.lat, posicion.lon)); } catch { /* reintenta en el próximo ciclo */ }
  }, [posicion]);

  useEffect(() => {
    void evaluar();
    const id = setInterval(() => void evaluar(), 15_000);
    return () => clearInterval(id);
  }, [evaluar]);

  // ── Textos que dependen del idioma, armados a partir de códigos y valores del servidor
  const textoRiesgo = useCallback((ev: EvaluacionRiesgo): string => {
    if (ev.estado === "SEGURO" || !ev.zona) return t("ciudadano.mensajeSeguro");
    const direccion = direccionTraducida(t, ev.direccion);
    if (ev.estado === "PELIGRO") return t("ciudadano.mensajePeligro", { zona: ev.zona.nombre, tipo: tipoDeZona(t, ev.zona), direccion });
    const dentro = (ev.distanciaM ?? Infinity) <= ev.zona.radioM;
    return dentro
      ? t("ciudadano.mensajePrecaucionDentro", { zona: ev.zona.nombre, direccion })
      : t("ciudadano.mensajePrecaucionCerca", { metros: ev.distanciaM, zona: ev.zona.nombre });
  }, [t]);

  const tituloAviso = (a: Aviso) => a.origen === "real"
    ? t(`avisosClima.${a.tipo}.${a.nivel}.titulo`, { defaultValue: a.titulo })
    : t("ciudadano.avisos.enZona", { tipo: t(`tipos.${a.tipo}`, { defaultValue: a.tipo }), zona: a.zona });
  const detalleAviso = (a: Aviso) => a.origen === "real"
    ? t(`avisosClima.${a.tipo}.${a.nivel}.detalle`, { valor: a.valor, defaultValue: a.detalle })
    : t("ciudadano.avisos.detalleSimulado");

  // ── Notificaciones del navegador: avisos críticos nuevos y entrada a zona de peligro
  const vistos = useRef<Set<string> | null>(null);
  const estadoPrevio = useRef<string>("SEGURO");

  const notificar = useCallback((titulo: string, cuerpo: string) => {
    if (notificaciones && "Notification" in window && Notification.permission === "granted") {
      new Notification(titulo, { body: cuerpo, tag: titulo });
    }
  }, [notificaciones]);

  useEffect(() => {
    const criticos = avisos.filter((a) => a.nivel === "CRITICAL");
    if (vistos.current === null) { vistos.current = new Set(criticos.map((a) => a.id)); return; }
    for (const a of criticos) {
      if (!vistos.current.has(a.id)) { vistos.current.add(a.id); notificar(`AEGIS: ${tituloAviso(a)}`, detalleAviso(a)); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avisos, notificar]);

  useEffect(() => {
    const estado = evaluacion?.estado ?? "SEGURO";
    if (estado === "PELIGRO" && estadoPrevio.current !== "PELIGRO" && evaluacion?.zona) {
      notificar(t("peligro.titulo"), t("peligro.notificacion", {
        tipo: tipoDeZona(t, evaluacion.zona), zona: evaluacion.zona.nombre, direccion: direccionTraducida(t, evaluacion.direccion),
      }));
    }
    estadoPrevio.current = estado;
  }, [evaluacion, notificar, t]);

  // ── Consentimiento de ubicación (se guarda en el servidor si hay cuenta)
  async function decidirUbicacion(acepta: boolean) {
    fijarConsentimiento(acepta);
    if (!acepta) setPrueba(null);
    if (autenticado) { try { await publicoApi.fijarUbicacion(acepta); } catch { /* queda local */ } }
  }

  async function activarNotificaciones() {
    if (!("Notification" in window)) { setMensaje(t("ciudadano.ubicacion.sinSoporte")); return; }
    const permiso = await Notification.requestPermission();
    fijarNotificaciones(permiso === "granted");
    setMensaje(permiso === "granted" ? t("ciudadano.ubicacion.activadas") : t("ciudadano.ubicacion.denegadas"));
  }

  // ── Modo prueba: ubicarse en/cerca de una zona sin moverse
  function probar(zona: ZonaRiesgo, donde: "dentro" | "cerca" | "lejos") {
    const grados = (m: number) => m / METROS_POR_GRADO;
    const desplazamiento = donde === "dentro" ? 100 : donde === "cerca" ? zona.radioM * 1.3 : zona.radioM * 6;
    setPrueba({ lat: zona.lat + grados(desplazamiento), lon: zona.lon, etiqueta: t(`ciudadano.prueba.etiquetas.${donde}`, { zona: zona.nombre }) });
    setDescartado(null);
  }

  // ── Mapa
  const contenedorMapa = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const capa = useRef<L.LayerGroup | null>(null);
  useEffect(() => {
    if (!contenedorMapa.current || mapa.current) return;
    const m = L.map(contenedorMapa.current, { zoomControl: true }).setView([BUENOS_AIRES.lat, BUENOS_AIRES.lon], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors" }).addTo(m);
    capa.current = L.layerGroup().addTo(m);
    mapa.current = m;
    return () => { m.remove(); mapa.current = null; };
  }, []);

  const centradoEnUsuario = useRef(false);
  useEffect(() => {
    if (!mapa.current || !capa.current) return;
    capa.current.clearLayers();
    for (const z of zonas) {
      L.circle([z.lat, z.lon], { radius: z.radioM, color: COLOR_NIVEL[z.nivel], fillOpacity: 0.18, weight: 2 })
        .bindPopup(`<strong>${tipoDeZona(t, z)}</strong><br/>${z.nombre}`).addTo(capa.current);
    }
    if (posicion) {
      L.circleMarker([posicion.lat, posicion.lon], { radius: 8, color: "#fff", weight: 2, fillColor: "#22E5FF", fillOpacity: 1 })
        .bindTooltip(t("ciudadano.mapa.vos")).addTo(capa.current);
      if (!centradoEnUsuario.current || prueba) { mapa.current.setView([posicion.lat, posicion.lon], 14); centradoEnUsuario.current = true; }
    }
  }, [zonas, posicion, prueba, t]);

  const mostrarCartel = evaluacion?.estado === "PELIGRO" && evaluacion.zona &&
    !(descartado && descartado.id === evaluacion.zona.id && Date.now() < descartado.hasta);

  const resumen = useMemo(() => ({
    criticos: avisos.filter((a) => a.nivel === "CRITICAL").length,
    total: avisos.length,
  }), [avisos]);

  // ── Derechos del titular (Ley 25.326)
  async function descargarDatos() {
    try {
      const datos = await publicoApi.misDatos();
      const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url; a.download = "mis-datos-aegis.json"; a.click();
      URL.revokeObjectURL(url);
    } catch { setMensaje(t("ciudadano.misDatos.errDescarga")); }
  }

  async function eliminarCuenta() {
    if (!window.confirm(t("ciudadano.misDatos.confirmarBaja"))) return;
    try { await publicoApi.darDeBaja(); await cerrarSesion(); } catch { setMensaje(t("ciudadano.misDatos.errBaja")); }
  }

  const esStaff = autenticado && usuario?.familia !== "CIUDADANO";
  const dondeClima = posicion
    ? (prueba ? t("ciudadano.clima.dondePrueba", { etiqueta: prueba.etiqueta }) : t("ciudadano.clima.dondeDispositivo"))
    : t("ciudadano.clima.dondeDefecto");

  return (
    <div className={styles.page}>
      {mostrarCartel && evaluacion && (
        <DangerOverlay evaluacion={evaluacion}
          onEntendido={() => setDescartado({ id: evaluacion.zona!.id, hasta: Date.now() + 3 * 60_000 })} />
      )}

      <header className={styles.top}>
        <div>
          <p className={styles.kicker}>{t("ciudadano.kicker")}</p>
          <h1>{t("ciudadano.titulo")}</h1>
        </div>
        <nav className={styles.nav}>
          <LanguageSwitcher />
          {autenticado
            ? <>{esStaff && <Link to="/dashboard">{t("ciudadano.panelGestion")}</Link>}<button onClick={() => void cerrarSesion()}>{t("ciudadano.salir")}</button></>
            : <><Link to="/login">{t("ciudadano.ingresar")}</Link><Link to="/registro" className={styles.cta}>{t("ciudadano.crearCuenta")}</Link></>}
        </nav>
      </header>

      {perfilVerificado === false && (
        <section className={`${styles.estado} ${styles.precaucion}`} role="status">
          <strong>{t("ciudadano.sinVerificar.titulo")}</strong>
          <span>{t("ciudadano.sinVerificar.texto")} <Link to="/verificar">{t("ciudadano.sinVerificar.enlace")}</Link></span>
        </section>
      )}

      {mensaje && <p className={styles.mensaje} role="status" onClick={() => setMensaje(null)}>{mensaje}</p>}

      {/* ── Estado de riesgo en la ubicación */}
      {evaluacion && evaluacion.estado !== "SEGURO" && (
        <section className={`${styles.estado} ${evaluacion.estado === "PELIGRO" ? styles.peligro : styles.precaucion}`} role="alert">
          <strong>{evaluacion.estado === "PELIGRO" ? t("ciudadano.estado.peligro") : t("ciudadano.estado.precaucion")}</strong>
          <span>{textoRiesgo(evaluacion)}</span>
        </section>
      )}
      {evaluacion?.estado === "SEGURO" && posicion && (
        <section className={`${styles.estado} ${styles.seguro}`}><strong>{t("ciudadano.estado.seguro")}</strong><span>{textoRiesgo(evaluacion)}</span></section>
      )}

      {/* ── Consentimiento de ubicación */}
      {consentida === null && (
        <section className={styles.consent}>
          <h2>{t("ciudadano.consent.titulo")}</h2>
          <ul><li>{t("ciudadano.consent.p1")}</li><li>{t("ciudadano.consent.p2")}</li><li>{t("ciudadano.consent.p3")}</li></ul>
          <p className={styles.legalMini}>
            <Trans i18nKey="ciudadano.consent.legal" components={[<span key="0" />, <Link key="1" to="/privacidad" />]} />
          </p>
          <div className={styles.acciones}>
            <button className={styles.primario} onClick={() => void decidirUbicacion(true)}>{t("ciudadano.consent.permitir")}</button>
            <button className={styles.secundario} onClick={() => void decidirUbicacion(false)}>{t("ciudadano.consent.ahoraNo")}</button>
          </div>
        </section>
      )}

      <div className={styles.grid}>
        {/* ── Clima real */}
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>{t("ciudadano.clima.titulo")}</h2>
            <span className={styles.chipReal}>{t("ciudadano.clima.real")}</span>
          </div>
          {clima ? (
            <>
              <div className={styles.temp}>{Math.round(clima.temperaturaC)}°<small>{t(`condiciones.${grupoClima(clima.codigo)}`)}</small></div>
              <dl className={styles.datos}>
                <div><dt>{t("ciudadano.clima.sensacion")}</dt><dd>{Math.round(clima.sensacionC)}°</dd></div>
                <div><dt>{t("ciudadano.clima.viento")}</dt><dd>{Math.round(clima.vientoKmh)} km/h</dd></div>
                <div><dt>{t("ciudadano.clima.rafagas")}</dt><dd>{Math.round(clima.rafagasKmh)} km/h</dd></div>
                <div><dt>{t("ciudadano.clima.lluvia")}</dt><dd>{clima.precipitacionMm} mm</dd></div>
                <div><dt>{t("ciudadano.clima.aire")}</dt><dd>{clima.aqi ?? "—"}</dd></div>
              </dl>
            </>
          ) : <p className={styles.vacio}>{climaOk ? t("ciudadano.clima.cargando") : t("ciudadano.clima.noDisponible")}</p>}
          <p className={styles.nota}>{t("ciudadano.clima.ubicacion", { donde: dondeClima })}</p>
        </section>

        {/* ── Ubicación y notificaciones */}
        <section className={styles.card}>
          <div className={styles.cardHead}><h2>{t("ciudadano.ubicacion.titulo")}</h2></div>
          {consentida === true && (
            <>
              <p className={styles.nota}>
                {t("ciudadano.ubicacion.gps")}: <strong>{t(`ciudadano.ubicacion.estados.${CLAVE_GPS[estadoGps]}`)}</strong>
              </p>
              {estadoGps === "denegado" && <p className={styles.mensajeChico}>{t("ciudadano.ubicacion.ayudaBloqueo")}</p>}
              <button className={styles.secundario} onClick={() => void decidirUbicacion(false)}>{t("ciudadano.ubicacion.revocar")}</button>
            </>
          )}
          {consentida === false && (
            <>
              <p className={styles.nota}>{t("ciudadano.ubicacion.noComparte")}</p>
              <button className={styles.primario} onClick={() => void decidirUbicacion(true)}>{t("ciudadano.ubicacion.permitir")}</button>
            </>
          )}
          {consentida === null && <p className={styles.nota}>{t("ciudadano.ubicacion.responder")}</p>}
          <button className={styles.secundario} onClick={() => void activarNotificaciones()} disabled={notificaciones}>
            {notificaciones ? t("ciudadano.ubicacion.notifOn") : t("ciudadano.ubicacion.notif")}
          </button>
        </section>
      </div>

      {/* ── Mapa */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>{t("ciudadano.mapa.titulo")}</h2>
          <span className={styles.chipSim}>{t("ciudadano.mapa.zonas", { n: zonas.length })}</span>
        </div>
        <div ref={contenedorMapa} className={styles.mapa} />
      </section>

      {/* ── Avisos */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>{t("ciudadano.avisos.titulo")}</h2>
          <span className={styles.nota}>{t("ciudadano.avisos.resumen", { total: resumen.total, criticos: resumen.criticos })}</span>
        </div>
        {avisos.length === 0 ? <p className={styles.vacio}>{t("ciudadano.avisos.vacio")}</p> : (
          <ul className={styles.avisos}>
            {avisos.map((a) => (
              <li key={a.id} className={`${styles.aviso} ${styles[`nivel${a.nivel}`]}`}>
                <div className={styles.avisoHead}>
                  <strong>{tituloAviso(a)}</strong>
                  <span className={a.origen === "real" ? styles.chipReal : styles.chipSim}>{a.origen === "real" ? t("ciudadano.avisos.real") : t("ciudadano.avisos.simulado")}</span>
                </div>
                <p>{detalleAviso(a)}</p>
                <small>{t(`tipos.${a.tipo}`, { defaultValue: a.tipo })} · {new Date(a.fecha).toLocaleString(locale)}</small>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Modo prueba */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>{t("ciudadano.prueba.titulo")}<HelpTooltip texto={t("ayuda.tooltips.modoPrueba")} /></h2>
          {prueba && <button className={styles.secundario} onClick={() => setPrueba(null)}>{t("ciudadano.prueba.salir")}</button>}
        </div>
        <p className={styles.nota}>{t("ciudadano.prueba.descripcion")}</p>
        {zonas.length === 0 ? <p className={styles.vacio}>{t("ciudadano.prueba.sinZonas")}</p> : (
          <ul className={styles.pruebas}>
            {zonas.map((z) => (
              <li key={z.id}>
                <span>{tipoDeZona(t, z)} · {z.nombre}</span>
                <div>
                  <button onClick={() => probar(z, "dentro")}>{t("ciudadano.prueba.dentro")}</button>
                  <button onClick={() => probar(z, "cerca")}>{t("ciudadano.prueba.cerca")}</button>
                  <button onClick={() => probar(z, "lejos")}>{t("ciudadano.prueba.lejos")}</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Mis datos */}
      {autenticado && usuario?.familia === "CIUDADANO" && (
        <section className={styles.card}>
          <div className={styles.cardHead}><h2>{t("ciudadano.misDatos.titulo")}</h2></div>
          <p className={styles.nota}>{t("ciudadano.misDatos.cuenta")} <strong>{usuario.username}</strong> · {perfilVerificado ? t("ciudadano.misDatos.verificado") : <>{t("ciudadano.misDatos.sinVerificar")} · <Link to="/verificar">{t("ciudadano.misDatos.verificar")}</Link></>}</p>
          <div className={styles.acciones}>
            <button className={styles.secundario} onClick={() => void descargarDatos()}>{t("ciudadano.misDatos.descargar")}</button>
            <button className={styles.peligroBtn} onClick={() => void eliminarCuenta()}>{t("ciudadano.misDatos.baja")}</button>
          </div>
        </section>
      )}

      <footer className={styles.pie}>
        <Link to="/terminos">{t("ciudadano.pie.terminos")}</Link>
        <Link to="/privacidad">{t("ciudadano.pie.privacidad")}</Link>
        <Link to="/ayuda">{t("ayuda.abrir")}</Link>
        <span>{t("ciudadano.pie.orientativo")}</span>
      </footer>
    </div>
  );
}
