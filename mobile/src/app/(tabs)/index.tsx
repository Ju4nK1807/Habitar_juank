import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Coins, Plus, Sparkles } from "lucide-react-native";
import { api } from "@/servicios/api";
import { useConsulta } from "@/hooks/useConsulta";
import { useTema } from "@/theme/tema";
import { espacio, margen, radio } from "@/theme/tokens";
import { usePreferencias } from "@/store/preferencias";
import { useBorrador } from "@/store/borrador";
import { continuarBorrador } from "@/lib/flujo";
import { fechaLarga, hace, plural, saludo } from "@/lib/formato";
import { Pantalla } from "@/componentes/Pantalla";
import { Texto } from "@/componentes/Texto";
import { Icono } from "@/componentes/Icono";
import { Aviso } from "@/componentes/Aviso";
import { Esqueleto } from "@/componentes/Esqueleto";
import { EstadoVacio } from "@/componentes/EstadoVacio";
import { TarjetaEspacio } from "@/componentes/TarjetaEspacio";
import { Rejilla, TarjetaMueble, TarjetaMuebleEsqueleto } from "@/componentes/TarjetaMueble";
import type { Generacion } from "@/servicios/tipos";

const ANCHO_ESPACIO = 168;

export default function Inicio() {
  const { c } = useTema();
  const nombre = usePreferencias((p) => p.nombre);
  const borrador = useBorrador();
  const { datos, error, cargando, refrescando, recargar } = useConsulta(() =>
    Promise.all([api.espacios(), api.generaciones(), api.creditos()]).then(([espacios, generaciones, creditos]) => ({ espacios, generaciones, creditos })),
  );

  const listas = datos?.generaciones.filter((g) => g.estado === "listo") ?? [];
  const recientes = listas.flatMap((g) => g.propuestas).slice(0, 6);
  const enCurso = datos?.generaciones.find((g) => g.estado === "generando");
  const sinGuardar = listas[0] && listas[0].guardadas === 0 ? listas[0] : null;

  return (
    <Pantalla>
      <ScrollView
        contentContainerStyle={{ paddingBottom: espacio.s48 }}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={recargar} tintColor={c.brand600} colors={[c.brand600]} />}
      >
        {/* Saludo */}
        <View style={{ paddingHorizontal: margen.lateral, paddingTop: espacio.s16, gap: espacio.s4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Texto variante="labelSm" color="ink600">{fechaLarga()}</Texto>
            {datos ? (
              <Pressable
                onPress={() => router.push("/creditos")}
                accessibilityRole="button"
                accessibilityLabel={`${plural(datos.creditos.saldo, "crédito", "créditos")}. Ver historial`}
                hitSlop={8}
                style={{ flexDirection: "row", alignItems: "center", gap: espacio.s4, paddingHorizontal: espacio.s12, height: 32, borderRadius: radio.completo, backgroundColor: c.surface200 }}
              >
                <Icono de={Coins} tamaño={16} color="brandInk" />
                <Texto variante="labelMd">{datos.creditos.saldo}</Texto>
              </Pressable>
            ) : null}
          </View>
          <Texto variante="displayLg" accessibilityRole="header">{saludo()}{nombre ? `,\n${nombre}` : ""}</Texto>
          <Texto variante="bodyLg" color="ink600">¿Qué rincón resolvemos hoy?</Texto>
        </View>

        {/* Continuidad */}
        <View style={{ paddingHorizontal: margen.lateral, marginTop: espacio.s24, gap: espacio.s12 }}>
          {error ? (
            <Aviso tipo={error.sinConexion ? "sinConexion" : "error"} titulo="No pudimos cargar su inicio" mensaje={error.message} accion={{ texto: "Reintentar", onPress: recargar }} />
          ) : null}
          {enCurso ? (
            <Aviso tipo="info" titulo="Estamos diseñando" mensaje={`${enCurso.contexto.tipoNombre}: sus propuestas siguen en camino`} accion={{ texto: "Ver progreso", onPress: () => verProgreso(enCurso) }} />
          ) : sinGuardar ? (
            <Aviso
              tipo="info"
              titulo="Propuestas sin guardar"
              mensaje={`${sinGuardar.contexto.tipoNombre} · ${hace(sinGuardar.creado)}. Guarde la que le guste en un proyecto`}
              accion={{ texto: "Ver propuestas", onPress: () => router.push(`/generacion/${sinGuardar.id}`) }}
            />
          ) : borrador.tieneDatos() ? (
            <Aviso tipo="info" titulo="Tiene un diseño sin terminar" mensaje="Lo que escribió sigue guardado" accion={{ texto: "Continuar", onPress: continuarBorrador }} />
          ) : null}
        </View>

        {/* Mis espacios */}
        <Seccion titulo="Mis espacios" accion={datos?.espacios.length ? { texto: "Ver todos", onPress: () => router.navigate("/espacios") } : undefined} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: margen.lateral, gap: espacio.s12 }}>
          {cargando && !datos ? (
            [0, 1].map((i) => <Esqueleto key={i} ancho={ANCHO_ESPACIO} alto={ANCHO_ESPACIO * 0.75 + 64} radio={radio.tarjeta} />)
          ) : (
            <>
              {datos?.espacios.map((e) => (
                <TarjetaEspacio key={e.id} espacio={e} ancho={ANCHO_ESPACIO} onPress={() => router.push(`/espacio/${e.id}`)} />
              ))}
              {datos ? (
                <Pressable
                  onPress={() => router.push("/espacio/nuevo")}
                  accessibilityRole="button"
                  accessibilityLabel="Guardar un espacio nuevo"
                  style={({ pressed }) => ({
                    width: datos.espacios.length ? 120 : ANCHO_ESPACIO * 1.6,
                    minHeight: ANCHO_ESPACIO * 0.75 + 64,
                    borderRadius: radio.tarjeta, borderWidth: 1, borderStyle: "dashed", borderColor: c.border400,
                    alignItems: "center", justifyContent: "center", gap: espacio.s8, padding: espacio.s16,
                    backgroundColor: pressed ? c.surface200 : "transparent",
                  })}
                >
                  <Icono de={Plus} color="brandInk" />
                  <Texto variante="labelMd" color="brandInk" centrado>{datos.espacios.length ? "Nuevo espacio" : "Guarde su primer espacio con foto y medidas"}</Texto>
                </Pressable>
              ) : null}
            </>
          )}
        </ScrollView>

        {/* Generaciones recientes */}
        <Seccion titulo="Generaciones recientes" />
        <View style={{ paddingHorizontal: margen.lateral }}>
          {cargando && !datos ? (
            <Rejilla datos={[0, 1, 2, 3]} clave={(d) => d} render={() => <TarjetaMuebleEsqueleto />} />
          ) : recientes.length ? (
            <Rejilla datos={recientes} clave={(p) => p.id} render={(p) => <TarjetaMueble propuesta={p} onPress={() => router.push(`/propuesta/${p.id}`)} />} />
          ) : datos ? (
            <EstadoVacio
              compacto
              icono={Sparkles}
              titulo="Aún no ha diseñado nada"
              mensaje="Cuéntenos qué necesita y en unos 20 segundos verá cuatro propuestas con medidas y precio."
              accion={{ texto: "Diseñar mi primer mueble", onPress: () => router.push("/nuevo/espacio"), icono: Plus }}
            />
          ) : null}
        </View>
      </ScrollView>
    </Pantalla>
  );
}

function verProgreso(g: Generacion) {
  useBorrador.getState().cambiar({ generacionEnCurso: g.id });
  router.push("/nuevo/disenando");
}

function Seccion({ titulo, accion }: { titulo: string; accion?: { texto: string; onPress: () => void } }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: margen.lateral, marginTop: espacio.s24, marginBottom: espacio.s12, minHeight: 32 }}>
      <Texto variante="titleMd" accessibilityRole="header">{titulo}</Texto>
      {accion ? (
        <Pressable onPress={accion.onPress} hitSlop={12} accessibilityRole="button">
          <Texto variante="labelLg" color="brandInk">{accion.texto}</Texto>
        </Pressable>
      ) : null}
    </View>
  );
}
