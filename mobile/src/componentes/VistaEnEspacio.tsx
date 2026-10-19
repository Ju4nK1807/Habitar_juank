import { useRef, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import Svg, { Rect } from "react-native-svg";
import { ImagePlus, MoveHorizontal, Ruler } from "lucide-react-native";
import { api, ErrorApi, urlArchivo } from "@/servicios/api";
import type { Espacio, Propuesta } from "@/servicios/tipos";
import { useConsulta } from "@/hooks/useConsulta";
import { useTema } from "@/theme/tema";
import { espacio, radio } from "@/theme/tokens";
import { rectanguloMueble } from "@/lib/ubicacion";
import { Texto } from "./Texto";
import { Boton } from "./Boton";
import { Aviso } from "./Aviso";
import { Chip, GrupoChips } from "./Chip";
import { Etiqueta, tipoAjuste } from "./Etiqueta";
import { Esqueleto } from "./Esqueleto";
import { DibujoEscala } from "./DibujoEscala";
import { FotoMedible } from "./FotoMedible";

type Vista = "foto" | "escala";
type Props = { propuesta: Propuesta; onGenerada: () => void; onCerrar: () => void };

/**
 * Dos formas de ver la propuesta en el espacio:
 * - En su foto: la foto real con el mueble recortado de su imagen y puesto a escala. El tamaño y
 *   la posición salen de las marcas del muro y las medidas.
 * - A escala: dibujo exacto con las cotas. Es la fuente de verdad del ajuste.
 */
export function VistaEnEspacio({ propuesta: p, onGenerada, onCerrar }: Props) {
  const tieneFoto = !!p.fotoEspacioUrl && !!p.imagenUrl;
  const [vista, setVista] = useState<Vista>(tieneFoto ? "foto" : "escala");
  const esp = useConsulta(() => (p.espacioId ? api.espacio(p.espacioId) : Promise.resolve(null)));

  return (
    <View style={{ gap: espacio.s16 }}>
      <GrupoChips>
        <Chip texto="En su foto" activo={vista === "foto"} onPress={() => setVista("foto")} deshabilitado={!tieneFoto} />
        <Chip texto="A escala" activo={vista === "escala"} onPress={() => setVista("escala")} />
      </GrupoChips>

      {vista === "escala" ? (
        <>
          {!tieneFoto ? (
            <Texto variante="bodySm" color="ink600">
              {p.fotoEspacioUrl ? "Esta propuesta no tiene imagen para ubicarla en su foto." : "Este diseño se hizo sin foto del espacio. Guarde el espacio con foto para verlo ahí."}
            </Texto>
          ) : null}
          <Texto variante="bodyMd" color="ink600">
            {p.ajuste === "sin_medidas"
              ? "Dibujo del mueble con sus medidas."
              : `Dibujo a escala con las medidas ${p.medidasOrigen === "ia" ? "estimadas por la IA" : "del espacio"}${p.ajuste === "no_cabe" ? ". La parte que excede se ve fuera del muro." : "."}`}
          </Texto>
          <DibujoEscala propuesta={p} />
          <Etiqueta tipo={tipoAjuste(p.ajuste)} texto={p.etiquetaAjuste} />
        </>
      ) : esp.cargando && !esp.datos ? (
        <Esqueleto alto={360} radio={radio.tarjeta} />
      ) : esp.error ? (
        <Aviso tipo={esp.error.sinConexion ? "sinConexion" : "error"} mensaje={esp.error.message} accion={{ texto: "Reintentar", onPress: esp.recargar }} />
      ) : !esp.datos ? (
        <Aviso tipo="info" mensaje="El espacio de este diseño ya no existe. Use la vista a escala." />
      ) : !esp.datos.marcas || !esp.datos.fotoUrl ? (
        <Aviso
          tipo="info"
          titulo="Falta marcar el muro"
          mensaje="Toque en su foto los dos extremos del ancho que midió. Con eso ponemos el mueble a escala."
          accion={{
            texto: "Marcar ahora",
            onPress: () => {
              onCerrar();
              router.push({ pathname: "/espacio/nuevo", params: { id: String(esp.datos!.id), paso: "marcas" } });
            },
          }}
        />
      ) : (
        <EnSuFoto propuesta={p} espacioGuardado={esp.datos} onGenerada={onGenerada} />
      )}
    </View>
  );
}

function EnSuFoto({ propuesta: p, espacioGuardado: e, onGenerada }: { propuesta: Propuesta; espacioGuardado: Espacio; onGenerada: () => void }) {
  const { c } = useTema();
  const [url, setUrl] = useState(p.enEspacioUrl);
  const [ajustando, setAjustando] = useState(!p.enEspacioUrl);
  const [posicion, setPosicion] = useState(p.enEspacioPos ?? 0.5);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [aspecto, setAspecto] = useState(0.75);

  const generar = async () => {
    setGenerando(true);
    setError(null);
    try {
      const r = await api.verEnEspacio(p.id, posicion);
      setUrl(r.enEspacioUrl);
      setAjustando(false);
      onGenerada();
    } catch (err) {
      setError(err instanceof ErrorApi ? err : new ErrorApi("No pudimos ubicar el mueble en su foto. Intente de nuevo", "desconocido", 0));
    } finally {
      setGenerando(false);
    }
  };

  if (url && !ajustando) {
    return (
      <View style={{ gap: espacio.s12 }}>
        <Etiqueta tipo="exito" texto="A escala en su foto" />
        <Image
          source={{ uri: urlArchivo(url) ?? undefined }}
          style={{ width: "100%", aspectRatio: aspecto, borderRadius: radio.tarjeta, backgroundColor: c.surface300 }}
          contentFit="contain"
          transition={200}
          onLoad={(ev) => setAspecto(ev.source.width / ev.source.height)}
          accessibilityLabel={`Su foto con ${p.nombre} ubicado en el muro`}
        />
        <Texto variante="bodySm" color="ink600">
          El tamaño y el lugar salen de sus medidas y de las marcas del muro. La luz y el ángulo del mueble son aproximados.
        </Texto>
        <Boton titulo="Mover el mueble" icono={MoveHorizontal} variante="secundario" onPress={() => setAjustando(true)} ancho />
      </View>
    );
  }

  const foto = urlArchivo(e.fotoUrl)!;
  return (
    <View style={{ gap: espacio.s12 }}>
      <Texto variante="bodyMd" color="ink600">
        {generando ? "Poniendo el mueble en su foto…" : "El recuadro tiene el tamaño real del mueble. Arrástrelo para elegir dónde va."}
      </Texto>
      <FotoMedible
        uri={foto}
        altoMax={440}
        accessibilityLabel="Su foto con el recuadro del mueble a escala"
        capa={(w, h) => (
          <CapaArrastre
            w={w}
            h={h}
            rect={rectanguloMueble(w, h, e.marcas!, e.anchoCm, p.medidas, e.alturaPisoCm ?? 0, posicion)}
            posicion={posicion}
            onPosicion={setPosicion}
            generando={generando}
          />
        )}
      />
      {error ? (
        <Aviso tipo={error.codigo === "sin_cupo" ? "alerta" : error.sinConexion ? "sinConexion" : "error"} mensaje={error.message} />
      ) : null}
      <Boton titulo={error ? "Intentar de nuevo" : "Ponerlo aquí"} icono={ImagePlus} onPress={generar} cargando={generando} ancho />
      {url ? <Boton titulo="Ver el resultado anterior" icono={Ruler} variante="texto" onPress={() => setAjustando(false)} deshabilitado={generando} motivo="Esperando el nuevo resultado" ancho /> : null}
    </View>
  );
}

type Rectangulo = ReturnType<typeof rectanguloMueble>;

/** Recuadro del mueble que se arrastra de lado a lado entre las marcas del muro. */
function CapaArrastre({ w, h, rect: r, posicion, onPosicion, generando }: {
  w: number; h: number; rect: Rectangulo; posicion: number; onPosicion: (p: number) => void; generando: boolean;
}) {
  const { c } = useTema();
  // Dónde empezó el dedo y en qué posición estaba el mueble al empezar a arrastrar.
  const inicio = useRef({ x: 0, posicion });

  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponder={() => !generando}
      onMoveShouldSetResponder={() => !generando}
      onResponderGrant={(ev) => {
        inicio.current = { x: ev.nativeEvent.pageX, posicion };
      }}
      onResponderTerminationRequest={() => false}
      onResponderMove={(ev) => {
        if (r.libre > 0) onPosicion(Math.min(1, Math.max(0, inicio.current.posicion + (ev.nativeEvent.pageX - inicio.current.x) / r.libre)));
      }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Posición del mueble en el muro"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(posicion * 100) }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(ev) => onPosicion(Math.min(1, Math.max(0, posicion + (ev.nativeEvent.actionName === "increment" ? 0.1 : -0.1))))}
    >
      <Svg width={w} height={h} pointerEvents="none">
        <Rect x={r.izq} y={r.arriba} width={r.ancho} height={r.alto} fill={c.brand600} fillOpacity={generando ? 0.15 : 0.25} stroke={c.brand500} strokeWidth={2} strokeDasharray="6 4" />
      </Svg>
      {generando ? (
        <View style={{ position: "absolute", left: r.izq, top: r.arriba, width: r.ancho, height: r.alto }}>
          <Esqueleto alto="100%" radio={4} />
        </View>
      ) : null}
    </View>
  );
}
