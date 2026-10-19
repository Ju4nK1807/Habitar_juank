import { useCallback, useEffect, useState } from "react";
import { api, ErrorApi } from "@/servicios/api";
import type { Catalogos } from "@/servicios/tipos";

let cache: Catalogos | null = null;

/** Tipos, materiales y presupuestos casi no cambian: se piden una vez por sesión. */
export function useCatalogos() {
  const [datos, setDatos] = useState<Catalogos | null>(cache);
  const [error, setError] = useState<ErrorApi | null>(null);

  const cargar = useCallback(async () => {
    try {
      cache = await api.catalogos();
      setDatos(cache);
      setError(null);
    } catch (e) {
      setError(e instanceof ErrorApi ? e : new ErrorApi("No pudimos cargar las opciones", "desconocido", 0));
    }
  }, []);

  useEffect(() => {
    if (cache) return;
    let vivo = true;
    api.catalogos()
      .then((d) => {
        cache = d;
        if (vivo) setDatos(d);
      })
      .catch((e) => {
        if (vivo) setError(e instanceof ErrorApi ? e : new ErrorApi("No pudimos cargar las opciones", "desconocido", 0));
      });
    return () => {
      vivo = false;
    };
  }, []);

  return { datos, error, recargar: cargar };
}
