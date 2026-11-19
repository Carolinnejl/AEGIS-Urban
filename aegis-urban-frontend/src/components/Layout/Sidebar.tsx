import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { useAuthStore, usePatente } from "../../store/authStore";
import { precargar, precargarEnReposo } from "../../router/paginas";
import LanguageSwitcher from "../LanguageSwitcher/LanguageSwitcher";
import styles from "./Sidebar.module.css";

const NAV_LINKS = [
  { href: "/dashboard",  icono: "⬡", clave: "nav.dashboard" },
  { href: "/mapa",       icono: "🗺", clave: "nav.cityMap" },
  { href: "/sensores",   icono: "📡", clave: "nav.sensors" },
  { href: "/alertas",    icono: "🔔", clave: "nav.alerts" },
  { href: "/simulacion", icono: "⚡", clave: "nav.simulation" },
  { href: "/admin",      icono: "⚙", clave: "nav.admin" },
  { href: "/ayuda",      icono: "?", clave: "ayuda.abrir" },
];

export default function Sidebar() {
  const { t }           = useTranslation();
  const { cerrarSesion } = useAuth();
  const usuario          = useAuthStore((s) => s.usuario);
  const puedeSimular = usePatente("SIMULATION_SCENARIOS_VIEW");
  const puedeAdministrar = usePatente("AUDIT_VIEW");

  // Precarga las pantallas más usadas cuando el navegador está libre.
  useEffect(() => { precargarEnReposo(["/alertas", "/mapa", "/sensores"]); }, []);

  return (
    <nav className={styles.sidebar}>
      <div className={styles.logo}>
        <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
          <path d="M16 2 L28 8 L28 22 L16 30 L4 22 L4 8 Z"
            stroke="var(--color-cyan)" strokeWidth="2" fill="none" />
          <circle cx="16" cy="16" r="3" fill="var(--color-cyan)" />
        </svg>
        <span>AEGIS Urban</span>
      </div>

      <ul className={styles.navList}>
        {NAV_LINKS.filter(({ href }) =>
          (href !== "/simulacion" || puedeSimular) && (href !== "/admin" || puedeAdministrar)
        ).map(({ href, icono, clave }) => (
          <li key={href}>
            <NavLink
              to={href}
              onMouseEnter={() => precargar(href)}
              onFocus={() => precargar(href)}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ""}`
              }
            >
              <span className={styles.icono}>{icono}</span>
              {t(clave)}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className={styles.footer}>
        <LanguageSwitcher />
        <span className={styles.usuario}>{usuario?.familia}</span>
        <span className={styles.username}>{usuario?.username}</span>
        <button onClick={cerrarSesion} className={styles.logoutBtn}>
          {t("nav.logout")}
        </button>
      </div>
    </nav>
  );
}
