import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import styles from "./LanguageSwitcher.module.css";

type Idioma = "es" | "en";

/** Selector de idioma (ES / EN). El idioma elegido se guarda en el navegador (i18next-browser-languagedetector). */
export default function LanguageSwitcher({ flotante = false }: { flotante?: boolean }) {
  const { i18n, t } = useTranslation();
  const actual: Idioma = i18n.resolvedLanguage?.startsWith("en") ? "en" : "es";

  // Mantiene <html lang="..."> al día (accesibilidad y lectores de pantalla).
  useEffect(() => { document.documentElement.lang = actual; }, [actual]);

  return (
    <div className={`${styles.grupo} ${flotante ? styles.flotante : ""}`} role="group" aria-label={t("lang.etiqueta")}>
      {(["es", "en"] as const).map((l) => (
        <button key={l} type="button" aria-pressed={actual === l} title={t(`lang.${l}`)}
          className={actual === l ? styles.activo : ""} onClick={() => void i18n.changeLanguage(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
