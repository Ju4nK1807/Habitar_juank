import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BookmarkPlus, Check, ChevronDown, ChevronLeft, ChevronUp, Frame, ImageOff, Plus } from "lucide-react-native";
import { api, ErrorApi, urlArchivo } from "@/servicios/api";
import { useConsulta } from "@/hooks/useConsulta";
import { useTema } from "@/theme/tema";
import { espacio, margen, radio } from "@/theme/tokens";
import { usePreferencias } from "@/store/preferencias";
import { fechaCorta, medida, plural, precioTexto } from "@/lib/formato";
import type { Propuesta, Proyecto } from "@/servicios/tipos";
import { Pantalla, BarraFija } from "@/componentes/Pantalla";
import { BotonIcono } from "@/componentes/BotonIcono";
import { Texto } from "@/componentes/Texto";
import { Icono } from "@/componentes/Icono";
import { Boton } from "@/componentes/Boton";
import { Aviso } from "@/componentes/Aviso";
import { Chip } from "@/componentes/Chip";
import { Etiqueta, tipoAjuste } from "@/componentes/Etiqueta";
import { Esqueleto } from "@/componentes/Esqueleto";
import { HojaInferior } from "@/componentes/HojaInferior";
import { HojaNuevoProyecto } from "@/componentes/HojaNuevoProyecto";
import { VistaEnEspacio } from "@/componentes/VistaEnEspacio";
import { toast } from "@/componentes/Toast";

export default function Detalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTema();
  const insets = useSafeAreaInsets();
  const { moneda, unidades } = usePreferencias();
  const { datos: p, error, cargando, recargar } = useConsulta(() => api.propuesta(Number(id)));
  const [verEspacio, setVerEspacio] = useState(false);
  const [guardar, setGuardar] = useState(false);
  const [despiece, setDespiece] = useState(false);
  const [soloMueble, setSoloMueble] = useState(false);

  // Con la propuesta puesta en la foto del espacio, la imagen principal es esa; se puede alternar.
  const enFoto = !!p?.enEspacioRecorteUrl && !soloMueble;
  const url = urlArchivo(enFoto ? p?.enEspacioRecorteUrl : p?.imagenUrl);

  return (
    <Pantalla bordes={["bottom"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: espacio.s32 }}>
        {/* Imagen a sangre */}
        <View style={{ aspectRatio: 1, backgroundColor: c.surface200 }}>
          {p ? (
            url ? (
              <Image
                source={{ uri: url }}
                style={{ flex: 1 }}
                contentFit={enFoto ? "contain" : "cover"}
                transition={200}
                accessibilityLabel={enFoto ? `${p.nombre} puesto en la foto de su espacio` : `Imagen generada de ${p.nombre}`}
              />
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: espacio.s8 }}>
                <Icono de={ImageOff} color="ink600" tamaño={32} />
                <Texto variante="bodyMd" color="ink600">La imagen no se pudo generar</Texto>
              </View>
            )
          ) : (
            <Esqueleto alto="100%" radio={0} />
          )}
          {p?.enEspacioRecorteUrl ? (
            <View style={{ position: "absolute", bottom: espacio.s12, left: espacio.s12, right: espacio.s12, flexDirection: "row", gap: espacio.s8 }}>
              <Chip texto="En su foto" activo={!soloMueble} onPress={() => setSoloMueble(false)} />
              <Chip texto="Solo el mueble" activo={soloMueble} onPress={() => setSoloMueble(true)} />
            </View>
          ) : null}
          <View style={{ position: "absolute", top: insets.top + espacio.s8, left: espacio.s8 }}>
            <BotonIcono icono={ChevronLeft} etiqueta="Volver" fondo="velo" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
          </View>
        </View>

        <View style={{ padding: margen.lateral, gap: margen.secciones }}>
          {error ? <Aviso tipo={error.sinConexion ? "sinConexion" : "error"} mensaje={error.message} accion={{ texto: "Reintentar", onPress: recargar }} /> : null}

          {p ? (
            <>
              <View style={{ gap: espacio.s8 }}>
                <Etiqueta tipo="ia" texto="Generado con IA" />
                <Texto variante="titleLg" accessibilityRole="header">{p.nombre}</Texto>
                <Texto variante="bodyLg" color="ink600">{p.concepto}</Texto>
                <Texto variante="bodyMd">{p.materialTexto} · {p.acabado}</Texto>
              </View>

              <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: espacio.s12, flexWrap: "wrap" }}>
                <View style={{ gap: espacio.s4 }}>
                  <Texto variante="labelSm" color="ink600">Precio estimado</Texto>
                  <Texto variante="titleLg">{precioTexto(p.precio, moneda)}</Texto>
                  <Texto variante="bodySm" color="ink600">
                    {moneda === "USD" && p.precio.fechaTrm ? `TRM del ${fechaCorta(p.precio.fechaTrm + "T12:00:00")} · ` : ""}Material, herrajes y mano de obra
                  </Texto>
                </View>
                <Etiqueta tipo={tipoAjuste(p.ajuste)} texto={p.etiquetaAjuste} />
              </View>

              {p.dentroPresupuesto === false ? (
                <Aviso tipo="alerta" mensaje="Este precio queda fuera de la franja de presupuesto que eligió." />
              ) : null}

              {p.proyectos?.length ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.s8 }}>
                  <Icono de={Check} color="accentInk" tamaño={18} />
                  <Texto variante="bodySm" color="ink600">Guardada en {p.proyectos.map((x) => x.nombre).join(", ")}</Texto>
                </View>
              ) : null}

              <FichaTecnica p={p} />

              <View style={{ gap: espacio.s12 }}>
                <Pressable
                  onPress={() => setDespiece((v) => !v)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: despiece }}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48 }}
                >
                  <Texto variante="titleMd">Despiece · {plural(p.despiece.reduce((s, x) => s + x.cantidad, 0), "pieza", "piezas")}</Texto>
                  <Icono de={despiece ? ChevronUp : ChevronDown} color="ink600" />
                </Pressable>
                {despiece ? (
                  <View style={{ borderRadius: radio.tarjeta, borderWidth: 1, borderColor: c.border200, backgroundColor: c.surface100 }}>
                    {p.despiece.map((x, i) => (
                      <View key={i} style={{ flexDirection: "row", padding: espacio.s12, gap: espacio.s12, borderTopWidth: i ? 1 : 0, borderTopColor: c.border200 }}>
                        <Texto variante="labelMd" style={{ width: 28 }}>{x.cantidad}×</Texto>
                        <Texto variante="bodyMd" style={{ flex: 1 }}>{x.pieza}</Texto>
                        <Texto variante="bodySm" color="ink600">{medida(x.anchoCm, unidades)} × {medida(x.altoCm, unidades)}</Texto>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </>
          ) : cargando ? (
            <View style={{ gap: espacio.s12 }}>
              <Esqueleto alto={24} ancho={140} radio={radio.completo} />
              <Esqueleto alto={30} ancho="70%" />
              <Esqueleto alto={20} />
              <Esqueleto alto={30} ancho="45%" />
              <Esqueleto alto={200} radio={radio.tarjeta} />
            </View>
          ) : null}
        </View>
      </ScrollView>

      {p ? (
        <BarraFija>
          <View style={{ flexDirection: "row", gap: espacio.s12 }}>
            <Boton titulo="Ver en mi espacio" icono={Frame} variante="secundario" onPress={() => setVerEspacio(true)} style={{ flex: 1 }} />
            <Boton titulo="Guardar" icono={BookmarkPlus} onPress={() => setGuardar(true)} style={{ flex: 1 }} accessibilityHint="Guardar en un proyecto" />
          </View>
        </BarraFija>
      ) : null}

      {p ? (
        <>
          <HojaInferior visible={verEspacio} titulo="En su espacio" onCerrar={() => setVerEspacio(false)}>
            <VistaEnEspacio propuesta={p} onGenerada={() => void recargar()} onCerrar={() => setVerEspacio(false)} />
          </HojaInferior>
          <HojaGuardar propuesta={p} visible={guardar} onCerrar={() => setGuardar(false)} />
        </>
      ) : null}
    </Pantalla>
  );
}

function FichaTecnica({ p }: { p: Propuesta }) {
  const { c } = useTema();
  const unidades = usePreferencias((s) => s.unidades);
  const filas: [string, string][] = [
    ["Ancho", medida(p.medidas.anchoCm, unidades)],
    ["Alto", medida(p.medidas.altoCm, unidades)],
    ["Fondo", medida(p.medidas.fondoCm, unidades)],
    ["Material", p.materialTexto],
    ["Acabado", p.acabado],
    ["Puertas", String(p.puertas)],
    ["Cajones", String(p.cajones)],
    ["Tablero", `${String(p.areaM2).replace(".", ",")} m²`],
    ["Fabricación", `~${p.fabricacionDias} días hábiles`],
    [
      "Espacio",
      p.limites.anchoMaxCm && p.limites.altoMaxCm
        ? `${medida(p.limites.anchoMaxCm, unidades)} × ${medida(p.limites.altoMaxCm, unidades)}${p.limites.fondoMaxCm ? ` × ${medida(p.limites.fondoMaxCm, unidades)}` : ""}${p.medidasOrigen === "ia" ? " (estimado)" : ""}`
        : "Sin medidas",
    ],
  ];
  return (
    <View style={{ gap: espacio.s12 }}>
      <Texto variante="titleMd" accessibilityRole="header">Ficha técnica</Texto>
      <View style={{ borderTopWidth: 1, borderTopColor: c.border200 }}>
        {filas.map(([k, v]) => (
          <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", gap: espacio.s16, paddingVertical: espacio.s12, borderBottomWidth: 1, borderBottomColor: c.border200 }} accessible accessibilityLabel={`${k}: ${v}`}>
            <Texto variante="bodyMd" color="ink600">{k}</Texto>
            <Texto variante="bodyMd" style={{ flexShrink: 1, textAlign: "right" }}>{v}</Texto>
          </View>
        ))}
      </View>
    </View>
  );
}

function HojaGuardar({ propuesta: p, visible, onCerrar }: { propuesta: Propuesta; visible: boolean; onCerrar: () => void }) {
  const { c } = useTema();
  const moneda = usePreferencias((s) => s.moneda);
  const [creando, setCreando] = useState(false);
  const [guardandoEn, setGuardandoEn] = useState<number | null>(null);
  const proyectos = useConsulta(api.proyectos);
  const yaEn = new Set(p.proyectos?.map((x) => x.id));

  const guardarEn = async (proy: Proyecto) => {
    setGuardandoEn(proy.id);
    try {
      await api.guardarEnProyecto(proy.id, p.id);
      onCerrar();
      router.dismissTo("/");
      toast.exito(`Guardada en ${proy.nombre}`, { texto: "Ver", onPress: () => router.push(`/proyecto/${proy.id}`) });
    } catch (e) {
      toast.error(e instanceof ErrorApi ? e.message : "No pudimos guardarla. Intente de nuevo");
    } finally {
      setGuardandoEn(null);
    }
  };

  return (
    <>
      <HojaInferior
        visible={visible && !creando}
        titulo="Guardar en proyecto"
        onCerrar={onCerrar}
        pie={<Boton titulo="Nuevo proyecto" icono={Plus} variante="secundario" onPress={() => setCreando(true)} ancho />}
      >
        {proyectos.error ? <Aviso tipo={proyectos.error.sinConexion ? "sinConexion" : "error"} mensaje={proyectos.error.message} accion={{ texto: "Reintentar", onPress: proyectos.recargar }} /> : null}
        {proyectos.cargando ? [0, 1].map((i) => <Esqueleto key={i} alto={64} radio={radio.tarjeta} />) : null}
        {proyectos.datos?.length === 0 ? <Texto variante="bodyMd" color="ink600">Aún no tiene proyectos. Cree uno para guardar esta propuesta.</Texto> : null}
        {proyectos.datos?.map((proy) => {
          const esta = yaEn.has(proy.id);
          return (
            <Pressable
              key={proy.id}
              onPress={() => guardarEn(proy)}
              disabled={esta || guardandoEn !== null}
              accessibilityRole="button"
              accessibilityState={{ disabled: esta }}
              accessibilityLabel={`${proy.nombre}${esta ? ", ya está guardada aquí" : ""}`}
              style={({ pressed }) => ({
                flexDirection: "row", alignItems: "center", gap: espacio.s12, padding: espacio.s16, minHeight: 64,
                borderRadius: radio.tarjeta, borderWidth: 1, borderColor: c.border200, backgroundColor: pressed ? c.surface300 : c.surface100,
                opacity: esta ? 0.6 : 1,
              })}
            >
              <View style={{ flex: 1, gap: espacio.s4 }}>
                <Texto variante="titleSm">{proy.nombre}</Texto>
                <Texto variante="bodySm" color="ink600">
                  {esta ? "Ya está guardada aquí" : `${plural(proy.cantidad, "propuesta", "propuestas")} · ${precioTexto(proy.presupuesto, moneda)}`}
                </Texto>
              </View>
              {esta ? <Icono de={Check} color="accentInk" /> : guardandoEn === proy.id ? <Texto variante="labelMd" color="brandInk">Guardando…</Texto> : null}
            </Pressable>
          );
        })}
      </HojaInferior>
      <HojaNuevoProyecto
        visible={visible && creando}
        espacioId={null}
        onCerrar={() => setCreando(false)}
        onCreado={(proy) => {
          setCreando(false);
          void guardarEn(proy);
        }}
      />
    </>
  );
}
