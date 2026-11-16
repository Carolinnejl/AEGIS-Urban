import {
  ESPERA_REENVIO_S, MAX_INTENTOS, enmascararEmail, enmascararTelefono, evaluarIntento,
  generarCodigo, hashCodigo, hashesIguales, normalizarTelefono, RegistroCodigo,
} from "../../src/modules/auth/verificacion";

const SECRETO = "s".repeat(64);

describe("generarCodigo", () => {
  it("siempre tiene 6 dígitos (con ceros a la izquierda)", () => {
    for (let i = 0; i < 300; i++) expect(generarCodigo()).toMatch(/^\d{6}$/);
  });
  it("no devuelve siempre el mismo valor", () => {
    expect(new Set(Array.from({ length: 50 }, generarCodigo)).size).toBeGreaterThan(40);
  });
});

describe("hashCodigo", () => {
  it("es determinístico y de 64 caracteres hex", () => {
    const h = hashCodigo(1, "EMAIL", "123456", SECRETO);
    expect(h).toBe(hashCodigo(1, "EMAIL", "123456", SECRETO));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
  it("un código de EMAIL no sirve para PHONE ni para otro usuario", () => {
    const base = hashCodigo(1, "EMAIL", "123456", SECRETO);
    expect(hashCodigo(1, "PHONE", "123456", SECRETO)).not.toBe(base);
    expect(hashCodigo(2, "EMAIL", "123456", SECRETO)).not.toBe(base);
  });
  it("depende del secreto del servidor", () =>
    expect(hashCodigo(1, "EMAIL", "123456", "otro".repeat(16))).not.toBe(hashCodigo(1, "EMAIL", "123456", SECRETO)));
  it("hashesIguales compara en tiempo constante y rechaza longitudes distintas", () => {
    const h = hashCodigo(1, "EMAIL", "000000", SECRETO);
    expect(hashesIguales(h, h)).toBe(true);
    expect(hashesIguales(h, "abcd")).toBe(false);
  });
});

describe("enmascarar", () => {
  it("email: deja la primera letra y el dominio", () => expect(enmascararEmail("vecina@mail.com")).toBe("v•••••@mail.com"));
  it("email inválido no filtra nada", () => expect(enmascararEmail("sin-arroba")).toBe("••••"));
  it("teléfono: deja los últimos 4 dígitos", () => expect(enmascararTelefono("+5491122334455")).toMatch(/^•+4455$/));
});

describe("normalizarTelefono", () => {
  it.each([["+54 9 11 2233-4455", "+5491122334455"], ["(011) 4455 6677", "01144556677"], ["1122334455", "1122334455"]])(
    "%s → %s", (crudo, esperado) => expect(normalizarTelefono(crudo)).toBe(esperado));
  it.each(["", "123", "abc12345678", "1234567890123456"])("rechaza %p", (crudo) => expect(normalizarTelefono(crudo)).toBeNull());
});

describe("evaluarIntento", () => {
  const ahora = new Date("2026-11-12T12:00:00Z");
  const bueno = hashCodigo(1, "EMAIL", "123456", SECRETO);
  const registro = (extra: Partial<RegistroCodigo> = {}): RegistroCodigo => ({
    codeHash: bueno, attempts: 0, expiresAt: new Date(ahora.getTime() + 60_000), consumedAt: null, ...extra,
  });

  it("código correcto y vigente → OK", () => expect(evaluarIntento(registro(), bueno, ahora)).toBe("OK"));
  it("código incorrecto → INCORRECTO", () =>
    expect(evaluarIntento(registro(), hashCodigo(1, "EMAIL", "999999", SECRETO), ahora)).toBe("INCORRECTO"));
  it("vencido → EXPIRADO (aunque el código sea el correcto)", () =>
    expect(evaluarIntento(registro({ expiresAt: new Date(ahora.getTime() - 1) }), bueno, ahora)).toBe("EXPIRADO"));
  it(`tras ${MAX_INTENTOS} fallos → BLOQUEADO (aunque ahora acierte)`, () =>
    expect(evaluarIntento(registro({ attempts: MAX_INTENTOS }), bueno, ahora)).toBe("BLOQUEADO"));
  it("un código ya usado no se puede reutilizar", () =>
    expect(evaluarIntento(registro({ consumedAt: ahora }), bueno, ahora)).toBe("YA_USADO"));
  it("con un intento menos que el máximo todavía se puede acertar", () =>
    expect(evaluarIntento(registro({ attempts: MAX_INTENTOS - 1 }), bueno, ahora)).toBe("OK"));
});

it("hay una espera entre códigos para frenar el reenvío masivo", () => expect(ESPERA_REENVIO_S).toBeGreaterThanOrEqual(30));
