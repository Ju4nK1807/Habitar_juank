import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { ChevronRight, Coins } from "lucide-react-native";
import { api, URL_BASE } from "@/servicios/api";
import { useConsulta } from "@/hooks/useConsulta";
import { useTema } from "@/theme/tema";
import { espacio, margen, radio } from "@/theme/tokens";
import { usePreferencias, type Moneda, type Tema, type Unidades } from "@/store/preferencias";
import { fechaCorta, plural } from "@/lib/formato";
import { Pantalla } from "@/componentes/Pantalla";
import { BarraSuperior } from "@/componentes/BarraSuperior";
import { Texto } from "@/componentes/Texto";
import { Icono } from "@/componentes/Icono";
import { Chip, GrupoChips } from "@/componentes/Chip";
import { CampoTexto } from "@/componentes/CampoTexto";
import { Aviso } from "@/componentes/Aviso";
import { Esqueleto } from "@/componentes/Esqueleto";

export default function Perfil() {
  const { c } = useTema();
  const prefs = usePreferencias();
  const [nombre, setNombre] = useState(prefs.nombre);
  const { datos, error, recargar } = useConsulta(() => Promise.all([api.creditos(), api.catalogos()]).then(([creditos, catalogos]) => ({ creditos, catalogos })));

  const opciones = <T extends string>(lista: [T, string][], actual: T, onCambio: (v: T) => void) => (
    <GrupoChips>
      {lista.map(([v, t]) => <Chip key={v} texto={t} activo={actual === v} onPress={() => onCambio(v)} />)}
    </GrupoChips>
  );

  return (
    <Pantalla teclado>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: espacio.s48 }}>
        <BarraSuperior variante="expandida" titulo="Perfil" subtitulo="Créditos, unidades y apariencia" />
        <View style={{ paddingHorizontal: margen.lateral, gap: margen.secciones, marginTop: espacio.s8 }}>
          {error ? <Aviso tipo={error.sinConexion ? "sinConexion" : "error"} mensaje={error.message} accion={{ texto: "Reintentar", onPress: recargar }} /> : null}

          {/* Créditos */}
          <Pressable
            onPress={() => router.push("/creditos")}
            accessibilityRole="button"
            accessibilityLabel={datos ? `${plural(datos.creditos.saldo, "crédito", "créditos")}. Ver historial de créditos` : "Créditos"}
            style={({ pressed }) => ({
              flexDirection: "row", alignItems: "center", gap: espacio.s16, padding: margen.tarjeta, borderRadius: radio.tarjeta,
              backgroundColor: pressed ? c.surface200 : c.surface100, borderWidth: 1, borderColor: c.border200,
            })}
          >
            <View style={{ width: 48, height: 48, borderRadius: radio.completo, backgroundColor: c.brand100, alignItems: "center", justifyContent: "center" }}>
              <Icono de={Coins} color="brandInk" />
            </View>
            <View style={{ flex: 1, gap: espacio.s4 }}>
              {datos ? (
                <>
                  <Texto variante="titleMd">{plural(datos.creditos.saldo, "crédito", "créditos")}</Texto>
                  <Texto variante="bodySm" color="ink600">
                    {datos.creditos.proximaRecarga
                      ? `Mañana vuelve a tener ${datos.creditos.recargaHasta}. Cada diseño usa 1`
                      : "Cada diseño de cuatro propuestas usa 1"}
                  </Texto>
                </>
              ) : (
                <>
                  <Esqueleto alto={22} ancho="50%" />
                  <Esqueleto alto={16} ancho="80%" />
                </>
              )}
            </View>
            <Icono de={ChevronRight} color="ink600" />
          </Pressable>

          <Bloque titulo="Su nombre" ayuda="Lo usamos solo para saludarle en Inicio.">
            <CampoTexto
              etiqueta="Nombre"
              value={nombre}
              onChangeText={setNombre}
              onEndEditing={() => prefs.cambiar({ nombre: nombre.trim() })}
              placeholder="Cómo quiere que le llamemos"
              max={24}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </Bloque>

          <Bloque titulo="Tema">
            {opciones<Tema>([["sistema", "Igual que el teléfono"], ["claro", "Claro"], ["oscuro", "Oscuro"]], prefs.tema, (tema) => prefs.cambiar({ tema }))}
          </Bloque>

          <Bloque titulo="Unidades" ayuda="Las medidas se guardan en centímetros; esto solo cambia cómo se muestran y escriben.">
            {opciones<Unidades>([["cm", "Centímetros"], ["in", "Pulgadas"]], prefs.unidades, (unidades) => prefs.cambiar({ unidades }))}
          </Bloque>

          <Bloque
            titulo="Moneda"
            ayuda={
              datos?.catalogos.trm
                ? `Dólares con la TRM oficial del ${fechaCorta(datos.catalogos.trm.fecha + "T12:00:00")}: $ ${datos.catalogos.trm.valor.toLocaleString("es-CO")}`
                : "Los dólares usan la TRM oficial del día."
            }
          >
            {opciones<Moneda>([["COP", "Pesos (COP)"], ["USD", "Dólares (USD)"]], prefs.moneda, (moneda) => prefs.cambiar({ moneda }))}
          </Bloque>

          <Bloque titulo="Servidor">
            <Texto variante="bodySm" color="ink600" selectable>{URL_BASE || "Sin configurar"}</Texto>
          </Bloque>
        </View>
      </ScrollView>
    </Pantalla>
  );
}

function Bloque({ titulo, ayuda, children }: { titulo: string; ayuda?: string; children: React.ReactNode }) {
  const { c } = useTema();
  return (
    <View style={{ gap: espacio.s12, paddingTop: margen.secciones, borderTopWidth: 1, borderTopColor: c.border200 }}>
      <Texto variante="titleSm" accessibilityRole="header">{titulo}</Texto>
      {children}
      {ayuda ? <Texto variante="bodySm" color="ink600">{ayuda}</Texto> : null}
    </View>
  );
}
