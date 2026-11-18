import { useEffect, useState, useCallback } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import Sidebar from "../../components/Layout/Sidebar";
import api from "../../services/api";
import BackupsPanel from "../../components/Backups/BackupsPanel";
import { usePatente } from "../../store/authStore";
import { accionEtiqueta } from "../../i18n/ayudas";
import LanguageSwitcher from "../../components/LanguageSwitcher/LanguageSwitcher";
import HelpTooltip from "../../components/HelpTooltip/HelpTooltip";
import styles from "./AdminPage.module.css";

interface Usuario {
  id_user:     number;
  username:    string;
  email:       string;
  is_active:   boolean;
  created_at:  string;
  last_login:  string | null;
  family_name: string;
}

interface Familia {
  id_family:      number;
  name:           string;
  description:    string | null;
  is_active:      boolean;
  created_at:     string;
  total_usuarios: number;
}

interface EntradaBitacora {
  id_log:      string;
  action:      string;
  entity_name: string;
  entity_id:   string;
  id_user:     number | null;
  ip_address:  string;
  created_at:  string;
}

interface ResultadoIntegridad {
  esValida:     boolean;
  filaCorrupta: string | null;
  motivo:       string;
  totalFilas:   number;
}

type Tab = "usuarios" | "familias" | "bitacora" | "integridad" | "respaldos";

export default function AdminPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage?.startsWith("en") ? "en-GB" : "es-AR";
  const esAdministrador = usePatente("ADMIN_USERS_VIEW");
  const esAuditor = usePatente("AUDIT_VIEW");
  const [tab, setTab]             = useState<Tab>(esAuditor && !esAdministrador ? "bitacora" : "usuarios");
  const [usuarios, setUsuarios]   = useState<Usuario[]>([]);
  const [familias, setFamilias]   = useState<Familia[]>([]);
  const [bitacora, setBitacora]   = useState<EntradaBitacora[]>([]);
  const [integridad, setIntegridad] = useState<ResultadoIntegridad | null>(null);
  const [cargando, setCargando]   = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const cargarTab = useCallback(async (pestana: Tab) => {
    setCargando(true);
    setErrorCarga(null);
    try {
      if (pestana === "usuarios") {
        const res = await api.get<{ usuarios: Usuario[] }>("/admin/usuarios");
        setUsuarios(res.data.usuarios);
      } else if (pestana === "familias") {
        const res = await api.get<{ familias: Familia[] }>("/admin/familias");
        setFamilias(res.data.familias);
      } else if (pestana === "bitacora") {
        const res = await api.get<{ entradas: EntradaBitacora[] }>("/admin/bitacora?limite=30");
        setBitacora(res.data.entradas);
      }
    } catch {
      setErrorCarga(t("gestion.admin.errCarga"));
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => {
    if (esAdministrador || esAuditor) cargarTab(tab);
  }, [tab, cargarTab, esAdministrador, esAuditor]);

  const verificarIntegridad = async () => {
    setVerificando(true);
    setTab("integridad");
    try {
      const res = await api.get<{ integridad: ResultadoIntegridad }>("/admin/integridad");
      setIntegridad(res.data.integridad);
      setTab("integridad");
      setErrorCarga(null);
    } catch {
      setErrorCarga(t("gestion.admin.errVerificar"));
    } finally {
      setVerificando(false);
    }
  };

  const tabsBase: { id: Tab; label: string }[] = [
    { id: "usuarios",   label: t("gestion.admin.tabs.usuarios") },
    { id: "familias",   label: t("gestion.admin.tabs.familias") },
    { id: "bitacora",   label: t("gestion.admin.tabs.bitacora") },
    { id: "integridad", label: t("gestion.admin.tabs.integridad") },
    { id: "respaldos",  label: t("gestion.admin.tabs.respaldos") },
  ];
  const tabs = tabsBase.filter((t: { id: Tab; label: string }) => esAdministrador || (esAuditor && (t.id === "bitacora" || t.id === "integridad")));

  if (!esAdministrador && !esAuditor) return <Navigate to="/dashboard" replace />;

  return (
    <div className={styles.page}>
      <Sidebar />
      <main className={styles.main}>
        <header className={styles.topbar}>
          <LanguageSwitcher />
          <div>
            <h1 className={styles.pageTitle}>{t("gestion.admin.titulo")}{tab === "familias" && <HelpTooltip texto={t("help.composite")} />}</h1>
            <p className={styles.subtitle}>{t("gestion.admin.subtitulo")}</p>
          </div>
          <button
            className={styles.btnIntegridad}
            onClick={verificarIntegridad}
            disabled={verificando}
          >
            {verificando ? t("gestion.admin.verificando") : t("gestion.admin.verificar")}
          </button>
          <HelpTooltip texto={t("help.dvhDvv")} />
        </header>

        {/* Tabs */}
        <div className={styles.tabRow}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`${styles.tabBtn} ${tab === t.id ? styles.tabBtnActive : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {errorCarga && <div className={styles.errorBanner} role="alert">
          <span>{errorCarga}</span>
          <button onClick={() => tab === "integridad" ? verificarIntegridad() : cargarTab(tab)}>{t("gestion.comun.reintentar")}</button>
        </div>}

        {tab === "respaldos" && esAdministrador && <BackupsPanel />}

        {/* ── Usuarios */}
        {tab === "usuarios" && (
          <div className={styles.panelWrap}>
            {cargando ? <div className={styles.loading}>{t("gestion.comun.cargando")}</div> : (
              <table className={styles.tabla}>
                <thead><tr>
                  <th>{t("gestion.admin.usuarios.id")}</th>
                  <th>{t("gestion.admin.usuarios.usuario")}</th>
                  <th>{t("gestion.admin.usuarios.email")}</th>
                  <th>{t("gestion.admin.usuarios.familia")}</th>
                  <th>{t("gestion.admin.usuarios.estado")}</th>
                  <th>{t("gestion.admin.usuarios.ultimo")}</th>
                </tr></thead>
                <tbody>
                  {usuarios.map(u => (
                    <tr key={u.id_user}>
                      <td className={styles.mono}>#{u.id_user}</td>
                      <td className={styles.negrita}>{u.username}</td>
                      <td className={styles.muted}>{u.email}</td>
                      <td>{u.family_name}</td>
                      <td>
                        <span className={`${styles.estadoBadge} ${u.is_active ? styles["estadoBadge--activo"] : styles["estadoBadge--inactivo"]}`}>
                          {u.is_active ? t("gestion.admin.usuarios.activo") : t("gestion.admin.usuarios.inactivo")}
                        </span>
                      </td>
                      <td className={styles.mono}>
                        {u.last_login
                          ? new Date(u.last_login).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Familias */}
        {tab === "familias" && (
          <div className={styles.panelWrap}>
            {cargando ? <div className={styles.loading}>{t("gestion.comun.cargando")}</div> : (
              <table className={styles.tabla}>
                <thead><tr>
                  <th>{t("gestion.admin.familias.id")}</th>
                  <th>{t("gestion.admin.familias.nombre")}</th>
                  <th>{t("gestion.admin.familias.descripcion")}</th>
                  <th>{t("gestion.admin.familias.usuarios")}</th>
                  <th>{t("gestion.admin.familias.creada")}</th>
                </tr></thead>
                <tbody>
                  {familias.map(f => (
                    <tr key={f.id_family}>
                      <td className={styles.mono}>#{f.id_family}</td>
                      <td className={styles.negrita}>{f.name}</td>
                      <td className={styles.muted}>{f.description ?? "—"}</td>
                      <td>
                        <span className={styles.usuariosBadge}>{f.total_usuarios}</span>
                      </td>
                      <td className={styles.mono}>
                        {new Date(f.created_at).toLocaleDateString(locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Bitácora */}
        {tab === "bitacora" && (
          <div className={styles.panelWrap}>
            {cargando ? <div className={styles.loading}>{t("gestion.comun.cargando")}</div> : (
              <table className={styles.tabla}>
                <thead><tr>
                  <th>{t("gestion.admin.bitacora.log")}</th>
                  <th>{t("gestion.admin.bitacora.accion")}</th>
                  <th>{t("gestion.admin.bitacora.entidad")}</th>
                  <th>{t("gestion.admin.bitacora.id")}</th>
                  <th>{t("gestion.admin.bitacora.ip")}</th>
                  <th>{t("gestion.admin.bitacora.fecha")}</th>
                </tr></thead>
                <tbody>
                  {bitacora.map(e => (
                    <tr key={e.id_log}>
                      <td className={styles.mono}>{e.id_log}</td>
                      <td>
                        <span className={`${styles.actTag} ${styles[`actTag--${e.action}`]}`}>
                          {accionEtiqueta(t, e.action)}
                        </span>
                      </td>
                      <td className={styles.muted}>{e.entity_name}</td>
                      <td className={styles.mono}>{e.entity_id}</td>
                      <td className={styles.mono}>{e.ip_address}</td>
                      <td className={styles.mono}>
                        {new Date(e.created_at).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Integridad */}
        {tab === "integridad" && (
          <div className={styles.integridadPanel}>
            {!integridad ? (
              <div className={styles.integridadEmpty}>
                <p><Trans i18nKey="gestion.admin.integridad.vacio1" components={[<span key="0" />, <strong key="1" />]} /></p>
                <p className={styles.integridadDesc}>{t("gestion.admin.integridad.vacio2")}</p>
              </div>
            ) : (
              <>
                <div className={`${styles.integridadResultado} ${integridad.esValida ? styles["integridadResultado--ok"] : styles["integridadResultado--error"]}`}>
                  <span className={styles.integridadIcon}>{integridad.esValida ? "✓" : "✗"}</span>
                  <div>
                    <div className={styles.integridadVeredicto}>
                      {integridad.esValida ? t("gestion.admin.integridad.valida") : t("gestion.admin.integridad.comprometida")}
                    </div>
                    <div className={styles.integridadSub}>
                      {t("gestion.admin.integridad.filas", { n: integridad.totalFilas })}
                      {integridad.filaCorrupta
                        ? t("gestion.admin.integridad.filaComp", { f: integridad.filaCorrupta })
                        : t("gestion.admin.integridad.sinAlt")}
                    </div>
                  </div>
                </div>

                <div className={styles.integridadMeta}>
                  <div className={styles.metaRow}>
                    <span className={styles.metaKey}>{t("gestion.admin.integridad.totalFilas")}</span>
                    <span className={styles.metaVal}>{integridad.totalFilas}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaKey}>{t("gestion.admin.integridad.resultado")}</span>
                    <span className={styles.metaVal}>{integridad.motivo}</span>
                  </div>
                  {integridad.filaCorrupta && (
                    <div className={styles.metaRow}>
                      <span className={styles.metaKey}>{t("gestion.admin.integridad.filaCorrupta")}</span>
                      <span className={`${styles.metaVal} ${styles["metaVal--danger"]}`}>
                        #{integridad.filaCorrupta}
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.integridadDesc}>
                  <p><Trans i18nKey="gestion.admin.integridad.explicacion" components={[<span key="0" />, <strong key="1" />]} /></p>
                  <p>{t("gestion.admin.integridad.inmutable")}</p>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
