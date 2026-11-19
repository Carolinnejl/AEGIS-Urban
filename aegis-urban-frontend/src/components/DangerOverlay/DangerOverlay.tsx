import { useEffect, useRef } from "react";
import { Trans, useTranslation } from "react-i18next";
import type { EvaluacionRiesgo } from "../../services/publico";
import { direccionTraducida, tipoDeZona } from "../../i18n/ayudas";
import styles from "./DangerOverlay.module.css";

interface Props {
  evaluacion: EvaluacionRiesgo;
  onEntendido: () => void;
}

/** Cartel a pantalla completa cuando el usuario está dentro de una zona de peligro. */
export default function DangerOverlay({ evaluacion, onEntendido }: Props) {
  const { t } = useTranslation();
  const boton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    boton.current?.focus();
    navigator.vibrate?.([300, 150, 300]);
  }, []);

  const zona = evaluacion.zona;
  const valores = {
    tipo: zona ? tipoDeZona(t, zona) : "", zona: zona?.nombre ?? "", direccion: direccionTraducida(t, evaluacion.direccion),
  };

  return (
    <div className={styles.fondo} role="alertdialog" aria-modal="true" aria-labelledby="peligro-titulo" aria-describedby="peligro-desc">
      <div className={styles.caja}>
        <div className={styles.icono} aria-hidden="true">⚠</div>
        <h2 id="peligro-titulo">{t("peligro.titulo")}</h2>
        <p id="peligro-desc" className={styles.mensaje}>
          <Trans i18nKey="peligro.mensaje" values={valores} components={[<span key="0" />, <strong key="1" />]} />
        </p>
        {evaluacion.rumboAlejarse !== null && (
          <div className={styles.brujula} aria-hidden="true">
            <span style={{ transform: `rotate(${evaluacion.rumboAlejarse}deg)` }}>↑</span>
          </div>
        )}
        <p className={styles.dato}>{t("peligro.distancia", { m: evaluacion.distanciaM, radio: zona?.radioM })}</p>
        <p className={styles.emergencia}><Trans i18nKey="peligro.emergencias" components={[<span key="0" />, <strong key="1" />]} /></p>
        <button ref={boton} className={styles.boton} onClick={onEntendido}>{t("peligro.entendido")}</button>
      </div>
    </div>
  );
}
