#!/usr/bin/env node
/**
 * Genera el documento maestro unificado:
 *   docs/pdf/AEGIS-Urban-Documento-Funcional-Unificado.pdf
 *
 * Fuente: docs/unificado/maestro.md. Las líneas
 *   @@include <archivo bajo docs/> | <título de sección> | <desplazamiento de nivel> [| skipTitle]
 * se reemplazan por esa sección de los Markdown fuente (que siguen siendo la fuente de verdad).
 * Requiere Google Chrome (o Edge) instalado y acceso a internet para cargar marked y mermaid desde un CDN.
 *
 * Uso: node docs/unificado/generar-pdf.cjs
 */
const fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process");

const docs = path.resolve(__dirname, "..");
const salida = path.join(docs, "pdf", "AEGIS-Urban-Documento-Funcional-Unificado.pdf");
const navegadores = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];
const navegador = navegadores.find((p) => fs.existsSync(p));
if (!navegador) { console.error("No se encontró Chrome ni Edge."); process.exit(1); }

const urlDe = (p) => "file:///" + p.split("\\").join("/");
const { expandir } = require("./expandir.cjs");
const maestro = expandir();

const css = `
@page { size: A4; margin: 18mm 15mm 20mm 15mm; @bottom-center { content: "AEGIS Urban · Documento Funcional v1.0.0 · Página " counter(page) " de " counter(pages); font: 9px "Segoe UI", Arial, sans-serif; color: #5b6b7a; } }
@page :first { @bottom-center { content: ""; } }
* { box-sizing: border-box; }
body { font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; color: #17212b; line-height: 1.5; font-size: 11px; margin: 0; }
h1, h2, h3, h4, h5 { font-family: "Segoe UI Semibold", "Segoe UI", Arial, sans-serif; color: #0b3d56; line-height: 1.25; break-after: avoid; }
h1 { font-size: 24px; border-bottom: 3px solid #14b8d4; padding-bottom: 6px; margin: 0 0 14px; }
h2 { font-size: 17px; margin: 22px 0 8px; border-bottom: 1px solid #cfdde6; padding-bottom: 3px; }
h3 { font-size: 14px; margin: 16px 0 6px; } h4 { font-size: 12px; margin: 12px 0 4px; color: #1d5b78; } h5, h6 { font-size: 11px; }
p, li { orphans: 3; widows: 3; } a { color: #0b6c8c; text-decoration: none; }
table { border-collapse: collapse; width: 100%; margin: 10px 0 14px; font-size: 10px; break-inside: auto; }
tr { break-inside: avoid; }
th { background: #0f2a3d; color: #fff; text-align: left; padding: 6px 8px; font-weight: 600; border: 1px solid #0f2a3d; }
td { padding: 5px 8px; border: 1px solid #c9d6df; vertical-align: top; }
tbody tr:nth-child(even) td { background: #f3f8fb; }
code { font-family: Consolas, "Cascadia Mono", monospace; background: #eef3f6; padding: 1px 4px; border-radius: 3px; font-size: 0.92em; color: #0b3d56; }
pre { background: #0f1c27; color: #e4eef4; padding: 10px 12px; border-radius: 6px; font-size: 9px; line-height: 1.4; white-space: pre-wrap; word-break: break-word; break-inside: avoid; border-left: 4px solid #14b8d4; }
pre code { background: none; color: inherit; padding: 0; }
blockquote { margin: 10px 0; padding: 4px 12px; border-left: 4px solid #14b8d4; background: #eef8fb; }
img { max-width: 100%; display: block; margin: 8px auto; }
.mermaid { text-align: center; margin: 12px 0; break-inside: avoid; } .mermaid svg { max-width: 100%; height: auto; }
.salto { break-after: page; }
.portada { text-align: left; padding: 30mm 0 8mm; border-left: 8px solid #14b8d4; padding-left: 14px; margin-bottom: 14px; }
.portada h1 { font-size: 44px; border: none; margin: 4px 0 8px; color: #0b3d56; }
.kicker { text-transform: uppercase; letter-spacing: 2px; font-size: 11px; color: #14829c; font-weight: 700; margin: 0; }
.subtitulo { font-size: 14px; color: #37505f; max-width: 150mm; }
h3.nonum { margin-top: 18px; }
#toc { columns: 2; column-gap: 24px; font-size: 10.5px; } #toc div { break-inside: avoid; margin: 1px 0; } #toc .l1 { font-weight: 700; margin-top: 7px; color: #0b3d56; } #toc .l2 { padding-left: 12px; } #toc .l3 { padding-left: 24px; color: #37505f; }
`;

const script = `
const md = ${JSON.stringify(maestro).replace(/</g, "\\u003c")};
const r = new marked.Renderer(); const viejo = r.code.bind(r);
r.code = (c, l) => { const t = typeof c === "object" ? c.text : c; const lang = typeof c === "object" ? c.lang : l;
  return lang === "mermaid" ? '<div class="mermaid">' + t.replace(/</g, "&lt;") + '</div>' : viejo(c, l); };
document.getElementById("c").innerHTML = marked.parse(md, { renderer: r, gfm: true, breaks: false });
// Índice general a partir de los títulos de nivel 1 a 3 (sin la portada).
const toc = document.getElementById("toc"); let n = 0;
document.querySelectorAll("#c h1, #c h2, #c h3").forEach((h) => {
  if (h.classList.contains("nonum") || h.closest(".portada")) return;
  h.id = "s" + (++n);
  const d = document.createElement("div"); d.className = "l" + h.tagName[1];
  d.innerHTML = '<a href="#' + h.id + '">' + h.textContent + '</a>'; toc.appendChild(d);
});
mermaid.initialize({ startOnLoad: false, theme: "default", flowchart: { useMaxWidth: true }, sequence: { useMaxWidth: true } });
mermaid.run({ querySelector: ".mermaid" }).catch(() => {}).finally(() => { document.title = "listo"; });
`;
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>AEGIS Urban — Documento Funcional</title>
<base href="${urlDe(docs)}/"><style>${css}</style></head><body><div id="c"></div>
<script src="https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js"></script>
<script>${script}</script></body></html>`;

const tmp = path.join(os.tmpdir(), "aegis-doc-unificado.html");
fs.writeFileSync(tmp, html);
fs.mkdirSync(path.dirname(salida), { recursive: true });
const r = cp.spawnSync(navegador, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=60000",
  "--print-to-pdf=" + salida, urlDe(tmp)], { stdio: "ignore", timeout: 240000 });
if (!fs.existsSync(salida)) { console.error("No se pudo generar el PDF"); process.exit(1); }
console.log(`PDF generado: ${salida} (${Math.round(fs.statSync(salida).size / 1024)} KB)`);
