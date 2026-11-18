import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./HelpTooltip.module.css";

/**
 * Ayuda contextual: un botón "?" que muestra un texto explicativo al hacer clic, al pasar el mouse
 * o al enfocarlo con el teclado. Se cierra con Escape o al hacer clic afuera.
 */
export default function HelpTooltip({ texto }: { texto: string }) {
  const { t } = useTranslation();
  const [abierto, setAbierto] = useState(false);
  const id = useId();
  const raiz = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrarConEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    const cerrarAfuera = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener("keydown", cerrarConEsc);
    document.addEventListener("mousedown", cerrarAfuera);
    return () => { document.removeEventListener("keydown", cerrarConEsc); document.removeEventListener("mousedown", cerrarAfuera); };
  }, [abierto]);

  return (
    <span className={styles.raiz} ref={raiz} onMouseEnter={() => setAbierto(true)} onMouseLeave={() => setAbierto(false)}>
      <button type="button" className={styles.boton} aria-label={t("ayuda.ayudaContextual")} aria-expanded={abierto} aria-describedby={abierto ? id : undefined}
        onClick={() => setAbierto((a) => !a)} onFocus={() => setAbierto(true)} onBlur={() => setAbierto(false)}>?</button>
      {abierto && <span role="tooltip" id={id} className={styles.globo}>{texto}</span>}
    </span>
  );
}
