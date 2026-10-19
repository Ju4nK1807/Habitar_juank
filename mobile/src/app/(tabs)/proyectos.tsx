import { useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { FolderOpen, Plus } from "lucide-react-native";
import { api, urlArchivo } from "@/servicios/api";
import { useConsulta } from "@/hooks/useConsulta";
import { useTema } from "@/theme/tema";
import { espacio, margen, radio } from "@/theme/tokens";
import { usePreferencias } from "@/store/preferencias";
import { plural, precioTexto } from "@/lib/formato";
import type { Proyecto } from "@/servicios/tipos";
import { Pantalla } from "@/componentes/Pantalla";
import { BarraSuperior } from "@/componentes/BarraSuperior";
import { BotonIcono } from "@/componentes/BotonIcono";
import { Texto } from "@/componentes/Texto";
import { Aviso } from "@/componentes/Aviso";
import { Esqueleto } from "@/componentes/Esqueleto";
import { EstadoVacio } from "@/componentes/EstadoVacio";
import { HojaNuevoProyecto } from "@/componentes/HojaNuevoProyecto";

export default function Proyectos() {
  const { c } = useTema();
  const [creando, setCreando] = useState(false);
  const { datos, error, cargando, refrescando, recargar } = useConsulta(api.proyectos);
  const moneda = usePreferencias((s) => s.moneda);
  const total = {
    cop: datos?.reduce((s, p) => s + p.presupuesto.cop, 0) ?? 0,
    usd: datos?.every((p) => p.presupuesto.usd !== null) ? datos.reduce((s, p) => s + (p.presupuesto.usd ?? 0), 0) : null,
    trm: null,
    fechaTrm: null,
  };

  return (
    <Pantalla>
      <FlatList
        data={datos ?? []}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ paddingHorizontal: margen.lateral, paddingBottom: espacio.s48, gap: espacio.s12 }}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={recargar} tintColor={c.brand600} colors={[c.brand600]} />}
        ListHeaderComponent={
          <View style={{ marginHorizontal: -margen.lateral, gap: espacio.s12 }}>
            <BarraSuperior
              variante="expandida"
              titulo="Proyectos"
              subtitulo={datos?.length ? `${plural(datos.length, "proyecto", "proyectos")} · ${precioTexto(total, moneda)} en total` : "Agrupe las propuestas que le gustan"}
              acciones={<BotonIcono icono={Plus} etiqueta="Crear proyecto" fondo="superficie" onPress={() => setCreando(true)} />}
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
            <View style={{ gap: espacio.s12 }}>{[0, 1, 2].map((i) => <Esqueleto key={i} alto={104} radio={radio.tarjeta} />)}</View>
          ) : error ? null : (
            <EstadoVacio
              icono={FolderOpen}
              titulo="Sin proyectos todavía"
              mensaje="Cuando una propuesta le guste, guárdela en un proyecto. Aquí verá el presupuesto sumado."
              accion={{ texto: "Crear proyecto", onPress: () => setCreando(true), icono: Plus }}
            />
          )
        }
        renderItem={({ item }) => <FilaProyecto proyecto={item} />}
      />
      <HojaNuevoProyecto
        visible={creando}
        onCerrar={() => setCreando(false)}
        onCreado={(p) => {
          setCreando(false);
          router.push(`/proyecto/${p.id}`);
        }}
      />
    </Pantalla>
  );
}

function FilaProyecto({ proyecto: p }: { proyecto: Proyecto }) {
  const { c } = useTema();
  const moneda = usePreferencias((s) => s.moneda);
  return (
    <Pressable
      onPress={() => router.push(`/proyecto/${p.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${p.nombre}. ${plural(p.cantidad, "propuesta", "propuestas")}. ${precioTexto(p.presupuesto, moneda)}`}
      style={({ pressed }) => ({
        flexDirection: "row", gap: espacio.s16, padding: espacio.s12, alignItems: "center",
        borderRadius: radio.tarjeta, borderWidth: 1, borderColor: c.border200, backgroundColor: pressed ? c.surface200 : c.surface100,
      })}
    >
      <View style={{ width: 80, height: 80, borderRadius: radio.campo, overflow: "hidden", backgroundColor: c.surface200, flexDirection: "row", flexWrap: "wrap" }}>
        {p.portadas.length ? (
          p.portadas.slice(0, p.portadas.length >= 3 ? 3 : 1).map((u, i) => (
            <Image key={i} source={{ uri: urlArchivo(u) ?? undefined }} style={p.portadas.length >= 3 ? { width: i === 0 ? 80 : 40, height: 40 } : { width: 80, height: 80 }} contentFit="cover" />
          ))
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <FolderOpen size={24} color={c.ink600} strokeWidth={1.75} />
          </View>
        )}
      </View>
      <View style={{ flex: 1, gap: espacio.s4 }}>
        <Texto variante="titleSm" numberOfLines={1}>{p.nombre}</Texto>
        <Texto variante="bodySm" color="ink600" numberOfLines={1}>
          {plural(p.cantidad, "propuesta", "propuestas")}{p.espacio ? ` · ${p.espacio.nombre}` : ""}
        </Texto>
        <Texto variante="labelLg">{p.cantidad ? precioTexto(p.presupuesto, moneda) : "Sin propuestas aún"}</Texto>
      </View>
    </Pressable>
  );
}
