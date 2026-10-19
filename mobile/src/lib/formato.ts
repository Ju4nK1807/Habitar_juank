import type { Medidas, Precio } from "@/servicios/tipos";
import type { Moneda, Unidades } from "@/store/preferencias";

const miles = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** Todo precio lleva "aprox.". Si no hay TRM para USD, se muestra en COP. */
export function precioTexto(p: Precio, moneda: Moneda, conAprox = true) {
  const sufijo = conAprox ? " aprox." : "";
  if (moneda === "USD" && p.usd !== null) return `US$ ${miles(p.usd)}${sufijo}`;
  return `$ ${miles(p.cop)}${sufijo}`;
}

export const CM_POR_PULGADA = 2.54;

const decimal = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

export function medida(cm: number, u: Unidades) {
  return u === "in" ? `${decimal(Math.round((cm / CM_POR_PULGADA) * 10) / 10)} in` : `${decimal(cm)} cm`;
}

export function medidasTexto(m: Medidas, u: Unidades) {
  const f = (cm: number) => (u === "in" ? decimal(Math.round((cm / CM_POR_PULGADA) * 10) / 10) : decimal(cm));
  return `${f(m.anchoCm)} × ${f(m.altoCm)} × ${f(m.fondoCm)} ${u}`;
}

/** Convierte lo que escribe la persona (en sus unidades) a cm. Acepta coma decimal. */
export function aCm(texto: string, u: Unidades): number | null {
  const n = Number(texto.replace(",", ".").trim());
  if (!texto.trim() || !Number.isFinite(n)) return null;
  return u === "in" ? Math.round(n * CM_POR_PULGADA * 10) / 10 : n;
}

export function desdeCm(cm: number | null | undefined, u: Unidades): string {
  if (cm === null || cm === undefined) return "";
  return u === "in" ? decimal(Math.round((cm / CM_POR_PULGADA) * 10) / 10) : decimal(cm);
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function fechaLarga(d = new Date()) {
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"][d.getMonth()]}`;
}

export function fechaCorta(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

export function hace(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "Ahora";
  if (min < 60) return `Hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "Ayer";
  if (d < 7) return `Hace ${d} días`;
  return fechaCorta(iso);
}

export function saludo(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
