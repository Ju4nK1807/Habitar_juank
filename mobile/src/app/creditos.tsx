import { FlatList, View } from "react-native";
import { Gift, RotateCcw, Sparkles, Coins, type LucideIcon } from "lucide-react-native";
import { api } from "@/servicios/api";
import { useConsulta } from "@/hooks/useConsulta";
import { useTema } from "@/theme/tema";
import { espacio, margen, radio } from "@/theme/tokens";
import { hace, plural } from "@/lib/formato";
import type { Movimiento } from "@/servicios/tipos";
import { Pantalla } from "@/componentes/Pantalla";
import { BarraSuperior } from "@/componentes/BarraSuperior";
import { Texto } from "@/componentes/Texto";
import { Icono } from "@/componentes/Icono";
import { Aviso } from "@/componentes/Aviso";
import { Esqueleto } from "@/componentes/Esqueleto";

const TIPOS: Record<Movimiento["tipo"], { texto: string; icono: LucideIcon }> = {
  bienvenida: { texto: "Bono de bienvenida", icono: Gift },
  generacion: { texto: "Diseño de 4 propuestas", icono: Sparkles },
  reembolso: { texto: "Devuelto: el diseño no se completó", icono: RotateCcw },
  recarga: { texto: "Recarga diaria", icono: Coins },
};

export default function Creditos() {
  const { c } = useTema();
  const { datos, error, cargando, recargar } = useConsulta(() =>
    Promise.all([api.creditos(), api.movimientos()]).then(([creditos, movimientos]) => ({ creditos, movimientos })),
  );

  return (
    <Pantalla bordes={["top", "bottom"]}>
      <BarraSuperior variante="compacta" titulo="Créditos" />
      <FlatList
        data={datos?.movimientos ?? []}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ paddingHorizontal: margen.lateral, paddingBottom: espacio.s48 }}
        ListHeaderComponent={
          <View style={{ gap: espacio.s16, paddingVertical: espacio.s16 }}>
            {error ? <Aviso tipo={error.sinConexion ? "sinConexion" : "error"} mensaje={error.message} accion={{ texto: "Reintentar", onPress: recargar }} /> : null}
            <View style={{ padding: margen.tarjeta, borderRadius: radio.tarjeta, backgroundColor: c.brand100, gap: espacio.s4 }}>
              <Texto variante="labelSm" color="brandInk">Saldo</Texto>
              {datos ? <Texto variante="displayMd">{plural(datos.creditos.saldo, "crédito", "créditos")}</Texto> : <Esqueleto alto={36} ancho="60%" />}
              <Texto variante="bodySm" color="ink900">
                Cada diseño de cuatro propuestas usa 1 crédito. Si el diseño falla o lo cancela, se devuelve. Cada día, si tiene menos de 3, vuelve a 3.
              </Texto>
            </View>
            <Texto variante="titleMd" accessibilityRole="header">Movimientos</Texto>
          </View>
        }
        ListEmptyComponent={cargando ? <View style={{ gap: espacio.s12 }}>{[0, 1, 2].map((i) => <Esqueleto key={i} alto={56} />)}</View> : null}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: c.border200 }} />}
        renderItem={({ item: m }) => {
          const t = TIPOS[m.tipo];
          return (
            <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.s12, paddingVertical: espacio.s12 }} accessible accessibilityLabel={`${t.texto}, ${m.cantidad > 0 ? "más" : "menos"} ${Math.abs(m.cantidad)}, ${hace(m.fecha)}`}>
              <Icono de={t.icono} color="ink600" />
              <View style={{ flex: 1 }}>
                <Texto variante="bodyMd">{t.texto}</Texto>
                <Texto variante="bodySm" color="ink600">{hace(m.fecha)}</Texto>
              </View>
              <Texto variante="labelLg" color={m.cantidad > 0 ? "accentInk" : "ink900"}>{m.cantidad > 0 ? `+${m.cantidad}` : `−${Math.abs(m.cantidad)}`}</Texto>
            </View>
          );
        }}
      />
    </Pantalla>
  );
}
