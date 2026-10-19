import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight, Camera, Images, Plus, RefreshCw, X } from "lucide-react-native";
import { api, ErrorApi, urlArchivo } from "@/servicios/api";
import { useCatalogos } from "@/hooks/useCatalogos";
import { useTema } from "@/theme/tema";
import { espacio, margen, radio } from "@/theme/tokens";
import { usePreferencias } from "@/store/preferencias";
import { useBorrador } from "@/store/borrador";
import { aCm, desdeCm, medida } from "@/lib/formato";
import type { Analisis, Espacio, Marcas, OrigenMedidas } from "@/servicios/tipos";
import { Pantalla, BarraFija } from "@/componentes/Pantalla";
import { BarraSuperior } from "@/componentes/BarraSuperior";
import { BotonIcono } from "@/componentes/BotonIcono";
import { Texto } from "@/componentes/Texto";
import { Icono } from "@/componentes/Icono";
import { Boton } from "@/componentes/Boton";
import { Chip, GrupoChips } from "@/componentes/Chip";
import { CampoTexto } from "@/componentes/CampoTexto";
import { Aviso } from "@/componentes/Aviso";
import { Esqueleto } from "@/componentes/Esqueleto";
import { Etiqueta } from "@/componentes/Etiqueta";
import { DiagramaMuro, type Cota } from "@/componentes/DiagramaMuro";
import { MarcarMuro } from "@/componentes/MarcarMuro";
import { toast } from "@/componentes/Toast";

type Paso = "foto" | "medidas" | "marcas" | "analisis";
type Params = { modo?: "foto" | "escanear"; desde?: "flujo"; id?: string; paso?: "marcas" };

/**
 * Captura guiada: foto frontal del muro → medidas sobre un diagrama → análisis de la foto con IA.
 * "Escanear" añade la altura desde el piso y el paso de revisar y marcar obstáculos.
 * Las medidas vienen del metro de la persona; la IA solo describe la foto.
 */
export default function CapturaEspacio() {
  const { modo = "foto", desde, id, paso: pasoInicial } = useLocalSearchParams<Params>();
  const editando = id ? Number(id) : null;
  const escanear = modo === "escanear";
  const { c } = useTema();
  const unidades = usePreferencias((p) => p.unidades);
  const lim = useCatalogos().datos?.limites;

  const [paso, setPaso] = useState<Paso>(editando ? "medidas" : "foto");
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [analisis, setAnalisis] = useState<Analisis | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [errorAnalisis, setErrorAnalisis] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [m, setM] = useState<Record<Cota, string>>({ ancho: "", alto: "", fondo: "", piso: "" });
  // Las medidas pueden venir de la persona (metro) o de la IA (estimadas mirando la foto).
  const [origen, setOrigen] = useState<OrigenMedidas>("persona");
  const escritasPorPersona = useRef(false);
  const [activa, setActiva] = useState<Cota | null>(null);
  const [tocados, setTocados] = useState<Partial<Record<Cota | "nombre", boolean>>>({});
  const [nuevoObstaculo, setNuevoObstaculo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [marcas, setMarcas] = useState<Marcas | null>(null);
  const [puntoA, setPuntoA] = useState<{ x: number; y: number } | null>(null);
  const soloMarcas = !!editando && pasoInicial === "marcas";

  // Al editar, se cargan los datos guardados.
  useEffect(() => {
    if (!editando) return;
    api.espacio(editando).then((e) => {
      setNombre(e.nombre);
      setFotoUrl(e.fotoUrl);
      setAnalisis(e.analisis);
      setOrigen(e.medidasOrigen);
      escritasPorPersona.current = true;
      setMarcas(e.marcas);
      if (pasoInicial === "marcas" && e.fotoUrl) setPaso("marcas");
      setM({ ancho: desdeCm(e.anchoCm, unidades), alto: desdeCm(e.altoCm, unidades), fondo: desdeCm(e.fondoCm, unidades), piso: desdeCm(e.alturaPisoCm, unidades) });
    }).catch((e) => setErrorGuardar(e instanceof ErrorApi ? e.message : "No pudimos cargar el espacio"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editando]);

  const usarFoto = async (uri: string) => {
    setFotoUri(uri);
    setMarcas(null); // otra foto: las marcas anteriores ya no sirven
    setPaso("medidas");
    setSubiendo(true);
    setErrorFoto(null);
    setAnalisis(null);
    setErrorAnalisis(null);
    try {
      const { fotoUrl: url } = await api.subirFoto(uri);
      setFotoUrl(url);
      setSubiendo(false);
      // El análisis corre mientras la persona escribe las medidas.
      setAnalizando(true);
      try {
        const resultado = await api.analizarFoto(url);
        setAnalisis(resultado);
        // Si la persona aún no escribió medidas, se llenan con la estimación de la IA.
        const est = resultado.medidas;
        if (est && !escritasPorPersona.current) {
          setM((x) => ({ ...x, ancho: desdeCm(est.anchoCm, unidades), alto: desdeCm(est.altoCm, unidades), fondo: x.fondo || desdeCm(est.fondoCm, unidades) }));
          setOrigen("ia");
        }
      } catch (e) {
        setErrorAnalisis(e instanceof ErrorApi ? e.message : "No pudimos analizar la foto. Puede guardar igual");
      } finally {
        setAnalizando(false);
      }
    } catch (e) {
      setSubiendo(false);
      setFotoUri(null);
      setErrorFoto(e instanceof ErrorApi ? e.message : "No pudimos subir la foto. Intente de nuevo");
      setPaso("foto");
    }
  };

  // Validación de medidas
  const cm = { ancho: aCm(m.ancho, unidades), alto: aCm(m.alto, unidades), fondo: aCm(m.fondo, unidades), piso: aCm(m.piso, unidades) };
  const rango = (k: Cota): readonly [number, number] | null =>
    !lim ? null : k === "ancho" ? lim.anchoCm : k === "alto" ? lim.altoCm : k === "fondo" ? lim.fondoCm : [0, 250];
  const errorDe = (k: Cota): string | null => {
    const v = cm[k];
    const obligatorio = k === "ancho" || k === "alto";
    if (v === null) return m[k].trim() ? "Escriba solo números" : obligatorio ? `Escriba ${k === "ancho" ? "el ancho" : "el alto"}` : null;
    const r = rango(k);
    if (r && (v < r[0] || v > r[1])) return `Debe estar entre ${medida(r[0], unidades)} y ${medida(r[1], unidades)}`;
    return null;
  };
  const errores = { ancho: errorDe("ancho"), alto: errorDe("alto"), fondo: errorDe("fondo"), piso: errorDe("piso") };
  const medidasOk = !errores.ancho && !errores.alto && !errores.fondo && !errores.piso && !!nombre.trim();
  const motivoMedidas = !nombre.trim()
    ? "Póngale un nombre al espacio"
    : analizando && !m.ancho && !m.alto
      ? "Espere la estimación de la IA o escriba las medidas"
      : (errores.ancho ?? errores.alto ?? errores.fondo ?? errores.piso ?? undefined);

  const guardar = async () => {
    if (!medidasOk) return;
    setGuardando(true);
    setErrorGuardar(null);
    const datos = {
      nombre: nombre.trim(), anchoCm: cm.ancho!, altoCm: cm.alto!, fondoCm: cm.fondo, alturaPisoCm: cm.piso, fotoUrl, analisis, medidasOrigen: origen,
      marcas: fotoUrl ? marcas : null,
    };
    try {
      const e: Espacio = editando ? await api.editarEspacio(editando, datos) : await api.crearEspacio(datos);
      if (desde === "flujo") {
        useBorrador.getState().elegirEspacio(e);
        router.back();
      } else if (editando) {
        router.back();
      } else {
        router.replace(`/espacio/${e.id}`);
      }
      toast.exito(editando ? "Cambios guardados" : `«${e.nombre}» guardado`);
    } catch (e) {
      setErrorGuardar(e instanceof ErrorApi ? e.message : "No pudimos guardar el espacio. Intente de nuevo");
    } finally {
      setGuardando(false);
    }
  };

  const siguienteDesdeMedidas = () => {
    setTocados({ ancho: true, alto: true, fondo: true, piso: true, nombre: true });
    if (!medidasOk) return;
    if (fotoUri || fotoUrl) setPaso("marcas");
    else void guardar();
  };

  const siguienteDesdeMarcas = () => {
    if (soloMarcas) void guardar();
    else setPaso("analisis");
  };

  if (paso === "foto") {
    return <PasoFoto escanear={escanear} error={errorFoto} onFoto={usarFoto} onSinFoto={() => setPaso("medidas")} />;
  }

  const titulo = editando ? "Editar espacio" : escanear ? "Escanear espacio" : "Nuevo espacio";
  const fotoVisible = fotoUri ?? urlArchivo(fotoUrl);

  if (paso === "medidas") {
    const campo = (k: Cota, etiqueta: string) => (
      <CampoTexto
        etiqueta={etiqueta}
        value={m[k]}
        onChangeText={(t) => {
          setM((x) => ({ ...x, [k]: t }));
          // Al corregir ancho o alto, las medidas pasan a ser de la persona.
          if (k === "ancho" || k === "alto") {
            escritasPorPersona.current = true;
            setOrigen("persona");
          }
        }}
        onFocus={() => setActiva(k)}
        onBlur={() => { setActiva(null); setTocados((x) => ({ ...x, [k]: true })); }}
        keyboardType="decimal-pad"
        sufijo={unidades}
        error={tocados[k] ? errores[k] : null}
      />
    );
    return (
      <Pantalla bordes={["top", "bottom"]} teclado>
        <BarraSuperior variante="compacta" titulo={titulo} atras={() => (editando ? router.back() : setPaso("foto"))} />
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: margen.lateral, gap: margen.secciones }}>
          {fotoVisible ? (
            <View style={{ flexDirection: "row", gap: espacio.s12, alignItems: "center" }}>
              <Image source={{ uri: fotoVisible }} style={{ width: 72, height: 72, borderRadius: radio.campo }} contentFit="cover" accessibilityLabel="Foto del muro" />
              <View style={{ flex: 1, gap: espacio.s4 }}>
                <Texto variante="labelLg">Foto del muro</Texto>
                <Texto variante="bodySm" color="ink600">
                  {subiendo ? "Subiendo…" : analizando ? "Analizando estilo y obstáculos…" : analisis ? "Análisis listo" : errorAnalisis ? "Sin análisis" : "Lista"}
                </Texto>
              </View>
              <Boton titulo="Cambiar" variante="texto" tamaño="pequeño" onPress={() => setPaso("foto")} />
            </View>
          ) : null}

          <View style={{ gap: espacio.s8 }}>
            <Texto variante="titleLg" accessibilityRole="header">Medidas del muro</Texto>
            <Texto variante="bodyMd" color="ink600">
              {fotoUri || fotoUrl
                ? "La IA las estima mirando su foto. Si tiene un metro a mano, corríjalas: el resultado será exacto."
                : "Use un metro. Mida el espacio libre donde irá el mueble, de lado a lado y del piso hacia arriba."}
            </Texto>
          </View>

          {analizando && !m.ancho && !m.alto ? (
            <Aviso tipo="info" mensaje="Estimando las medidas con su foto…" />
          ) : origen === "ia" && analisis?.medidas ? (
            <Aviso
              tipo="info"
              titulo={`Estimado por la IA · confianza ${analisis.medidas.confianza}`}
              mensaje={`Se basó en ${analisis.medidas.referencias.charAt(0).toLowerCase()}${analisis.medidas.referencias.slice(1)}. Puede corregirlas.`}
            />
          ) : null}

          <View style={{ borderRadius: radio.tarjeta, backgroundColor: c.surface100, borderWidth: 1, borderColor: c.border200, padding: espacio.s12 }}>
            <DiagramaMuro valores={m} activa={activa} conPiso={escanear} unidades={unidades} />
          </View>

          <CampoTexto
            etiqueta="Nombre del espacio"
            value={nombre}
            onChangeText={setNombre}
            onBlur={() => setTocados((x) => ({ ...x, nombre: true }))}
            placeholder="Ej: Muro de la sala"
            max={40}
            error={tocados.nombre && !nombre.trim() ? "Póngale un nombre para reconocerlo" : null}
          />
          <View style={{ flexDirection: "row", gap: espacio.s12, alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>{campo("ancho", "Ancho")}</View>
            <View style={{ flex: 1 }}>{campo("alto", "Alto")}</View>
          </View>
          <View style={{ flexDirection: "row", gap: espacio.s12, alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>{campo("fondo", "Fondo (opcional)")}</View>
            {escanear ? <View style={{ flex: 1 }}>{campo("piso", "Desde el piso (opcional)")}</View> : <View style={{ flex: 1 }} />}
          </View>
          {errorGuardar ? <Aviso tipo="error" mensaje={errorGuardar} /> : null}
        </ScrollView>
        <BarraFija>
          <Boton
            titulo={fotoUrl || subiendo || analizando || analisis ? "Continuar" : editando ? "Guardar cambios" : "Guardar espacio"}
            onPress={siguienteDesdeMedidas}
            cargando={guardando}
            deshabilitado={!medidasOk}
            motivo={motivoMedidas}
            ancho
          />
        </BarraFija>
      </Pantalla>
    );
  }

  if (paso === "marcas") {
    const foto = fotoVisible;
    return (
      <Pantalla bordes={["top", "bottom"]}>
        <BarraSuperior variante="compacta" titulo={titulo} atras={() => (soloMarcas ? router.back() : setPaso("medidas"))} />
        <ScrollView contentContainerStyle={{ padding: margen.lateral, gap: margen.secciones }}>
          <View style={{ gap: espacio.s8 }}>
            <Texto variante="titleLg" accessibilityRole="header">Marque el ancho en la foto</Texto>
            <Texto variante="bodyMd" color="ink600">
              Así sabemos el tamaño real de su muro en la imagen y podemos poner cada propuesta en su foto a escala.
            </Texto>
          </View>
          {foto ? (
            <MarcarMuro
              uri={foto}
              etiquetaAncho={cm.ancho ? medida(cm.ancho, unidades) : "Ancho"}
              marcas={marcas}
              onCambio={setMarcas}
              puntoA={puntoA}
              onPuntoA={setPuntoA}
            />
          ) : null}
          {errorGuardar ? <Aviso tipo="error" mensaje={errorGuardar} /> : null}
        </ScrollView>
        <BarraFija>
          <Boton
            titulo={soloMarcas ? "Guardar marcas" : "Continuar"}
            onPress={siguienteDesdeMarcas}
            cargando={guardando}
            deshabilitado={!marcas || subiendo}
            motivo={subiendo ? "Esperando que termine de subir la foto" : "Marque los dos extremos del ancho"}
            ancho
          />
          {!soloMarcas ? (
            <Boton
              titulo="Omitir este paso"
              variante="texto"
              onPress={() => { setMarcas(null); setPaso("analisis"); }}
              accessibilityHint="Sin marcas, las propuestas no se podrán ver en su foto"
              ancho
            />
          ) : null}
        </BarraFija>
      </Pantalla>
    );
  }

  // Paso de análisis: lo que la IA vio en la foto, corregible.
  const obstaculos = analisis?.obstaculos ?? [];
  const quitarObstaculo = (o: string) => analisis && setAnalisis({ ...analisis, obstaculos: obstaculos.filter((x) => x !== o) });
  const agregarObstaculo = () => {
    const o = nuevoObstaculo.trim();
    if (!o || !analisis) return;
    setAnalisis({ ...analisis, obstaculos: [...obstaculos, o] });
    setNuevoObstaculo("");
  };

  return (
    <Pantalla bordes={["top", "bottom"]} teclado>
      <BarraSuperior variante="compacta" titulo={titulo} atras={() => setPaso(fotoUri || fotoUrl ? "marcas" : "medidas")} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: margen.lateral, gap: margen.secciones }}>
        <View style={{ gap: espacio.s8 }}>
          <Etiqueta tipo="ia" texto="Análisis con IA" />
          <Texto variante="titleLg" accessibilityRole="header">{escanear ? "Revise lo que encontramos" : "Lo que vimos en la foto"}</Texto>
          <Texto variante="bodyMd" color="ink600">
            {escanear ? "Quite lo que no corresponda y agregue lo que falte. Las propuestas evitarán tapar estos elementos." : "Esto ayuda a que las propuestas combinen con su espacio. Puede corregirlo."}
          </Texto>
        </View>

        {analizando || subiendo ? (
          <View style={{ gap: espacio.s12 }} accessibilityLabel="Analizando la foto">
            <Esqueleto alto={22} ancho="40%" />
            <View style={{ flexDirection: "row", gap: espacio.s8 }}>{[0, 1, 2, 3].map((i) => <Esqueleto key={i} ancho={40} alto={40} radio={radio.completo} />)}</View>
            <Esqueleto alto={18} ancho="70%" />
            <Esqueleto alto={18} ancho="55%" />
          </View>
        ) : errorAnalisis ? (
          <Aviso tipo="alerta" mensaje={errorAnalisis} accion={fotoUrl ? { texto: "Reintentar análisis", onPress: async () => {
            setAnalizando(true); setErrorAnalisis(null);
            try { setAnalisis(await api.analizarFoto(fotoUrl)); } catch (e) { setErrorAnalisis(e instanceof ErrorApi ? e.message : "No pudimos analizar la foto"); } finally { setAnalizando(false); }
          } } : undefined} />
        ) : analisis ? (
          <>
            <CampoTexto etiqueta="Estilo" value={analisis.estilo} onChangeText={(estilo) => setAnalisis({ ...analisis, estilo })} max={40} />
            <View style={{ gap: espacio.s12 }}>
              <Texto variante="labelLg">Paleta</Texto>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: espacio.s12 }}>
                {analisis.paleta.map((p) => (
                  <View key={p.hex + p.nombre} style={{ alignItems: "center", gap: espacio.s4, width: 64 }} accessible accessibilityLabel={p.nombre}>
                    <View style={{ width: 40, height: 40, borderRadius: radio.completo, backgroundColor: p.hex, borderWidth: 1, borderColor: c.border200 }} />
                    <Texto variante="bodySm" color="ink600" centrado numberOfLines={2}>{p.nombre}</Texto>
                  </View>
                ))}
              </View>
            </View>
            <View style={{ gap: espacio.s4 }}>
              <Texto variante="bodyMd"><Texto variante="labelLg">Piso: </Texto>{analisis.piso}</Texto>
              <Texto variante="bodyMd"><Texto variante="labelLg">Luz: </Texto>{analisis.luz}</Texto>
            </View>
            <View style={{ gap: espacio.s12 }}>
              <Texto variante="labelLg">Obstáculos en el muro</Texto>
              {obstaculos.length ? (
                <GrupoChips>
                  {obstaculos.map((o) => <Chip key={o} texto={`${o}  ✕`} activo={false} onPress={() => quitarObstaculo(o)} />)}
                </GrupoChips>
              ) : (
                <Texto variante="bodySm" color="ink600">No vimos obstáculos.</Texto>
              )}
              {escanear ? (
                <View style={{ flexDirection: "row", gap: espacio.s8, alignItems: "flex-end" }}>
                  <View style={{ flex: 1 }}>
                    <CampoTexto etiqueta="Agregar obstáculo" value={nuevoObstaculo} onChangeText={setNuevoObstaculo} placeholder="Ej: interruptor a 110 cm" max={40} onSubmitEditing={agregarObstaculo} returnKeyType="done" />
                  </View>
                  <View style={{ paddingBottom: 30 }}>
                    <BotonIcono icono={Plus} etiqueta="Agregar obstáculo" fondo="superficie" onPress={agregarObstaculo} deshabilitado={!nuevoObstaculo.trim()} />
                  </View>
                </View>
              ) : null}
              {obstaculos.length ? <Texto variante="bodySm" color="ink600">Toque un obstáculo para quitarlo.</Texto> : null}
            </View>
          </>
        ) : null}
        {errorGuardar ? <Aviso tipo="error" mensaje={errorGuardar} /> : null}
      </ScrollView>
      <BarraFija>
        <Boton
          titulo={editando ? "Guardar cambios" : "Guardar espacio"}
          onPress={guardar}
          cargando={guardando}
          deshabilitado={subiendo}
          motivo="Esperando que termine de subir la foto"
          ancho
        />
        {analizando ? <Texto variante="bodySm" color="ink600" centrado>Puede guardar sin esperar el análisis</Texto> : null}
      </BarraFija>
    </Pantalla>
  );
}

/** Cámara con guía de encuadre. También permite elegir de la galería o seguir sin foto. */
function PasoFoto({ escanear, error, onFoto, onSinFoto }: { escanear: boolean; error: string | null; onFoto: (uri: string) => void; onSinFoto: () => void }) {
  const { c } = useTema();
  const insets = useSafeAreaInsets();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const camara = useRef<CameraView>(null);
  const [lista, setLista] = useState(false);
  const [tomando, setTomando] = useState(false);
  const [vista, setVista] = useState<string | null>(null);

  const disparar = async () => {
    if (!camara.current || tomando) return;
    setTomando(true);
    try {
      const f = await camara.current.takePictureAsync({ quality: 0.7 });
      if (f?.uri) setVista(f.uri);
    } catch {
      toast.error("No pudimos tomar la foto. Intente de nuevo");
    } finally {
      setTomando(false);
    }
  };

  const galeria = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!r.canceled) setVista(r.assets[0].uri);
  };

  const cerrar = () => (router.canGoBack() ? router.back() : router.replace("/"));

  // Vista previa: confirmar o repetir.
  if (vista) {
    return (
      <View style={{ flex: 1, backgroundColor: c.camaraFondo }}>
        <Image source={{ uri: vista }} style={{ flex: 1 }} contentFit="contain" accessibilityLabel="Foto tomada" />
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: margen.lateral, paddingBottom: insets.bottom + espacio.s16, gap: espacio.s12, backgroundColor: c.surface200 }}>
          <Texto variante="bodyMd" centrado>¿Se ve el muro completo y de frente?</Texto>
          <View style={{ flexDirection: "row", gap: espacio.s12 }}>
            <Boton titulo="Repetir" icono={RefreshCw} variante="secundario" onPress={() => setVista(null)} style={{ flex: 1 }} />
            <Boton titulo="Usar foto" onPress={() => onFoto(vista)} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    );
  }

  // Sin permiso todavía o negado.
  if (!permiso?.granted) {
    const negado = permiso && !permiso.canAskAgain;
    return (
      <Pantalla bordes={["top", "bottom"]}>
        <BarraSuperior variante="compacta" titulo={escanear ? "Escanear espacio" : "Tomar foto"} atras={cerrar} />
        <View style={{ flex: 1, padding: margen.lateral, justifyContent: "center", gap: espacio.s24 }}>
          <View style={{ alignItems: "center", gap: espacio.s16 }}>
            <View style={{ width: 72, height: 72, borderRadius: radio.completo, backgroundColor: c.brand100, alignItems: "center", justifyContent: "center" }}>
              <Icono de={Camera} color="brandInk" tamaño={32} />
            </View>
            <Texto variante="titleLg" centrado>{negado ? "La cámara está bloqueada" : "Necesitamos la cámara"}</Texto>
            <Texto variante="bodyMd" color="ink600" centrado>
              {negado ? "Actívela en Ajustes para fotografiar el muro, o elija una foto de su galería." : "La usamos solo para fotografiar el muro donde irá el mueble."}
            </Texto>
          </View>
          {error ? <Aviso tipo="error" mensaje={error} /> : null}
          <View style={{ gap: espacio.s12 }}>
            <Boton titulo={negado ? "Abrir Ajustes" : "Permitir cámara"} onPress={() => (negado ? Linking.openSettings() : pedirPermiso())} ancho />
            <Boton titulo="Elegir de la galería" icono={Images} variante="secundario" onPress={galeria} ancho />
            <Boton titulo="Seguir sin foto" variante="texto" onPress={onSinFoto} ancho />
          </View>
        </View>
      </Pantalla>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.camaraFondo }}>
      <CameraView ref={camara} style={{ flex: 1 }} facing="back" onCameraReady={() => setLista(true)} />
      {/* Guía de encuadre */}
      <View pointerEvents="none" style={{ position: "absolute", top: insets.top + 72, left: margen.lateral + 8, right: margen.lateral + 8, bottom: insets.bottom + 180, borderWidth: 2, borderColor: c.camaraGuia, borderRadius: radio.tarjeta, borderStyle: "dashed" }} />
      <View style={{ position: "absolute", top: insets.top + espacio.s8, left: espacio.s8, right: espacio.s8, flexDirection: "row", alignItems: "center", gap: espacio.s8 }}>
        <BotonIcono icono={X} etiqueta="Cerrar" fondo="velo" onPress={cerrar} />
        <View style={{ flex: 1, backgroundColor: c.camaraVelo, borderRadius: radio.boton, paddingVertical: espacio.s8, paddingHorizontal: espacio.s12 }}>
          <Texto variante="labelMd" style={{ color: c.camaraTinta }}>
            {escanear ? "Encuadre el muro de frente, con piso y enchufes a la vista" : "Encuadre el muro completo, de frente"}
          </Texto>
        </View>
      </View>
      {error ? (
        <View style={{ position: "absolute", top: insets.top + 72, left: margen.lateral, right: margen.lateral }}>
          <Aviso tipo="error" mensaje={error} />
        </View>
      ) : null}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + espacio.s24, paddingTop: espacio.s16, flexDirection: "row", alignItems: "center", justifyContent: "space-around", backgroundColor: c.camaraVelo }}>
        <Pressable onPress={galeria} accessibilityRole="button" accessibilityLabel="Elegir de la galería" style={{ width: 64, alignItems: "center", gap: espacio.s4 }} hitSlop={8}>
          <Images size={24} color={c.camaraTinta} strokeWidth={1.75} />
          <Texto variante="labelMd" style={{ color: c.camaraTinta }}>Galería</Texto>
        </Pressable>
        <Pressable
          onPress={disparar}
          disabled={!lista || tomando}
          accessibilityRole="button"
          accessibilityLabel="Tomar foto"
          style={({ pressed }) => ({ width: 76, height: 76, borderRadius: radio.completo, borderWidth: 4, borderColor: c.camaraTinta, alignItems: "center", justifyContent: "center", opacity: lista ? 1 : 0.5, transform: [{ scale: pressed ? 0.94 : 1 }] })}
        >
          {tomando ? <ActivityIndicator color={c.camaraTinta} /> : <View style={{ width: 60, height: 60, borderRadius: radio.completo, backgroundColor: c.camaraTinta }} />}
        </Pressable>
        <Pressable onPress={onSinFoto} accessibilityRole="button" accessibilityLabel="Seguir sin foto" style={{ width: 64, alignItems: "center", gap: espacio.s4 }} hitSlop={8}>
          <ArrowRight size={24} color={c.camaraTinta} strokeWidth={1.75} />
          <Texto variante="labelMd" style={{ color: c.camaraTinta }} centrado>Sin foto</Texto>
        </Pressable>
      </View>
    </View>
  );
}
