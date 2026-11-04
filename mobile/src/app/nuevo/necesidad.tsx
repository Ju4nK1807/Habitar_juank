import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { Sparkles } from "lucide-react-native";
import { api, ErrorApi, urlArchivo } from "@/servicios/api";
import { useConsulta } from "@/hooks/useConsulta";
import { useTema } from "@/theme/tema";
import { espacio, margen, radio } from "@/theme/tokens";
import { useBorrador } from "@/store/borrador";
import { cerrarFlujo } from "@/lib/flujo";
import { espacioDeLaFoto, retomarFoto } from "@/lib/fotoEspacio";
import { plural } from "@/lib/formato";
import type { Analisis } from "@/servicios/tipos";
import { Pantalla, BarraFija } from "@/componentes/Pantalla";
import { BarraSuperior } from "@/componentes/BarraSuperior";
import { Texto } from "@/componentes/Texto";
import { Boton } from "@/componentes/Boton";
import { Chip, GrupoChips } from "@/componentes/Chip";
import { CampoTexto } from "@/componentes/CampoTexto";
import { Aviso } from "@/componentes/Aviso";
import { Esqueleto } from "@/componentes/Esqueleto";

const MAX = 280;
const MIN = 8;
const EJEMPLOS = [
  "Un sofá con cojines y una alfombra",
  "Un mueble para el TV con repisas",
  "Un escritorio pequeño para estudiar",
  "Una mesita de noche con cajón",
];

export default function PasoNecesidad() {
  const b = useBorrador();
  const creditos = useConsulta(api.creditos);
  const [generando, setGenerando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<ErrorApi | null>(null);

  // Si la app se cerró mientras se analizaba la foto, se retoma al volver.
  useEffect(() => retomarFoto(), []);

  const largo = b.descripcion.trim().length;
  const saldo = creditos.datos?.saldo;
  const motivo = largo < MIN ? "Cuéntenos qué mueble le gustaría" : saldo === 0 ? "No le quedan créditos. Mañana recibe nuevos" : undefined;

  const generar = async () => {
    if (motivo) return;
    setGenerando(true);
    setErrorEnvio(null);
    try {
      const esp = b.espacio ?? (b.foto ? await espacioDeLaFoto() : null);
      const r = await api.generar({ descripcion: b.descripcion.trim(), espacioId: esp?.id ?? null });
      b.cambiar({ generacionEnCurso: r.id });
      router.push("/nuevo/disenando");
    } catch (e) {
      setErrorEnvio(e instanceof ErrorApi ? e : new ErrorApi("No pudimos empezar el diseño", "desconocido", 0));
    } finally {
      setGenerando(false);
    }
  };

  return (
    <Pantalla bordes={["top", "bottom"]} teclado>
      <BarraSuperior variante="flujo" paso={2} onCerrar={cerrarFlujo} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: margen.lateral, gap: margen.secciones }}>
        <View style={{ gap: espacio.s8 }}>
          <Texto variante="titleLg" accessibilityRole="header">¿Qué le gustaría?</Texto>
          <Texto variante="bodyMd" color="ink600">Descríbalo con sus palabras. Nosotros elegimos el tipo, el color y el material.</Texto>
        </View>

        <SuEspacio />

        <View style={{ gap: espacio.s12 }}>
          <CampoTexto
            etiqueta="Lo que quiere"
            value={b.descripcion}
            onChangeText={(descripcion) => b.cambiar({ descripcion })}
            placeholder="Ej: Un sofá con cojines y una alfombra"
            lineas={4}
            max={MAX}
          />
          <GrupoChips>
            {EJEMPLOS.map((e) => <Chip key={e} texto={e} activo={b.descripcion === e} onPress={() => b.cambiar({ descripcion: e })} />)}
          </GrupoChips>
        </View>

        {errorEnvio ? (
          <Aviso
            tipo={errorEnvio.sinConexion ? "sinConexion" : "error"}
            mensaje={errorEnvio.codigo === "sin_creditos" ? errorEnvio.message : `${errorEnvio.message}. El crédito no se descontó`}
          />
        ) : null}
      </ScrollView>

      <BarraFija>
        <Boton
          titulo="Ver 4 propuestas · 1 crédito"
          icono={Sparkles}
          onPress={generar}
          cargando={generando}
          deshabilitado={!!motivo}
          motivo={motivo}
          ancho
        />
        {saldo !== undefined && !motivo ? (
          <Texto variante="bodySm" color="ink600" centrado>Tiene {plural(saldo, "crédito", "créditos")}</Texto>
        ) : null}
      </BarraFija>
    </Pantalla>
  );
}

/** Lo que la IA vio en la foto: tipo de espacio, estilo y colores. Así la persona sabe en qué se basa. */
function SuEspacio() {
  const { c } = useTema();
  const { espacio: guardado, foto } = useBorrador();
  const imagen = foto?.uri ?? urlArchivo(guardado?.fotoUrl);
  if (!imagen) return null;

  const analisis: Analisis | null = foto ? foto.analisis : guardado?.analisis ?? null;
  const mirando = foto && (foto.estado === "subiendo" || foto.estado === "analizando");
  const lugar = analisis?.tipoEspacio && analisis.tipoEspacio !== "otro" ? analisis.tipoEspacio : "espacio";

  return (
    <View style={{ gap: espacio.s12 }}>
      <View style={{ flexDirection: "row", gap: espacio.s12, padding: espacio.s12, borderRadius: radio.tarjeta, borderWidth: 1, borderColor: c.border200, backgroundColor: c.surface100 }}>
        <Image source={{ uri: imagen }} style={{ width: 72, height: 72, borderRadius: radio.campo, backgroundColor: c.surface200 }} contentFit="cover" accessibilityIgnoresInvertColors />
        <View style={{ flex: 1, gap: espacio.s8, justifyContent: "center" }}>
          {mirando ? (
            <>
              <Texto variante="labelMd" color="ink600">Mirando los colores de su espacio…</Texto>
              <Esqueleto alto={14} ancho="80%" />
              <View style={{ flexDirection: "row", gap: espacio.s4 }}>{[0, 1, 2, 3].map((i) => <Esqueleto key={i} ancho={20} alto={20} radio={radio.completo} />)}</View>
            </>
          ) : analisis ? (
            <>
              <Texto variante="titleSm">Su {lugar}: estilo {analisis.estilo}</Texto>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: espacio.s4 }} accessible accessibilityLabel={`Colores: ${analisis.paleta.map((p) => p.nombre).join(", ")}`}>
                {analisis.paleta.map((p) => (
                  // El color de la muestra es un dato de la foto, no un color de la interfaz.
                  <View key={p.hex + p.nombre} style={{ width: 20, height: 20, borderRadius: radio.completo, backgroundColor: p.hex, borderWidth: 1, borderColor: c.border200 }} />
                ))}
              </View>
              <Texto variante="bodySm" color="ink600" numberOfLines={1}>{analisis.paleta.map((p) => p.nombre).join(", ")}</Texto>
            </>
          ) : foto?.estado !== "error" ? (
            <Texto variante="bodySm" color="ink600">Las propuestas se harán sin analizar esta foto.</Texto>
          ) : null}
        </View>
      </View>
      {foto?.estado === "error" ? (
        <Aviso
          tipo="error"
          mensaje={`${foto.error ?? "No pudimos mirar la foto"}. Puede reintentar o seguir: las propuestas no usarán sus colores.`}
          accion={{ texto: "Reintentar", onPress: () => retomarFoto(true) }}
        />
      ) : null}
    </View>
  );
}
