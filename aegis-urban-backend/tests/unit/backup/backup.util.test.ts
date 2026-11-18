import {
  ConfigPg, comandoDump, comandoPsql, debeCrearBackup, esNombreBaseSeguro, esNombreValido, nombreBackup, seleccionarParaBorrar,
} from "../../../src/modules/backup/backup.util";

const cfg = (modo: "docker" | "local"): ConfigPg => ({ modo, contenedor: "aegis_postgres", host: "localhost", port: 5555, user: "aegis_app_user", password: "pw" });

describe("nombres de respaldo", () => {
  it("el nombre es cronológico y válido", () => {
    const n = nombreBackup(new Date(2026, 10, 18, 9, 5, 7));
    expect(n).toBe("aegis_20261118_090507.sql.gz");
    expect(esNombreValido(n)).toBe(true);
    expect(esNombreValido(nombreBackup(new Date(2026, 0, 1, 0, 0, 0), "_pre-restore"))).toBe(true);
  });
  it.each(["../../etc/passwd", "aegis_2026.sql.gz", "aegis_20261118_090507.sql", "x/aegis_20261118_090507.sql.gz", "aegis_20261118_090507.sql.gz; rm -rf /", ""])(
    "rechaza el nombre peligroso %p", (n) => expect(esNombreValido(n)).toBe(false));
});

describe("retención", () => {
  const nombres = ["aegis_20261101_000000.sql.gz", "aegis_20261103_000000.sql.gz", "aegis_20261102_000000.sql.gz", "aegis_20261104_000000.sql.gz", "basura.txt"];
  it("conserva los N más nuevos y devuelve el resto para borrar", () =>
    expect(seleccionarParaBorrar(nombres, 2)).toEqual(["aegis_20261102_000000.sql.gz", "aegis_20261101_000000.sql.gz"]));
  it("nunca borra todo: la retención mínima es 1", () => expect(seleccionarParaBorrar(nombres, 0)).toHaveLength(3));
  it("ignora archivos que no son respaldos", () => expect(seleccionarParaBorrar(["basura.txt"], 1)).toEqual([]));
});

describe("debeCrearBackup", () => {
  const ahora = new Date("2026-11-18T12:00:00Z");
  it("si no hay ninguno, sí", () => expect(debeCrearBackup(null, ahora)).toBe(true));
  it("si el último es de hace 23 h, no", () => expect(debeCrearBackup(new Date("2026-11-17T13:00:00Z"), ahora)).toBe(false));
  it("si el último es de hace 25 h, sí", () => expect(debeCrearBackup(new Date("2026-11-17T11:00:00Z"), ahora)).toBe(true));
});

describe("nombre de base temporal", () => {
  it("acepta solo minúsculas, números y _", () => {
    expect(esNombreBaseSeguro("aegis_simulacro_1763460000000")).toBe(true);
    expect(esNombreBaseSeguro("a; DROP DATABASE x")).toBe(false);
    expect(esNombreBaseSeguro("Aegis")).toBe(false);
  });
});

describe("comandos de pg_dump y psql", () => {
  it("modo docker usa docker exec con el contenedor y no manda la contraseña", () => {
    const c = comandoDump(cfg("docker"), "mi_base");
    expect(c.cmd).toBe("docker");
    expect(c.args.slice(0, 3)).toEqual(["exec", "aegis_postgres", "pg_dump"]);
    expect(c.env).toEqual({});
  });
  it("el volcado conserva los privilegios (la bitácora no admite UPDATE/DELETE)", () => {
    expect(comandoDump(cfg("docker"), "b").args).not.toContain("--no-privileges");
    expect(comandoDump(cfg("docker"), "b").args).toEqual(expect.arrayContaining(["--clean", "--if-exists", "--no-owner"]));
  });
  it("modo local usa pg_dump del PATH y pasa la contraseña por entorno, no por argumentos", () => {
    const c = comandoDump(cfg("local"), "b");
    expect(c.cmd).toBe("pg_dump");
    expect(c.args).toEqual(expect.arrayContaining(["-h", "localhost", "-p", "5555"]));
    expect(c.args.join(" ")).not.toContain("pw");
    expect(c.env).toEqual({ PGPASSWORD: "pw" });
  });
  it("psql restaura en una sola transacción y corta ante el primer error", () => {
    const c = comandoPsql(cfg("docker"), "b");
    expect(c.args).toEqual(expect.arrayContaining(["-1", "ON_ERROR_STOP=1"]));
    expect(c.args).toContain("-i"); // lee el SQL por stdin dentro del contenedor
  });
});
