import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { useAuth } from "../../context/AuthContext";
import LanguageSwitcher from "../../components/LanguageSwitcher/LanguageSwitcher";
import { LEGAL } from "../../legal/textos";
import styles from "../Login/LoginPage.module.css";
import extra from "./RegisterPage.module.css";

export default function RegisterPage() {
  const { t } = useTranslation();
  const { registrar } = useAuth();
  const [usuario, setUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [terminos, setTerminos] = useState(false);
  const [privacidad, setPrivacidad] = useState(false);
  const [edad, setEdad] = useState(false);
  const [ubicacion, setUbicacion] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Los tres consentimientos obligatorios habilitan el botón; la ubicación es opcional.
  const puedeEnviar = !!usuario && !!email && telefono.replace(/\D/g, "").length >= 8 && contrasena.length >= 10 && terminos && privacidad && edad && !cargando;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!puedeEnviar) return;
    setError(null);
    setCargando(true);
    try {
      await registrar({
        username: usuario, email, telefono, password: contrasena,
        aceptaTerminos: terminos, aceptaPrivacidad: privacidad, declaraEdad: edad, aceptaUbicacion: ubicacion,
        versionTerminos: LEGAL.VERSION_TERMINOS, versionPrivacidad: LEGAL.VERSION_PRIVACIDAD,
      });
    } catch (err) {
      // Los mensajes de validación vienen del servidor (en español); si no hay, se usa el texto genérico traducido.
      setError(isAxiosError(err) && err.response?.data?.error ? String(err.response.data.error) : t("registro.errorGenerico"));
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className={styles.page}>
      <LanguageSwitcher flotante />
      <div className={styles.bgGrid} aria-hidden="true" />
      <main className={`${styles.card} ${extra.ancha}`}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t("registro.titulo")}</h1>
          <p className={styles.subtitle}>{t("registro.subtitulo")}</p>
        </header>

        <form onSubmit={enviar} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="r-usuario" className={styles.label}>{t("registro.usuario")}</label>
            <input id="r-usuario" autoComplete="username" placeholder={t("registro.usuarioPH")}
              value={usuario} onChange={(e) => setUsuario(e.target.value)} disabled={cargando} />
          </div>
          <div className={styles.field}>
            <label htmlFor="r-email" className={styles.label}>{t("registro.email")}</label>
            <input id="r-email" type="email" autoComplete="email" placeholder={t("registro.emailPH")}
              value={email} onChange={(e) => setEmail(e.target.value)} disabled={cargando} />
          </div>
          <div className={styles.field}>
            <label htmlFor="r-tel" className={styles.label}>{t("registro.celular")}</label>
            <input id="r-tel" type="tel" autoComplete="tel" placeholder={t("registro.celularPH")}
              value={telefono} onChange={(e) => setTelefono(e.target.value)} disabled={cargando} />
          </div>
          <div className={styles.field}>
            <label htmlFor="r-pass" className={styles.label}>{t("registro.contrasena")}</label>
            <input id="r-pass" type="password" autoComplete="new-password" placeholder={t("registro.contrasenaPH")}
              value={contrasena} onChange={(e) => setContrasena(e.target.value)} disabled={cargando} />
          </div>

          <fieldset className={extra.consentimientos}>
            <legend>{t("registro.consentimientos")}</legend>

            <label className={extra.check}>
              <input type="checkbox" checked={terminos} onChange={(e) => setTerminos(e.target.checked)} />
              <span><Trans i18nKey="registro.terminos" components={[<span key="0" />, <Link key="1" to="/terminos" target="_blank" />, <em key="2" />]} /></span>
            </label>

            <label className={extra.check}>
              <input type="checkbox" checked={privacidad} onChange={(e) => setPrivacidad(e.target.checked)} />
              <span><Trans i18nKey="registro.privacidad" components={[<span key="0" />, <Link key="1" to="/privacidad" target="_blank" />, <em key="2" />]} /></span>
            </label>

            <label className={extra.check}>
              <input type="checkbox" checked={edad} onChange={(e) => setEdad(e.target.checked)} />
              <span><Trans i18nKey="registro.edad" values={{ edad: LEGAL.EDAD_MINIMA }} components={[<span key="0" />, <em key="1" />]} /></span>
            </label>

            <label className={`${extra.check} ${extra.opcional}`}>
              <input type="checkbox" checked={ubicacion} onChange={(e) => setUbicacion(e.target.checked)} />
              <span>
                <strong>{t("registro.ubicacion")}</strong> <Trans i18nKey="registro.ubicacionDesc" components={[<span key="0" />, <em key="1" />]} />
                <small>
                  <span>{t("registro.ubicacionP1")}</span>
                  <span>{t("registro.ubicacionP2")}</span>
                  <span>{t("registro.ubicacionP3")}</span>
                </small>
              </span>
            </label>
          </fieldset>

          {error && <p className={styles.error} role="alert">{error}</p>}

          <button type="submit" disabled={!puedeEnviar} className={styles.submitBtn}>
            {cargando ? <><span className={styles.btnSpinner} />{t("registro.enviando")}</> : t("registro.enviar")}
          </button>
        </form>

        <footer className={extra.pie}>
          <Link to="/login">{t("registro.yaTengo")}</Link>
          <Link to="/ciudadano">{t("registro.verSinCuenta")}</Link>
        </footer>
      </main>
    </div>
  );
}
