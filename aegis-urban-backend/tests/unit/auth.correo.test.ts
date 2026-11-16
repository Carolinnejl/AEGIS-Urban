import nodemailer from "nodemailer";
import { construirCorreo } from "../../src/modules/auth/correo-verificacion";
import { CanalEmailSmtp, canalSimulado } from "../../src/modules/auth/canales-verificacion";
import { validarSmtp } from "../../src/config/smtp";
import { VIGENCIA_MIN } from "../../src/modules/auth/verificacion";

describe("construirCorreo", () => {
  const c = construirCorreo("123456");
  it("incluye el código en el asunto, el texto y el HTML", () => {
    expect(c.asunto).toContain("123456");
    expect(c.texto).toContain("123456");
    expect(c.html).toContain("123456");
  });
  it("avisa la vigencia y que no hay que compartir el código", () => {
    expect(c.texto).toContain(`${VIGENCIA_MIN} minutos`);
    expect(c.texto).toMatch(/Nunca compartas/);
  });
});

describe("CanalEmailSmtp", () => {
  it("envía el correo al destinatario con el remitente configurado y no es simulado", async () => {
    const transporte = nodemailer.createTransport({ jsonTransport: true });
    const espia = jest.spyOn(transporte, "sendMail");
    jest.spyOn(console, "log").mockImplementation(() => undefined);

    const canal = new CanalEmailSmtp(transporte, "AEGIS Urban <aegis@example.com>");
    await canal.enviar("vecina@mail.com", "654321");

    expect(canal.simulado).toBe(false);
    expect(espia).toHaveBeenCalledTimes(1);
    expect(espia.mock.calls[0][0]).toMatchObject({ from: "AEGIS Urban <aegis@example.com>", to: "vecina@mail.com" });
    expect(String(espia.mock.calls[0][0].text)).toContain("654321");
  });

  it("no escribe el código en los logs", async () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => undefined);
    await new CanalEmailSmtp(nodemailer.createTransport({ jsonTransport: true }), "a@b.com").enviar("x@y.com", "999888");
    expect(log.mock.calls.flat().join(" ")).not.toContain("999888");
  });

  it("si el SMTP falla, propaga el error (el servicio lo traduce a 502)", async () => {
    const transporte = nodemailer.createTransport({ jsonTransport: true });
    jest.spyOn(transporte, "sendMail").mockRejectedValue(new Error("SMTP caído"));
    await expect(new CanalEmailSmtp(transporte, "a@b.com").enviar("x@y.com", "111111")).rejects.toThrow("SMTP caído");
  });
});

describe("canalSimulado", () => {
  it("el celular siempre es simulado", () => expect(canalSimulado("PHONE")).toBe(true));
  it("el correo es simulado si VERIFICACION_EMAIL_REAL no está activado (valor por defecto)", () =>
    expect(canalSimulado("EMAIL")).toBe(true));
});

describe("validarSmtp", () => {
  const ok = { SMTP_HOST: "smtp.gmail.com", SMTP_PORT: "465", SMTP_USER: "a@gmail.com", SMTP_PASS: "abcdabcdabcdabcd", SMTP_FROM: "AEGIS <a@gmail.com>" };
  it("acepta una configuración completa", () => expect(validarSmtp(ok)).toEqual([]));
  it("informa todo lo que falta", () => expect(validarSmtp({})).toHaveLength(5));
  it("rechaza un puerto inválido", () => expect(validarSmtp({ ...ok, SMTP_PORT: "abc" }).join()).toMatch(/SMTP_PORT/));
  it("rechaza un remitente sin arroba", () => expect(validarSmtp({ ...ok, SMTP_FROM: "AEGIS" }).join()).toMatch(/SMTP_FROM/));
});
