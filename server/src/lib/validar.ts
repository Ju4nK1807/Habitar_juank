import { ErrorApi } from "../errores.ts";

const invalido = (mensaje: string) => new ErrorApi(400, "dato_invalido", mensaje);

export function texto(v: unknown, campo: string, max: number, opcional = false): string | null {
  if (v === undefined || v === null || v === "") {
    if (opcional) return null;
    throw invalido(`Falta ${campo}`);
  }
  if (typeof v !== "string") throw invalido(`${campo} no es válido`);
  const t = v.trim();
  if (!t && !opcional) throw invalido(`Falta ${campo}`);
  if (t.length > max) throw invalido(`${campo} supera los ${max} caracteres. Acórtelo`);
  return t || null;
}

export function numero(v: unknown, campo: string, [min, max]: readonly [number, number], opcional = false): number | null {
  if (v === undefined || v === null || v === "") {
    if (opcional) return null;
    throw invalido(`Falta ${campo}`);
  }
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) throw invalido(`${campo} debe ser un número`);
  if (n < min || n > max) throw invalido(`${campo} debe estar entre ${min} y ${max} cm`);
  return Math.round(n * 10) / 10;
}

export function id(v: unknown): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new ErrorApi(400, "id_invalido", "Ese enlace no es válido");
  return n;
}
