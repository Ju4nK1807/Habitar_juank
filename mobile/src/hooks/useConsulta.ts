import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ErrorApi } from "@/servicios/api";

type Estado<T> = { datos: T | undefined; error: ErrorApi | null; cargando: boolean };

/**
 * Carga datos del backend y los refresca cada vez que la pantalla vuelve a tener foco.
 * "cargando" solo es true en la primera carga; los refrescos mantienen los datos visibles.
 * Cada ruta con parámetros (p. ej. /propuesta/3) es una pantalla propia, así que no hace
 * falta escuchar cambios de parámetros aquí.
 */
export function useConsulta<T>(fn: () => Promise<T>) {
  const [estado, setEstado] = useState<Estado<T>>({ datos: undefined, error: null, cargando: true });
  const [refrescando, setRefrescando] = useState(false);
  const montado = useRef(true);
  const ultimaFn = useRef(fn);

  useEffect(() => {
    ultimaFn.current = fn;
  });

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const ejecutar = useCallback(async () => {
    try {
      const datos = await ultimaFn.current();
      if (montado.current) setEstado({ datos, error: null, cargando: false });
    } catch (e) {
      const error = e instanceof ErrorApi ? e : new ErrorApi("Algo falló. Intente de nuevo", "desconocido", 0);
      if (montado.current) setEstado((s) => ({ ...s, error, cargando: false }));
    } finally {
      if (montado.current) setRefrescando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void ejecutar();
    }, [ejecutar]),
  );

  const recargar = useCallback(() => {
    setRefrescando(true);
    return ejecutar();
  }, [ejecutar]);

  return { ...estado, refrescando, recargar };
}
