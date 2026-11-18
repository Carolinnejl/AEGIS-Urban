import { useCallback, useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import HelpTooltip from "./../HelpTooltip/HelpTooltip";
import { isAxiosError } from "axios";
import api from "../../services/api";
import styles from "./BackupsPanel.module.css";

interface Backup {
  archivo: string; creado: string; bytes: number; sha256: string;
  integridad: { esValida: boolean; totalFilas: number };
}
interface Politica { automatico: boolean; retencion: number; modo: string }
interface Simulacro {
  archivo: string; checksumOk: boolean; duracionMs: number;
  integridad: { esValida: boolean; totalFilas: number; motivo: string };
  tablas: Record<string, number>;
}

const msg = (e: unknown, d: string) => (isAxiosError(e) && e.response?.data?.error ? String(e.response.data.error) : d);
const kb = (b: number) => `${Math.max(1, Math.round(b / 1024))} KB`;

/** Respaldos de la base: crear, simulacro de restauración (base temporal) y restauración real con confirmación escrita. */
export default function BackupsPanel() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage?.startsWith("en") ? "en-GB" : "es-AR";
  const [backups, setBackups] = useState<Backup[]>([]);
  const [politica, setPolitica] = useState<Politica | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [simulacro, setSimulacro] = useState<Simulacro | null>(null);

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get<{ backups: Backup[]; politica: Politica }>("/admin/backups");
      setBackups(data.backups); setPolitica(data.politica);
    } catch (e) { setAviso({ tipo: "error", texto: msg(e, t("gestion.respaldos.errLista")) }); }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  async function ejecutar(clave: string, tarea: () => Promise<void>) {
    setOcupado(clave); setAviso(null);
    try { await tarea(); } catch (e) { setAviso({ tipo: "error", texto: msg(e, t("gestion.respaldos.errOperacion")) }); }
    finally { setOcupado(null); }
  }

  const crear = () => ejecutar("crear", async () => {
    const { data } = await api.post<{ backup: Backup }>("/admin/backups");
    setAviso({ tipo: "ok", texto: t("gestion.respaldos.creado", { archivo: data.backup.archivo, tam: kb(data.backup.bytes) }) });
    await cargar();
  });

  const probar = (archivo: string) => ejecutar(`sim-${archivo}`, async () => {
    const { data } = await api.post<{ simulacro: Simulacro }>(`/admin/backups/${archivo}/simulacro`);
    setSimulacro(data.simulacro);
  });

  const restaurar = (archivo: string) => {
    const escrito = window.prompt(t("gestion.respaldos.confirmar", { archivo }));
    if (escrito !== "RESTAURAR") return;
    void ejecutar(`res-${archivo}`, async () => {
      await api.post(`/admin/backups/${archivo}/restaurar`, { confirmar: "RESTAURAR" });
      setAviso({ tipo: "ok", texto: t("gestion.respaldos.restaurado", { archivo }) });
      await cargar();
    });
  };

  return (
    <section className={styles.panel} aria-label={t("gestion.respaldos.titulo")}>
      <header className={styles.cabecera}>
        <div>
          <h2>{t("gestion.respaldos.titulo")}<HelpTooltip texto={t("ayuda.tooltips.respaldos")} /></h2>
          {politica && (
            <p className={styles.nota}>
              <Trans i18nKey="gestion.respaldos.automatico" values={{ valor: politica.automatico ? t("gestion.respaldos.cada24") : t("gestion.respaldos.no"), n: politica.retencion, modo: politica.modo }}
                components={[<span key="0" />, <strong key="1" />]} />
            </p>
          )}
        </div>
        <button className={styles.primario} onClick={() => void crear()} disabled={ocupado !== null}>
          {ocupado === "crear" ? t("gestion.respaldos.creando") : t("gestion.respaldos.crear")}
        </button>
      </header>

      {aviso && <p className={aviso.tipo === "ok" ? styles.ok : styles.error} role={aviso.tipo === "ok" ? "status" : "alert"}>{aviso.texto}</p>}

      {simulacro && (
        <div className={simulacro.integridad.esValida && simulacro.checksumOk ? styles.resultadoOk : styles.resultadoMal} role="status">
          <strong>{t("gestion.respaldos.resultado.titulo", { estado: simulacro.integridad.esValida && simulacro.checksumOk ? t("gestion.respaldos.resultado.aprobado") : t("gestion.respaldos.resultado.problemas") })}</strong>
          <span>{simulacro.archivo} · {simulacro.duracionMs} ms · {simulacro.checksumOk ? t("gestion.respaldos.resultado.archivoIntegro") : t("gestion.respaldos.resultado.archivoAlterado")}</span>
          <span>{t("gestion.respaldos.resultado.bitacora", { motivo: simulacro.integridad.motivo })}</span>
          <span className={styles.mono}>{Object.entries(simulacro.tablas).map(([t, n]) => `${t}: ${n}`).join(" · ")}</span>
          <small>{t("gestion.respaldos.resultado.nota")}</small>
        </div>
      )}

      {backups.length === 0 ? <p className={styles.nota}>{t("gestion.respaldos.vacio")}</p> : (
        <table className={styles.tabla}>
          <thead><tr><th>{t("gestion.respaldos.tabla.archivo")}</th><th>{t("gestion.respaldos.tabla.creado")}</th><th>{t("gestion.respaldos.tabla.tamano")}</th><th>{t("gestion.respaldos.tabla.bitacora")}</th><th>{t("gestion.respaldos.tabla.acciones")}</th></tr></thead>
          <tbody>
            {backups.map((b) => (
              <tr key={b.archivo}>
                <td className={styles.mono}>{b.archivo}</td>
                <td>{new Date(b.creado).toLocaleString(locale)}</td>
                <td>{kb(b.bytes)}</td>
                <td>{b.integridad.esValida ? t("gestion.respaldos.integra", { n: b.integridad.totalFilas }) : t("gestion.respaldos.sinDatos")}</td>
                <td className={styles.acciones}>
                  <button onClick={() => probar(b.archivo)} disabled={ocupado !== null}>{ocupado === `sim-${b.archivo}` ? t("gestion.respaldos.probando") : t("gestion.respaldos.simulacro")}</button>
                  <button className={styles.peligro} onClick={() => restaurar(b.archivo)} disabled={ocupado !== null}>{t("gestion.respaldos.restaurar")}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
