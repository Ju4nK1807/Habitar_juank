import { FlatList, RefreshControl, View } from "react-native";
import { router } from "expo-router";
import { Plus, Ruler } from "lucide-react-native";
import { api } from "@/servicios/api";
import { useConsulta } from "@/hooks/useConsulta";
import { useTema } from "@/theme/tema";
import { espacio, margen, radio } from "@/theme/tokens";
import { plural } from "@/lib/formato";
import { Pantalla } from "@/componentes/Pantalla";
import { BarraSuperior } from "@/componentes/BarraSuperior";
import { BotonIcono } from "@/componentes/BotonIcono";
import { Aviso } from "@/componentes/Aviso";
import { Esqueleto } from "@/componentes/Esqueleto";
import { EstadoVacio } from "@/componentes/EstadoVacio";
import { TarjetaEspacio } from "@/componentes/TarjetaEspacio";

export default function Espacios() {
  const { c } = useTema();
  const { datos, error, cargando, refrescando, recargar } = useConsulta(api.espacios);

  return (
    <Pantalla>
      <FlatList
        data={datos ?? []}
        keyExtractor={(e) => String(e.id)}
        numColumns={2}
        columnWrapperStyle={{ gap: espacio.s12 }}
        contentContainerStyle={{ paddingHorizontal: margen.lateral, paddingBottom: espacio.s48, gap: espacio.s12 }}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={recargar} tintColor={c.brand600} colors={[c.brand600]} />}
        ListHeaderComponent={
          <View style={{ marginHorizontal: -margen.lateral, gap: espacio.s12 }}>
            <BarraSuperior
              variante="expandida"
              titulo="Espacios"
              subtitulo={datos?.length ? `${plural(datos.length, "espacio guardado", "espacios guardados")} con sus medidas` : "Los muros y rincones donde irán sus muebles"}
              acciones={datos?.length ? <BotonIcono icono={Plus} etiqueta="Guardar un espacio nuevo" fondo="superficie" onPress={() => router.push("/espacio/nuevo")} /> : null}
            />
            {error ? (
              <View style={{ paddingHorizontal: margen.lateral }}>
                <Aviso tipo={error.sinConexion ? "sinConexion" : "error"} mensaje={error.message} accion={{ texto: "Reintentar", onPress: recargar }} />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          cargando ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: espacio.s12 }}>
              {[0, 1, 2, 3].map((i) => <Esqueleto key={i} ancho="47%" alto={180} radio={radio.tarjeta} />)}
            </View>
          ) : error ? null : (
            <EstadoVacio
              icono={Ruler}
              titulo="Sin espacios todavía"
              mensaje="Tome una foto del muro y anote sus medidas. Así cada diseño sabe exactamente cuánto cabe."
              accion={{ texto: "Guardar mi primer espacio", onPress: () => router.push("/espacio/nuevo"), icono: Plus }}
            />
          )
        }
        renderItem={({ item }) => (
          <View style={{ flex: 1 / 2 }}>
            <TarjetaEspacio espacio={item} onPress={() => router.push(`/espacio/${item.id}`)} />
          </View>
        )}
      />
    </Pantalla>
  );
}
