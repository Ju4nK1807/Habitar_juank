import { Alert, FlatList, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { FolderOpen, ImageOff, Plus, Trash, X } from "lucide-react-native";
import { api, ErrorApi, urlArchivo } from "@/servicios/api";
import { useConsulta } from "@/hooks/useConsulta";
import { useTema } from "@/theme/tema";
import { espacio, margen, radio } from "@/theme/tokens";
import { usePreferencias } from "@/store/preferencias";
import { medidasTexto, plural, precioTexto } from "@/lib/formato";
import type { Propuesta } from "@/servicios/tipos";
import { Pantalla } from "@/componentes/Pantalla";
import { BarraSuperior } from "@/componentes/BarraSuperior";
import { BotonIcono } from "@/componentes/BotonIcono";
import { Texto } from "@/componentes/Texto";
import { Icono } from "@/componentes/Icono";
import { Aviso } from "@/componentes/Aviso";
import { Esqueleto } from "@/componentes/Esqueleto";
import { EstadoVacio } from "@/componentes/EstadoVacio";
import { Etiqueta, textoAjusteCorto, tipoAjuste } from "@/componentes/Etiqueta";
import { toast } from "@/componentes/Toast";

export default function DetalleProyecto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTema();
  const moneda = usePreferencias((s) => s.moneda);
  const { datos: p, error, cargando, recargar } = useConsulta(() => api.proyecto(Number(id)));

  const quitar = (prop: Propuesta) => {
    if (!p) return;
    Alert.alert(`¿Quitar «${prop.nombre}»?`, `Sale de ${p.nombre}. La propuesta sigue en sus generaciones.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Quitar",
        style: "destructive",
        onPress: async () => {
          try {
            await api.quitarDeProyecto(p.id, prop.id);
            await recargar();
          } catch (e) {
            toast.error(e instanceof ErrorApi ? e.message : "No pudimos quitarla. Intente de nuevo");
          }
        },
      },
    ]);
  };

  const borrar = () => {
    if (!p) return;
    Alert.alert(`¿Borrar «${p.nombre}»?`, "Las propuestas no se borran; solo deja de existir el proyecto.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: async () => {
          try {
            await api.borrarProyecto(p.id);
            router.back();
            toast.exito("Proyecto borrado");
          } catch (e) {
            toast.error(e instanceof ErrorApi ? e.message : "No pudimos borrarlo. Intente de nuevo");
          }
        },
      },
    ]);
  };

  return (
    <Pantalla bordes={["top", "bottom"]}>
      <BarraSuperior variante="compacta" titulo={p?.nombre ?? "Proyecto"} acciones={p ? <BotonIcono icono={Trash} etiqueta="Borrar proyecto" color="danger600" onPress={borrar} /> : null} />
      <FlatList
        data={p?.propuestas ?? []}
        keyExtractor={(x) => String(x.id)}
        contentContainerStyle={{ paddingHorizontal: margen.lateral, paddingBottom: espacio.s48, gap: espacio.s12 }}
        ListHeaderComponent={
          <View style={{ gap: espacio.s16, paddingVertical: espacio.s16 }}>
            {error ? <Aviso tipo={error.sinConexion ? "sinConexion" : "error"} mensaje={error.message} accion={{ texto: "Reintentar", onPress: recargar }} /> : null}
            {p ? (
              <View style={{ padding: margen.tarjeta, borderRadius: radio.tarjeta, backgroundColor: c.surface200, gap: espacio.s4 }}>
                <Texto variante="labelSm" color="ink600">Presupuesto sumado</Texto>
                <Texto variante="titleLg">{precioTexto(p.presupuesto, moneda)}</Texto>
                <Texto variante="bodySm" color="ink600">
                  {plural(p.cantidad, "propuesta", "propuestas")}{p.espacio ? ` · ${p.espacio.nombre}` : ""}
                </Texto>
              </View>
            ) : cargando ? (
              <Esqueleto alto={96} radio={radio.tarjeta} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          cargando ? (
            <View style={{ gap: espacio.s12 }}>{[0, 1].map((i) => <Esqueleto key={i} alto={104} radio={radio.tarjeta} />)}</View>
          ) : p ? (
            <EstadoVacio
              compacto
              icono={FolderOpen}
              titulo="Este proyecto está vacío"
              mensaje="Abra una propuesta y toque Guardar para agregarla aquí."
              accion={{ texto: "Diseñar un mueble", onPress: () => router.push("/nuevo/espacio"), icono: Plus }}
            />
          ) : null
        }
        renderItem={({ item }) => <FilaPropuesta propuesta={item} onQuitar={() => quitar(item)} />}
      />
    </Pantalla>
  );
}

function FilaPropuesta({ propuesta: p, onQuitar }: { propuesta: Propuesta; onQuitar: () => void }) {
  const { c } = useTema();
  const { moneda, unidades } = usePreferencias();
  const url = urlArchivo(p.imagenUrl);
  return (
    <Pressable
      onPress={() => router.push(`/propuesta/${p.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${p.nombre}. ${precioTexto(p.precio, moneda)}. ${p.etiquetaAjuste}`}
      style={({ pressed }) => ({
        flexDirection: "row", gap: espacio.s12, padding: espacio.s12, borderRadius: radio.tarjeta,
        borderWidth: 1, borderColor: c.border200, backgroundColor: pressed ? c.surface200 : c.surface100,
      })}
    >
      <View style={{ width: 80, height: 80, borderRadius: radio.campo, overflow: "hidden", backgroundColor: c.surface200, alignItems: "center", justifyContent: "center" }}>
        {url ? <Image source={{ uri: url }} style={{ width: 80, height: 80 }} contentFit="cover" /> : <Icono de={ImageOff} color="ink600" />}
      </View>
      <View style={{ flex: 1, gap: espacio.s4 }}>
        <Texto variante="titleSm" numberOfLines={1}>{p.nombre}</Texto>
        <Texto variante="bodySm" color="ink600" numberOfLines={1}>{medidasTexto(p.medidas, unidades)} · {p.materialTexto}</Texto>
        <Texto variante="labelLg">{precioTexto(p.precio, moneda)}</Texto>
        <Etiqueta tipo={tipoAjuste(p.ajuste)} texto={textoAjusteCorto(p.ajuste)} />
      </View>
      <BotonIcono icono={X} etiqueta={`Quitar ${p.nombre} del proyecto`} color="ink600" onPress={onQuitar} />
    </Pressable>
  );
}
