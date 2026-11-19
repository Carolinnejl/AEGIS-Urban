/**
 * Expande docs/unificado/maestro.md: reemplaza cada línea
 *   @@include <archivo bajo docs/> | <título de sección> | <desplazamiento de nivel> [| skipTitle]
 * por esa sección de los Markdown fuente. Lo usan generar-pdf.cjs y generar-markdown.cjs.
 */
const fs = require("fs"), path = require("path");
const docs = path.resolve(__dirname, "..");

const sinNumero = (t) => t.replace(/^SECCIÓN\s+\d+\s+—\s+/i, "").replace(/^\d+(\.\d+)*\.?\s+/, "").trim();

/** Devuelve el cuerpo de una sección: desde su encabezado hasta el siguiente de igual o mayor jerarquía. */
function seccion(archivo, titulo, desplazamiento, omitirTitulo) {
  const origen = path.join(docs, archivo);
  const lineas = fs.readFileSync(origen, "utf8").replace(/\r/g, "").split("\n");
  const norm = (s) => sinNumero(s.replace(/^#+\s*/, "")).toLowerCase();
  let enFence = false, inicio = -1, nivel = 0;
  const salida = [];
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    if (/^```/.test(l)) enFence = !enFence;
    const m = !enFence && /^(#{1,6})\s+(.*)$/.exec(l);
    if (inicio < 0) {
      if (m && norm(l).startsWith(sinNumero(titulo).toLowerCase())) { inicio = i; nivel = m[1].length; if (!omitirTitulo) salida.push(l); }
      continue;
    }
    if (m && m[1].length <= nivel) break;
    salida.push(l);
  }
  if (inicio < 0) throw new Error(`No se encontró la sección "${titulo}" en ${archivo}`);
  const base = path.dirname(archivo).replace(/\\/g, "/");
  let fence = false;
  return salida.map((l) => {
    if (/^```/.test(l)) fence = !fence;
    if (fence || /^```/.test(l)) return l;
    const m = /^(#{1,6})\s+(.*)$/.exec(l);
    if (m) return "#".repeat(Math.min(6, m[1].length + desplazamiento)) + " " + sinNumero(m[2]);
    // Navegación entre páginas del documento funcional: no aplica en un documento único.
    if (/^\[(←|Índice)/.test(l) || /^\*\*En esta página:\*\*/.test(l)) return "";
    return l
      .replace(/\]\((?:\.\.\/)?img\//g, `](${base === "." ? "" : base + "/"}img/`)
      .replace(/\[([^\]]+)\]\((?!https?:|#|file:)[^)]*\.md[^)]*\)/g, "$1");
  }).join("\n");
}

function expandir() {
  let maestro = fs.readFileSync(path.join(__dirname, "maestro.md"), "utf8").replace(/\r/g, "");
maestro = maestro.replace(/^@@include (.+)$/gm, (_, args) => {
  const [archivo, titulo, desp, opt] = args.split("|").map((s) => s.trim());
  return seccion(archivo, titulo, parseInt(desp, 10) || 0, opt === "skipTitle");
});
  return maestro;
}

module.exports = { expandir, docs };
