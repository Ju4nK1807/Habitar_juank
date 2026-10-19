import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { House, RefreshCw } from "lucide-react-native";
import { api, ErrorApi } from "@/servicios/api";
import { useConsulta } from "@/hooks/useConsulta";
import { useCatalogos } from "@/hooks/useCatalogos";
import { useTema } from "@/theme/tema";
import { espacio, margen, radio } from "@/theme/tokens";
import { usePreferencias } from "@/store/preferencias";
import { useBorrador } from "@/store/borrador";
import { medida, medidasTexto, precioTexto } from "@/lib/formato";
import type { Propuesta } from "@/servicios/tipos";
import { Pantalla, BarraFija } from "@/componentes/Pantalla";
import { BarraSuperior } from "@/componentes/BarraSuperior";
import { BotonIcono } from "@/componentes/BotonIcono";
import { Texto } from "@/componentes/Texto";
import { Boton } from "@/componentes/Boton";
import { Chip } from "@/componentes/Chip";
import { Aviso } from "@/componentes/Aviso";
import { Etiqueta, textoAjusteCorto, tipoAjuste } from "@/componentes/Etiqueta";
import { Esqueleto } from "@/componentes/Esqueleto";
import { Rejilla, TarjetaMueble, TarjetaMuebleEsqueleto } from "@/componentes/TarjetaMueble";

type Orden = "recomendadas" | "precio" | "ajuste" | "compactas";

const ORDENES: { id: Orden; texto: string; destacado: string; fn: (a: Propuesta, b: Propuesta) => number }[] = [
  { id: "recomendadas", texto: "Recomendadas", destacado: "", fn: (a, b) => a.orden - b.orden },
  { id: "precio", texto: "Menor precio", destacado: "Más económica", fn: (a, b) => a.precio.cop - b.precio.cop },
  // Primero las que caben; entre ellas, las que dejan más holgura.
  { id: "ajuste", texto: "Mejor ajuste", destacado: "Más holgura", fn: (a, b) => rangoAjuste(a) - rangoAjuste(b) || b.diferenciaCm - a.diferenciaCm },
  { id: "compactas", texto: "Más compactas", destacado: "Ocupa menos", fn: (a, b) => volumen(a) - volumen(b) },
];

const rangoAjuste = (p: Propuesta) => (p.ajuste === "cabe" ? 0 : p.ajuste === "ajustado" ? 1 : p.ajuste === "no_cabe" ? 2 : 3);
const volumen = (p: Propuesta) => p.medidas.anchoCm * p.medidas.altoCm * p.medidas.fondoCm;

export default function Resultados() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTema();
  const { moneda, unidades } = usePreferencias();
  const catalogos = useCatalogos();
  const [orden, setOrden] = useState<Orden>("recomendadas");
  const [regenerando, setRegenerando] = useState(false);
  const [errorRegenerar, setErrorRegenerar] = useState<string | null>(null);
  const { datos, error, cargando, recargar } = useConsulta(
    () => Promise.all([api.generacion(Number(id)), api.creditos()]).then(([gen, creditos]) => ({ gen, creditos })),
  );

  const gen = datos?.gen;
  const criterio = ORDENES.find((o) => o.id === orden)!;
  const propuestas = useMemo(() => [...(gen?.propuestas ?? [])].sort(criterio.fn), [gen, criterio]);
  const ctx = gen?.contexto;
  const nombreMaterial = catalogos.datos?.materiales.find((m) => m.id === ctx?.material)?.nombre;
  const nombrePresupuesto = catalogos.datos?.presupuestos.find((p) => p.id === ctx?.presupuesto)?.nombre;

  const regenerar = async () => {
    if (!ctx) return;
    setRegenerando(true);
    setErrorRegenerar(null);
    try {
      const r = await api.generar({
        tipo: ctx.tipo, descripcion: ctx.descripcion, anchoMaxCm: ctx.anchoMaxCm, altoMaxCm: ctx.altoMaxCm, fondoMaxCm: ctx.fondoMaxCm, medidasOrigen: ctx.medidasOrigen,
        material: ctx.material, presupuesto: ctx.presupuesto, espacioId: ctx.espacioId, referencias: ctx.referencias,
      });
      useBorrador.getState().cambiar({ generacionEnCurso: r.id });
      router.push("/nuevo/disenando");
    } catch (e) {
      setErrorRegenerar(e instanceof ErrorApi ? e.message : "No pudimos empezar el diseño. El crédito no se descontó");
    } finally {
      setRegenerando(false);
    }
  };

  const saldo = datos?.creditos.saldo;

  return (
    <Pantalla bordes={["top", "bottom"]}>
      <BarraSuperior
        variante="compacta"
        titulo="Resultados"
        atras={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        acciones={<BotonIcono icono={House} etiqueta="Ir al inicio" onPress={() => router.dismissTo("/")} />}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: espacio.s32 }}>
        {/* Lo pedido */}
        <View style={{ paddingHorizontal: margen.lateral, paddingTop: espacio.s8, gap: espacio.s8 }}>
          {ctx ? (
            <>
              <Texto variante="titleLg" accessibilityRole="header">{ctx.tipoNombre}</Texto>
              <Texto variante="bodyMd" color="ink600" numberOfLines={3}>«{ctx.descripcion}»</Texto>
              <Texto variante="bodySm" color="ink600">
                {[
                  ctx.espacioNombre,
                  ctx.anchoMaxCm && ctx.altoMaxCm
                    ? `Máx. ${medida(ctx.anchoMaxCm, unidades)} × ${medida(ctx.altoMaxCm, unidades)}${ctx.fondoMaxCm ? ` × ${medida(ctx.fondoMaxCm, unidades)}` : ""}${ctx.medidasOrigen === "ia" ? " (estimado)" : ""}`
                    : "Sin medidas del espacio",
                  nombreMaterial,
                  nombrePresupuesto,
                ].filter(Boolean).join(" · ")}
              </Texto>
            </>
          ) : cargando ? (
            <>
              <Esqueleto alto={30} ancho="50%" />
              <Esqueleto alto={20} />
              <Esqueleto alto={16} ancho="70%" />
            </>
          ) : null}
          {error ? <Aviso tipo={error.sinConexion ? "sinConexion" : "error"} mensaje={error.message} accion={{ texto: "Reintentar", onPress: recargar }} /> : null}
          {gen && gen.estado !== "listo" ? (
            <Aviso
              tipo={gen.estado === "generando" ? "info" : "error"}
              mensaje={gen.estado === "generando" ? "Este diseño aún está en curso." : gen.error ?? "Este diseño no se completó. El crédito no se descontó"}
              accion={gen.estado === "generando" ? { texto: "Ver progreso", onPress: () => { useBorrador.getState().cambiar({ generacionEnCurso: gen.id }); router.push("/nuevo/disenando"); } } : undefined}
            />
          ) : null}
        </View>

        {/* Orden */}
        {propuestas.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: margen.lateral, gap: espacio.s8, paddingVertical: espacio.s16 }} accessibilityLabel="Ordenar propuestas">
            {ORDENES.map((o) => <Chip key={o.id} texto={o.texto} activo={orden === o.id} onPress={() => setOrden(o.id)} />)}
          </ScrollView>
        ) : null}

        {/* Rejilla */}
        <View style={{ paddingHorizontal: margen.lateral, marginTop: propuestas.length ? 0 : espacio.s16 }}>
          {cargando && !datos ? (
            <Rejilla datos={[0, 1, 2, 3]} clave={(d) => d} render={() => <TarjetaMuebleEsqueleto />} />
          ) : (
            <Rejilla
              datos={propuestas}
              clave={(p) => p.id}
              render={(p, i) => <TarjetaMueble propuesta={p} destacado={i === 0 ? criterio.destacado : null} onPress={() => router.push(`/propuesta/${p.id}`)} />}
            />
          )}
        </View>

        {/* Comparación */}
        {propuestas.length ? (
          <View style={{ marginTop: margen.secciones, gap: espacio.s12 }}>
            <Texto variante="titleMd" style={{ paddingHorizontal: margen.lateral }} accessibilityRole="header">Comparar lado a lado</Texto>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: margen.lateral }}>
              <View style={{ borderRadius: radio.tarjeta, borderWidth: 1, borderColor: c.border200, backgroundColor: c.surface100, overflow: "hidden" }}>
                {([
                  ["", (p: Propuesta) => <Texto variante="labelMd" numberOfLines={2}>{p.nombre}</Texto>],
                  ["Medidas", (p: Propuesta) => <Texto variante="bodySm">{medidasTexto(p.medidas, unidades)}</Texto>],
                  ["Material", (p: Propuesta) => <Texto variante="bodySm">{p.materialTexto}</Texto>],
                  ["Precio", (p: Propuesta) => <Texto variante="labelMd">{precioTexto(p.precio, moneda)}</Texto>],
                  ["Ajuste", (p: Propuesta) => <Etiqueta tipo={tipoAjuste(p.ajuste)} texto={textoAjusteCorto(p.ajuste)} />],
                  ["Holgura", (p: Propuesta) => <Texto variante="bodySm">{p.ajuste === "sin_medidas" ? "—" : p.diferenciaCm >= 0 ? `${medida(p.diferenciaCm, unidades)} de ${p.dimensionCritica}` : `Excede ${medida(-p.diferenciaCm, unidades)}`}</Texto>],
                  ["Fabricación", (p: Propuesta) => <Texto variante="bodySm">~{p.fabricacionDias} días</Texto>],
                  ["Presupuesto", (p: Propuesta) => <Texto variante="bodySm" color={p.dentroPresupuesto === false ? "warning600" : "ink900"}>{p.dentroPresupuesto === null ? "—" : p.dentroPresupuesto ? "Dentro" : "Fuera de la franja"}</Texto>],
                ] as const).map(([fila, celda], i) => (
                  <View key={fila || "nombre"} style={{ flexDirection: "row", borderTopWidth: i ? 1 : 0, borderTopColor: c.border200, backgroundColor: i === 0 ? c.surface200 : undefined }}>
                    <View style={{ width: 96, padding: espacio.s12, justifyContent: "center" }}>
                      <Texto variante="labelSm" color="ink600">{fila}</Texto>
                    </View>
                    {propuestas.map((p) => (
                      <View key={p.id} style={{ width: 136, padding: espacio.s12, justifyContent: "center", borderLeftWidth: 1, borderLeftColor: c.border200 }}>
                        {celda(p)}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : null}

        {errorRegenerar ? <View style={{ paddingHorizontal: margen.lateral, marginTop: espacio.s16 }}><Aviso tipo="error" mensaje={errorRegenerar} /></View> : null}
      </ScrollView>

      {gen?.estado === "listo" ? (
        <BarraFija>
          <Boton
            titulo="Generar otras cuatro · 1 crédito"
            icono={RefreshCw}
            variante="secundario"
            onPress={regenerar}
            cargando={regenerando}
            deshabilitado={saldo === 0}
            motivo="No le quedan créditos. Mañana recibe nuevos"
            ancho
          />
        </BarraFija>
      ) : null}
    </Pantalla>
  );
}
