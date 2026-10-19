import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, BackHandler, Easing, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Check, Circle, LoaderCircle, type LucideIcon } from "lucide-react-native";
import { api, ErrorApi } from "@/servicios/api";
import { useTema } from "@/theme/tema";
import { espacio, margen, radio } from "@/theme/tokens";
import { useBorrador } from "@/store/borrador";
import type { Generacion } from "@/servicios/tipos";
import { Pantalla, BarraFija } from "@/componentes/Pantalla";
import { Pasos } from "@/componentes/Pasos";
import { Texto } from "@/componentes/Texto";
import { Icono } from "@/componentes/Icono";
import { Boton } from "@/componentes/Boton";
import { Aviso } from "@/componentes/Aviso";
import { toast } from "@/componentes/Toast";

const CONSULTA_MS = 2000;
const LIMITE_SIN_CAMBIOS_MS = 90_000;

// Los mensajes rotan cada 5 s, pero solo dentro de la etapa real en la que va el servidor.
const MENSAJES = {
  propuestas: [
    "Leyendo lo que necesita",
    "Ajustando las medidas al rincón. Toma unos 20 segundos",
    "Armando el despiece de cada propuesta",
    "Calculando material y precio",
  ],
  imagenes: [
    "Dibujando las cuatro propuestas",
    "Cuidando la luz y los materiales",
    "Revisando proporciones",
  ],
  ubicando: [
    "Poniendo cada propuesta en su foto",
    "Ajustando el tamaño a sus medidas",
    "Cuidando la luz de su espacio",
  ],
};

export default function Diseñando() {
  const { c } = useTema();
  const id = useBorrador((b) => b.generacionEnCurso);
  const [gen, setGen] = useState<Generacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [atascado, setAtascado] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const ultimoCambio = useRef(0);
  const firma = useRef("");
  const [progreso] = useState(() => new Animated.Value(0));

  // Consulta el estado cada 2 s hasta "listo" o "error".
  useEffect(() => {
    if (!id) return;
    let vivo = true;
    let reloj: ReturnType<typeof setTimeout>;
    ultimoCambio.current = Date.now();
    const consultar = async () => {
      try {
        const g = await api.generacion(id);
        if (!vivo) return;
        setGen(g);
        const f = `${g.estado}|${g.etapa}|${g.imagenesListas}`;
        if (f !== firma.current) {
          firma.current = f;
          ultimoCambio.current = Date.now();
          setAtascado(false);
        }
        if (g.estado === "listo") {
          useBorrador.getState().reiniciar();
          router.replace(`/generacion/${g.id}`);
          return;
        }
        if (g.estado === "error" || g.estado === "cancelado") {
          useBorrador.getState().cambiar({ generacionEnCurso: null });
          setError(g.error ?? "No pudimos terminar el diseño. El crédito no se descontó");
          return;
        }
      } catch (e) {
        // Un fallo de red puntual no corta la espera; el límite de 90 s sí.
        if (e instanceof ErrorApi && e.estado === 404) {
          useBorrador.getState().cambiar({ generacionEnCurso: null });
          setError("No encontramos este diseño. Puede volver a generarlo");
          return;
        }
      }
      if (Date.now() - ultimoCambio.current > LIMITE_SIN_CAMBIOS_MS) setAtascado(true);
      reloj = setTimeout(consultar, CONSULTA_MS);
    };
    void consultar();
    return () => {
      vivo = false;
      clearTimeout(reloj);
    };
  }, [id]);

  const etapa = gen?.etapa === "imagenes" || gen?.etapa === "ubicando" ? gen.etapa : "propuestas";
  const ubicable = !!gen?.contexto.ubicable;

  // Barra: propuestas avanza mientras espera; cada imagen suma; ubicar en la foto cierra el tramo final.
  useEffect(() => {
    const [base, porImagen] = ubicable ? [0.3, 0.1] : [0.4, 0.15];
    const destino = etapa === "propuestas" ? base : etapa === "imagenes" ? base + porImagen * (gen?.imagenesListas ?? 0) : 0.95;
    Animated.timing(progreso, {
      toValue: destino,
      duration: etapa === "imagenes" ? 800 : etapa === "propuestas" ? 8000 : 15000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [etapa, gen?.imagenesListas, progreso, ubicable]);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      etapa === "propuestas" ? "Diseñando las propuestas" : etapa === "imagenes" ? "Dibujando las imágenes" : "Poniendo las propuestas en su foto",
    );
  }, [etapa]);

  // Atrás en Android no interrumpe: hay un botón Cancelar explícito.
  useFocusEffect(
    useCallback(() => {
      const s = BackHandler.addEventListener("hardwareBackPress", () => true);
      return () => s.remove();
    }, []),
  );

  function seguirEsperando() {
    ultimoCambio.current = Date.now();
    setAtascado(false);
  }

  const cancelar = async () => {
    if (!id) return router.dismissTo("/");
    setCancelando(true);
    try {
      await api.cancelarGeneracion(id);
      useBorrador.getState().cambiar({ generacionEnCurso: null });
      toast.exito("Diseño cancelado. El crédito no se descontó");
      router.dismissTo("/");
    } catch (e) {
      toast.error(e instanceof ErrorApi ? e.message : "No pudimos cancelar. Intente de nuevo");
    } finally {
      setCancelando(false);
    }
  };

  if (!id && !error) {
    return (
      <Pantalla bordes={["top", "bottom"]}>
        <View style={{ flex: 1, padding: margen.lateral, justifyContent: "center" }}>
          <Aviso tipo="info" mensaje="No hay ningún diseño en curso." accion={{ texto: "Volver al inicio", onPress: () => router.dismissTo("/") }} />
        </View>
      </Pantalla>
    );
  }

  return (
    <Pantalla bordes={["top", "bottom"]}>
      <View style={{ paddingHorizontal: margen.lateral, paddingTop: espacio.s16 }}>
        <Pasos actual={4} />
      </View>

      <View style={{ flex: 1, justifyContent: "center", padding: margen.lateral, gap: espacio.s32 }}>
        {error ? (
          <View style={{ gap: espacio.s16 }}>
            <Texto variante="titleLg" accessibilityRole="header">El diseño no se completó</Texto>
            <Aviso tipo="error" mensaje={error} />
          </View>
        ) : (
          <>
            <View style={{ gap: espacio.s8 }}>
              <Texto variante="titleLg" accessibilityRole="header">Diseñando</Texto>
              <MensajeRotativo key={etapa} mensajes={MENSAJES[etapa]} />
            </View>

            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel="Progreso del diseño"
              accessibilityValue={{ text: etapa === "propuestas" ? "Diseñando propuestas" : etapa === "imagenes" ? `${gen?.imagenesListas ?? 0} de 4 imágenes` : "Poniendo en su foto" }}
              style={{ height: 8, borderRadius: radio.completo, backgroundColor: c.surface300, overflow: "hidden" }}
            >
              <Animated.View style={{ height: "100%", borderRadius: radio.completo, backgroundColor: c.brand500, width: progreso.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }} />
            </View>

            <View style={{ gap: espacio.s12 }}>
              <Etapa icono={etapa === "propuestas" ? LoaderCircle : Check} hecho={etapa !== "propuestas"} texto="Propuestas con medidas, despiece y precio" />
              <Etapa
                icono={etapa === "imagenes" ? LoaderCircle : etapa === "ubicando" ? Check : Circle}
                hecho={etapa === "ubicando"}
                activo={etapa === "imagenes"}
                texto={etapa === "imagenes" ? `Imágenes: ${gen?.imagenesListas ?? 0} de 4 listas` : "Imágenes de las cuatro propuestas"}
              />
              {ubicable ? (
                <Etapa
                  icono={etapa === "ubicando" ? LoaderCircle : Circle}
                  hecho={false}
                  activo={etapa === "ubicando"}
                  texto={`En su foto de «${gen?.contexto.espacioNombre ?? "su espacio"}»`}
                />
              ) : null}
            </View>

            {atascado ? (
              <Aviso
                tipo="alerta"
                titulo="Esto está tardando más de lo normal"
                mensaje="El servicio de IA está lento. Puede seguir esperando o cancelar; si cancela, el crédito no se descuenta."
                accion={{ texto: "Seguir esperando", onPress: seguirEsperando }}
              />
            ) : null}
          </>
        )}
      </View>

      <BarraFija>
        {error ? (
          <>
            <Boton titulo="Volver a las restricciones" onPress={() => (router.canGoBack() ? router.back() : router.dismissTo("/"))} ancho />
            <Boton titulo="Ir al inicio" variante="texto" onPress={() => router.dismissTo("/")} ancho />
          </>
        ) : (
          <Boton titulo="Cancelar" variante="secundario" onPress={cancelar} cargando={cancelando} ancho accessibilityHint="Detiene el diseño y devuelve el crédito" />
        )}
      </BarraFija>
    </Pantalla>
  );
}

/** Rota los mensajes cada 5 s. Se monta de nuevo (key) al cambiar de etapa y empieza desde el primero. */
function MensajeRotativo({ mensajes }: { mensajes: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => x + 1), 5000);
    return () => clearInterval(t);
  }, []);
  return <Texto variante="bodyLg" color="ink600" accessibilityLiveRegion="polite">{mensajes[i % mensajes.length]}</Texto>;
}

function Etapa({ icono, texto, hecho, activo = !hecho }: { icono: LucideIcon; texto: string; hecho: boolean; activo?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.s12 }} accessible accessibilityLabel={`${texto}${hecho ? ", listo" : activo ? ", en curso" : ", pendiente"}`}>
      <Icono de={icono} color={hecho ? "accentInk" : activo ? "brandInk" : "ink400"} />
      <Texto variante="bodyMd" color={hecho || activo ? "ink900" : "ink600"} style={{ flex: 1 }}>{texto}</Texto>
    </View>
  );
}
