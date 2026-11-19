import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../../components/LanguageSwitcher/LanguageSwitcher";
import { LEGAL, TERMINOS, PRIVACIDAD, type SeccionLegal } from "../../legal/textos";
import styles from "./LegalPage.module.css";

function Documento({ titulo, version, secciones }: { titulo: string; version: string; secciones: SeccionLegal[] }) {
  const { t, i18n } = useTranslation();
  const esIngles = i18n.resolvedLanguage?.startsWith("en");
  return (
    <div className={styles.page}>
      <LanguageSwitcher flotante />
      <main className={styles.doc}>
        <nav className={styles.nav}>
          <Link to="/registro">{t("legalPagina.volver")}</Link>
          <Link to="/ciudadano">{t("legalPagina.ciudadana")}</Link>
        </nav>
        <h1>{titulo}</h1>
        <p className={styles.meta}>{t("legalPagina.version", { version })}</p>
        {esIngles && <p className={styles.aviso} role="note">{t("legalPagina.soloEspanol")}</p>}
        <p className={styles.aviso} role="note">
          {t("legalPagina.base")}
        </p>
        {secciones.map((s) => (
          <section key={s.titulo}>
            <h2>{s.titulo}</h2>
            {s.parrafos.map((p, i) => <p key={i}>{p}</p>)}
          </section>
        ))}
      </main>
    </div>
  );
}

export function PaginaTerminos() {
  return <Documento titulo="Términos y Condiciones" version={LEGAL.VERSION_TERMINOS} secciones={TERMINOS} />;
}

export function PaginaPrivacidad() {
  return <Documento titulo="Política de Privacidad" version={LEGAL.VERSION_PRIVACIDAD} secciones={PRIVACIDAD} />;
}
