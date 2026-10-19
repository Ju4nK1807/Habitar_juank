import type { ErrorRequestHandler } from "express";

/** Error con mensaje listo para mostrar a la persona (voz de la interfaz). */
export class ErrorApi extends Error {
  estado: number;
  codigo: string;
  constructor(estado: number, codigo: string, mensaje: string) {
    super(mensaje);
    this.estado = estado;
    this.codigo = codigo;
  }
}

export const noEncontrado = (que: string) =>
  new ErrorApi(404, "no_encontrado", `No encontramos ${que}. Puede que se haya borrado`);

export const manejarErrores: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ErrorApi) {
    res.status(err.estado).json({ error: { codigo: err.codigo, mensaje: err.message } });
    return;
  }
  if (err?.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ error: { codigo: "foto_grande", mensaje: "La foto pesa más de 10 MB. Elija otra o tómela de nuevo" } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { codigo: "interno", mensaje: "Algo falló en el servidor. Intente de nuevo" } });
};
