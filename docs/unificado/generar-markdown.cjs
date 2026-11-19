#!/usr/bin/env node
/**
 * Genera, a partir de docs/unificado/maestro.md, el documento funcional en Markdown para leerlo en GitHub:
 *   - docs/AEGIS-Urban-Documento-Funcional-Unificado.md  (un solo archivo, lectura continua)
 *   - docs/documento/00-portada.md ... 05-etapa-4-release.md  (una página por etapa, con flechas ← →)
 * Los diagramas Mermaid se dibujan solos en GitHub. No editar a mano los archivos generados:
 * se edita el maestro o los Markdown fuente y se vuelve a ejecutar:  node docs/unificado/generar-markdown.cjs
 */
const fs = require("fs"), path = require("path");
const { expandir, docs } = require("./expandir.cjs");

const AVISO = "<!-- Archivo generado por docs/unificado/generar-markdown.cjs. No editar: cambiar el maestro o las fuentes y regenerar. -->\n";

// ── 1. Del maestro (con HTML para el PDF) a Markdown plano que GitHub renderiza ──────────
let md = expandir();
md = md.replace(/<div class="portada">[\s\S]*?<\/div>/, (bloque) => {
  const kicker = /<p class="kicker">([\s\S]*?)<\/p>/.exec(bloque)?.[1] ?? "";
  const titulo = /^# (.*)$/m.exec(bloque)?.[1] ?? "AEGIS Urban";
  const sub = /<p class="subtitulo">([\s\S]*?)<\/p>/.exec(bloque)?.[1] ?? "";
  return `# ${titulo}\n\n**${kicker}**\n\n> ${sub}`;
});
md = md.replace(/<h3 class="nonum">([\s\S]*?)<\/h3>/g, "### $1");
md = md.replace(/<div class="salto"><\/div>/g, "---");

// ── 2. Título → ancla (algoritmo de GitHub) ──────────────────────────────────────────────
const limpiar = (t) => t.replace(/`/g, "").replace(/\*\*|__/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").trim();
function crearSlugger() {
  const usados = new Map();
  return (texto) => {
    const base = limpiar(texto).toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s/g, "-");
    const n = usados.get(base) ?? 0;
    usados.set(base, n + 1);
    return n === 0 ? base : `${base}-${n}`;
  };
}

/** Recorre los títulos de nivel 1 a 3 fuera de bloques de código. */
function titulos(texto) {
  const salida = [];
  let fence = false;
  for (const l of texto.split("\n")) {
    if (/^```/.test(l)) fence = !fence;
    const m = !fence && /^(#{1,3})\s+(.*)$/.exec(l);
    if (m) salida.push({ nivel: m[1].length, texto: m[2].trim() });
  }
  return salida;
}

// ── 3. Páginas: portada + una por cada título de nivel 1 ─────────────────────────────────
const partes = [];
{
  // La portada llega hasta el primer "# 1. ..."; cada título de nivel 1 numerado abre una página.
  let actual = { lineas: [] }, fence = false;
  for (const l of md.split("\n")) {
    if (/^```/.test(l)) fence = !fence;
    if (!fence && /^# \d+\. /.test(l)) { partes.push(actual); actual = { lineas: [] }; }
    actual.lineas.push(l);
  }
  partes.push(actual);
}
const ARCHIVOS = ["00-portada.md", "01-introduccion.md", "02-etapa-1-analisis.md", "03-etapa-2-diseno.md", "04-etapa-3-implementacion.md", "05-etapa-4-release.md"];
const NOMBRES = ["Portada e índice", "Introducción y alcance", "Etapa 1 — Análisis y factibilidad", "Etapa 2 — Diseño y arquitectura", "Etapa 3 — Implementación y testing", "Etapa 4 — Release y cierre"];
if (partes.length !== ARCHIVOS.length) throw new Error(`Se esperaban ${ARCHIVOS.length} páginas y salieron ${partes.length}`);
partes.forEach((p) => (p.texto = p.lineas.join("\n").trimEnd() + "\n"));

// ── 4. Índice general (con enlaces) ──────────────────────────────────────────────────────
function indice(enlace) {
  const lineas = [];
  partes.forEach((p, i) => {
    const slug = crearSlugger();
    titulos(p.texto).forEach((t) => {
      const ancla = slug(t.texto);
      if (i === 0) return;                       // la portada no se indexa a sí misma
      if (t.nivel > 3) return;
      lineas.push(`${"  ".repeat(t.nivel - 1)}- [${limpiar(t.texto)}](${enlace(i, ancla)})`);
    });
  });
  return lineas.join("\n");
}
const TOC = "<!--toc-->";
partes[0].texto = partes[0].texto.replace(/(### Índice general)\s*\n(\s*<nav id="toc"><\/nav>)?/, `$1\n\n${TOC}\n`);

// ── 5. Documento único ───────────────────────────────────────────────────────────────────
{
  const unico = partes.map((p) => p.texto).join("\n").replace(TOC, indice((_, ancla) => `#${ancla}`));
  const cabecera = "[← Volver al README](../README.md) · [Leer por páginas →](documento/00-portada.md) · [Descargar PDF](pdf/AEGIS-Urban-Documento-Funcional-Unificado.pdf)\n\n";
  const pie = "\n---\n\n[← Volver al README](../README.md) · [Leer por páginas →](documento/00-portada.md)\n";
  fs.writeFileSync(path.join(docs, "AEGIS-Urban-Documento-Funcional-Unificado.md"), AVISO + cabecera + unico + pie);
}

// ── 6. Páginas con flechas ← → ───────────────────────────────────────────────────────────
const dirPaginas = path.join(docs, "documento");
fs.mkdirSync(dirPaginas, { recursive: true });
for (const f of fs.readdirSync(dirPaginas)) if (f.endsWith(".md")) fs.unlinkSync(path.join(dirPaginas, f));

const enlacePagina = (i, ancla) => `${ARCHIVOS[i]}#${ancla}`;
partes.forEach((p, i) => {
  const prev = i === 0
    ? "[← README](../../README.md)"
    : `[← ${NOMBRES[i - 1]}](${ARCHIVOS[i - 1]})`;
  const next = i === partes.length - 1
    ? "[Volver al README →](../../README.md)"
    : `[${NOMBRES[i + 1]} →](${ARCHIVOS[i + 1]})`;
  const nav = `${prev} · [Índice](00-portada.md#índice-general) · ${next}`;
  const cuerpo = p.texto
    .replace(TOC, indice(enlacePagina))
    .replace(/\]\(documento-funcional\/img\//g, "](../documento-funcional/img/");
  const extra = i === 0 ? "\n[Leer todo en un solo archivo](../AEGIS-Urban-Documento-Funcional-Unificado.md) · [PDF](../pdf/AEGIS-Urban-Documento-Funcional-Unificado.pdf)\n" : "";
  fs.writeFileSync(path.join(dirPaginas, ARCHIVOS[i]), `${AVISO}${nav}\n\n${cuerpo}${extra}\n---\n\n${nav}\n`);
});

// Imágenes del documento único: la ruta documento-funcional/img/ ya es relativa a docs/.
console.log(`Generado: docs/AEGIS-Urban-Documento-Funcional-Unificado.md y ${partes.length} páginas en docs/documento/`);
