import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { Pencil, Ruler, Sparkles, Trash } from "lucide-react-native";
import { api, ErrorApi, urlArchivo } from "@/servicios/api";
import { useConsulta } from "@/hooks/useConsulta";
import { useTema } from "@/theme/tema";
import { espacio, margen, radio } from "@/theme/tokens";
import { usePreferencias } from "@/store/preferencias";
import { useBorrador } from "@/store/borrador";
import { medida } from "@/lib/formato";
import { Pantalla, BarraFija } from "@/componentes/Pantalla";
import { BarraSuperior } from "@/componentes/BarraSuperior";
import { BotonIcono } from "@/componentes/BotonIcono";
import { Texto } from "@/componentes/Texto";
import { Icono } from "@/componentes/Icono";
import { Boton } from "@/componentes/Boton";
import { Aviso } from "@/componentes/Aviso";
import { Etiqueta } from "@/componentes/Etiqueta";
import { Esqueleto } from "@/componentes/Esqueleto";
import { DiagramaMuro } from "@/componentes/DiagramaMuro";
import { toast } from "@/componentes/Toast";

export default function DetalleEspacio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTema();
  const unidades = usePreferencias((p) => p.unidades);
  const { datos: e, error, cargando, recargar } = useConsulta(() => api.espacio(Number(id)));
  const [borrando, setBorrando] = useState(false);

  const borrar = () => {
    if (!e) return;
    Alert.alert(`¿Borrar «${e.nombre}»?`, "Los diseños hechos con este espacio se conservan.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: async () => {
          setBorrando(true);
          try {
            await api.borrarEspacio(e.id);
            if (useBorrador.getState().espacio?.id === e.id) useBorrador.getState().elegirEspacio(null);
            router.back();
            toast.exito("Espacio borrado");
          } catch (err) {
            toast.error(err instanceof ErrorApi ? err.message : "No pudimos borrarlo. Intente de nuevo");
            setBorrando(false);
          }
        },
      },
    ]);
  };

  const diseñarAqui = () => {
    if (!e) return;
    const b = useBorrador.getState();
    b.elegirEspacio(e);
    router.push("/nuevo/espacio");
    router.push("/nuevo/necesidad");
  };

  const url = urlArchivo(e?.fotoUrl);
  const valores = e ? { ancho: medidaSinUnidad(e.anchoCm), alto: medidaSinUnidad(e.altoCm), fondo: e.fondoCm ? medidaSinUnidad(e.fondoCm) : "", piso: e.alturaPisoCm ? medidaSinUnidad(e.alturaPisoCm) : "" } : {};
  function medidaSinUnidad(cm: number) {
    return medida(cm, unidades).replace(/ (cm|in)$/, "");
  }

  return (
    <Pantalla bordes={["top", "bottom"]}>
      <BarraSuperior
        variante="compacta"
        titulo={e?.nombre ?? "Espacio"}
        acciones={e ? (
          <>
            <BotonIcono icono={Pencil} etiqueta="Editar espacio" onPress={() => router.push({ pathname: "/espacio/nuevo", params: { id: String(e.id), modo: e.alturaPisoCm !== null ? "escanear" : "foto" } })} />
            <BotonIcono icono={Trash} etiqueta="Borrar espacio" color="danger600" onPress={borrar} deshabilitado={borrando} />
          </>
        ) : null}
      />
      <ScrollView contentContainerStyle={{ padding: margen.lateral, gap: margen.secciones }}>
        {error ? <Aviso tipo={error.sinConexion ? "sinConexion" : "error"} mensaje={error.message} accion={{ texto: "Reintentar", onPress: recargar }} /> : null}
        {cargando && !e ? (
          <>
            <Esqueleto alto={240} radio={radio.tarjeta} />
            <Esqueleto alto={24} ancho="60%" />
            <Esqueleto alto={160} radio={radio.tarjeta} />
          </>
        ) : e ? (
          <>
            {url && !e.marcas ? (
              <Aviso
                tipo="info"
                titulo="Marque el ancho en la foto"
                mensaje="Con dos toques en la foto podemos poner cada diseño en ella, a escala."
                accion={{ texto: "Marcar ahora", onPress: () => router.push({ pathname: "/espacio/nuevo", params: { id: String(e.id), paso: "marcas" } }) }}
              />
            ) : null}
            {url ? (
              <Image source={{ uri: url }} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: radio.tarjeta }} contentFit="cover" accessibilityLabel={`Foto de ${e.nombre}`} />
            ) : (
              <View style={{ aspectRatio: 4 / 3, borderRadius: radio.tarjeta, backgroundColor: c.surface200, alignItems: "center", justifyContent: "center", gap: espacio.s8 }}>
                <Icono de={Ruler} color="ink600" tamaño={32} />
                <Texto variante="bodyMd" color="ink600">Espacio sin foto</Texto>
              </View>
            )}

            <View style={{ gap: espacio.s12 }}>
              <Texto variante="titleMd" accessibilityRole="header">Medidas</Texto>
              <View style={{ borderRadius: radio.tarjeta, backgroundColor: c.surface100, borderWidth: 1, borderColor: c.border200, padding: espacio.s12 }}>
                <DiagramaMuro valores={valores} conPiso={e.alturaPisoCm !== null} unidades={unidades} />
              </View>
            </View>

            {e.analisis ? (
              <View style={{ gap: espacio.s12 }}>
                <Etiqueta tipo="ia" texto="Análisis con IA" />
                <Texto variante="bodyMd"><Texto variante="labelLg">Estilo: </Texto>{e.analisis.estilo}</Texto>
                <View style={{ flexDirection: "row", gap: espacio.s8 }} accessible accessibilityLabel={`Paleta: ${e.analisis.paleta.map((p) => p.nombre).join(", ")}`}>
                  {e.analisis.paleta.map((p) => <View key={p.hex + p.nombre} style={{ width: 32, height: 32, borderRadius: radio.completo, backgroundColor: p.hex, borderWidth: 1, borderColor: c.border200 }} />)}
                </View>
                <Texto variante="bodyMd"><Texto variante="labelLg">Piso: </Texto>{e.analisis.piso}</Texto>
                <Texto variante="bodyMd"><Texto variante="labelLg">Luz: </Texto>{e.analisis.luz}</Texto>
                <Texto variante="bodyMd">
                  <Texto variante="labelLg">Obstáculos: </Texto>
                  {e.analisis.obstaculos.length ? e.analisis.obstaculos.join(", ") : "ninguno"}
                </Texto>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
      {e ? (
        <BarraFija>
          <Boton titulo="Diseñar un mueble aquí" icono={Sparkles} onPress={diseñarAqui} ancho />
        </BarraFija>
      ) : null}
    </Pantalla>
  );
}
