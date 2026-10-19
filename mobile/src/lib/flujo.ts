import { router, type Href } from "expo-router";
import { useBorrador } from "@/store/borrador";

/** Paso al que debe volver la persona para continuar su borrador. */
export function rutaParaContinuar(): Href {
  const b = useBorrador.getState();
  if (b.generacionEnCurso) return "/nuevo/disenando";
  if (!b.espacio && !b.omitioEspacio) return "/nuevo/espacio";
  if (!b.tipo || !b.descripcion.trim()) return "/nuevo/necesidad";
  return "/nuevo/restricciones";
}

/** Abre el flujo en el paso pendiente, apilando los anteriores para que "atrás" funcione. */
export function continuarBorrador() {
  const destino = rutaParaContinuar();
  const orden: Href[] = ["/nuevo/espacio", "/nuevo/necesidad", "/nuevo/restricciones"];
  if (destino === "/nuevo/disenando") {
    router.push(destino);
    return;
  }
  router.push("/nuevo/espacio");
  for (const r of orden.slice(1, orden.indexOf(destino) + 1)) router.push(r);
}

export function cerrarFlujo() {
  router.dismissTo("/");
}
