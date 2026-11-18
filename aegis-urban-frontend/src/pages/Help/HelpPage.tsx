import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "../../components/Layout/Sidebar";
import LanguageSwitcher from "../../components/LanguageSwitcher/LanguageSwitcher";
import { useAuthStore } from "../../store/authStore";
import styles from "./HelpPage.module.css";

interface Faq { p: string; r: string }
interface Termino { t: string; d: string }
const ROLES = ["ciudadano", "operador", "defensa", "auditoria", "admin"] as const;

/** Ayuda: guía por rol, preguntas frecuentes y glosario. Es pública; con sesión de gestión muestra también el menú lateral. */
export default function HelpPage() {
  const { t } = useTranslation();
  const { autenticado, usuario } = useAuthStore();
  const conMenu = autenticado && usuario?.familia !== "CIUDADANO";
  const lista = <T,>(clave: string) => t(clave, { returnObjects: true }) as unknown as T[];
  const faq = lista<Faq>("ayuda.faq");
  const glosario = lista<Termino>("ayuda.glosario");

  return (
    <div className={styles.page}>
      {conMenu ? <Sidebar /> : <LanguageSwitcher flotante />}
      <main className={styles.main}>
        <header>
          <p className={styles.kicker}>AEGIS URBAN</p>
          <h1>{t("ayuda.titulo")}</h1>
          <p className={styles.sub}>{t("ayuda.subtitulo")}</p>
        </header>

        <section className={styles.emergencia} role="note">
          <strong>{t("ayuda.emergencias.titulo")}</strong>
          <span>{t("ayuda.emergencias.texto")}</span>
        </section>

        <section>
          <h2>{t("ayuda.rolesTitulo")}</h2>
          <div className={styles.roles}>
            {ROLES.map((r) => (
              <article key={r} className={styles.rol}>
                <h3>{t(`ayuda.roles.${r}.titulo`)}</h3>
                <ol>{lista<string>(`ayuda.roles.${r}.pasos`).map((p, i) => <li key={i}>{p}</li>)}</ol>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2>{t("ayuda.faqTitulo")}</h2>
          {faq.map((f, i) => (
            <details key={i} className={styles.faq}>
              <summary>{f.p}</summary>
              <p>{f.r}</p>
            </details>
          ))}
        </section>

        <section>
          <h2>{t("ayuda.glosarioTitulo")}</h2>
          <dl className={styles.glosario}>
            {glosario.map((g) => <div key={g.t}><dt>{g.t}</dt><dd>{g.d}</dd></div>)}
          </dl>
        </section>

        {!conMenu && <p className={styles.volver}><Link to="/ciudadano">← {t("ciudadano.titulo")}</Link></p>}
      </main>
    </div>
  );
}
