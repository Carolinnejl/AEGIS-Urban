import { describe, it, expect, beforeEach } from "vitest";
import { useVerificacionStore } from "./verificacionStore";
import { soloCodigo, type CodigoEmitido } from "../services/verificacion";

const email: CodigoEmitido = { canal: "EMAIL", destinoEnmascarado: "v••••@mail.com", venceEn: "2026-11-12T12:10:00Z", simulado: true, codigoSimulado: "123456" };
const phone: CodigoEmitido = { canal: "PHONE", destinoEnmascarado: "••••4455", venceEn: "2026-11-12T12:10:00Z", simulado: true, codigoSimulado: "654321" };

describe("verificacionStore", () => {
  beforeEach(() => useVerificacionStore.getState().limpiar());

  it("guarda el código de cada canal por separado", () => {
    useVerificacionStore.getState().guardar(email, phone);
    const { codigos } = useVerificacionStore.getState();
    expect(codigos.EMAIL?.codigoSimulado).toBe("123456");
    expect(codigos.PHONE?.codigoSimulado).toBe("654321");
  });

  it("un reenvío reemplaza solo el código de ese canal", () => {
    useVerificacionStore.getState().guardar(email, phone);
    useVerificacionStore.getState().guardar({ ...email, codigoSimulado: "111111" });
    const { codigos } = useVerificacionStore.getState();
    expect(codigos.EMAIL?.codigoSimulado).toBe("111111");
    expect(codigos.PHONE?.codigoSimulado).toBe("654321");
  });

  it("un aviso de un canal se borra cuando llega un código nuevo para ese canal", () => {
    const { avisar, guardar } = useVerificacionStore.getState();
    avisar("EMAIL", "No pudimos enviar el correo");
    avisar("PHONE", "otro aviso");
    guardar(email);
    const { avisos } = useVerificacionStore.getState();
    expect(avisos.EMAIL).toBeUndefined();
    expect(avisos.PHONE).toBe("otro aviso");
  });

  it("limpiar borra todo", () => {
    useVerificacionStore.getState().guardar(email);
    useVerificacionStore.getState().limpiar();
    expect(useVerificacionStore.getState().codigos).toEqual({});
  });
});

describe("soloCodigo", () => {
  it("deja solo dígitos y corta a 6", () => {
    expect(soloCodigo("12a3-45 6789")).toBe("123456");
    expect(soloCodigo("abc")).toBe("");
  });
});
