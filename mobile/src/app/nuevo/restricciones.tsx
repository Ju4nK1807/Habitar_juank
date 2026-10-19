import { useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Sparkles } from "lucide-react-native";
import { api, ErrorApi } from "@/servicios/api";
import { useCatalogos } from "@/hooks/useCatalogos";
import { useConsulta } from "@/hooks/useConsulta";
import { espacio, margen, radio } from "@/theme/tokens";
import { useBorrador } from "@/store/borrador";
import { usePreferencias } from "@/store/preferencias";
import { cerrarFlujo } from "@/lib/flujo";
import { aCm, desdeCm, medida, plural } from "@/lib/formato";
import { Pantalla, BarraFija } from "@/componentes/Pantalla";
import { BarraSuperior } from "@/componentes/BarraSuperior";
import { Texto } from "@/componentes/Texto";
import { Boton } from "@/componentes/Boton";
import { Chip, GrupoChips } from "@/componentes/Chip";
import { CampoTexto } from "@/componentes/CampoTexto";
import { Aviso } from "@/componentes/Aviso";
import { Esqueleto } from "@/componentes/Esqueleto";

type Campo = "ancho" | "alto" | "fondo";

export default function PasoRestricciones() {
  const b = useBorrador();
  const unidades = usePreferencias((p) => p.unidades);
  const catalogos = useCatalogos();
  const creditos = useConsulta(api.creditos);
  const [generando, setGenerando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<ErrorApi | null>(null);
  const [tocados, setTocados] = useState<Record<Campo, boolean>>({ ancho: false, alto: false, fondo: false });

  // Los campos guardan texto en las unidades de la persona; el borrador guarda cm.
  // Solo se reescriben al cambiar de unidades o de espacio; mientras escribe, no.
  const textosDesdeBorrador = () => ({ ancho: desdeCm(b.anchoCm, unidades), alto: desdeCm(b.altoCm, unidades), fondo: desdeCm(b.fondoCm, unidades) });
  const [textos, setTextos] = useState(textosDesdeBorrador);
  const origen = `${unidades}|${b.espacio?.id ?? ""}`;
  const [origenTextos, setOrigenTextos] = useState(origen);
  if (origen !== origenTextos) {
    setOrigenTextos(origen);
    setTextos(textosDesdeBorrador());
  }

  const lim = catalogos.datos?.limites;
  const esp = b.espacio;

  function validar(campo: Campo): string | null {
    const cm = campo === "ancho" ? b.anchoCm : campo === "alto" ? b.altoCm : b.fondoCm;
    const nombre = campo === "ancho" ? "El ancho" : campo === "alto" ? "El alto" : "El fondo";
    // Las medidas son opcionales; si hay una, hace falta la otra para poder comparar.
    if (cm === null) {
      const otra = campo === "ancho" ? b.altoCm : campo === "alto" ? b.anchoCm : null;
      return otra !== null && campo !== "fondo" ? `Escriba también ${campo === "ancho" ? "el ancho" : "el alto"}, o borre ambas` : null;
    }
    if (!lim) return null;
    const [min, max] = campo === "ancho" ? lim.anchoCm : campo === "alto" ? lim.altoCm : lim.fondoCm;
    if (cm < min || cm > max) return `${nombre} debe estar entre ${medida(min, unidades)} y ${medida(max, unidades)}`;
    // Solo se valida contra medidas tomadas con metro; las estimadas por la IA pueden corregirse.
    const delMuro = esp && esp.medidasOrigen !== "ia" ? (campo === "ancho" ? esp.anchoCm : campo === "alto" ? esp.altoCm : esp.fondoCm) : null;
    if (delMuro && cm > delMuro) return `${nombre} supera el del muro guardado. Ajústelo para poder diseñar`;
    return null;
  }

  const errores = { ancho: validar("ancho"), alto: validar("alto"), fondo: validar("fondo") };
  const saldo = creditos.datos?.saldo;
  const motivo =
    errores.ancho || errores.alto || errores.fondo ? (errores.ancho ?? errores.alto ?? errores.fondo)!
    : !b.presupuesto ? "Elija una franja de presupuesto"
    : saldo === 0 ? "No le quedan créditos. Mañana recibe nuevos"
    : !catalogos.datos ? "Cargando opciones…"
    : undefined;

  const cambiarMedida = (campo: Campo, texto: string) => {
    setTextos((t) => ({ ...t, [campo]: texto }));
    const cm = aCm(texto, unidades);
    b.cambiar(campo === "ancho" ? { anchoCm: cm } : campo === "alto" ? { altoCm: cm } : { fondoCm: cm });
  };

  const generar = async () => {
    setTocados({ ancho: true, alto: true, fondo: true });
    if (motivo || !b.tipo) return;
    setGenerando(true);
    setErrorEnvio(null);
    try {
      const r = await api.generar({
        tipo: b.tipo,
        descripcion: b.descripcion.trim(),
        anchoMaxCm: b.anchoCm,
        altoMaxCm: b.altoCm,
        // Si quedaron las medidas del espacio sin cambios, se conserva su origen (metro o IA).
        medidasOrigen: esp && b.anchoCm === esp.anchoCm && b.altoCm === esp.altoCm ? esp.medidasOrigen : "persona",
        fondoMaxCm: b.fondoCm,
        material: b.material,
        presupuesto: b.presupuesto!,
        espacioId: esp?.id ?? null,
        referencias: b.referencias.map((r) => r.fotoUrl).filter((u): u is string => !!u),
      });
      b.cambiar({ generacionEnCurso: r.id });
      router.push("/nuevo/disenando");
    } catch (e) {
      setErrorEnvio(e instanceof ErrorApi ? e : new ErrorApi("No pudimos empezar el diseño. Intente de nuevo", "desconocido", 0));
    } finally {
      setGenerando(false);
    }
  };

  const materialElegido = catalogos.datos?.materiales.find((m) => m.id === b.material);
  const campo = (c: Campo, etiqueta: string, opcional?: boolean) => (
    <View style={{ flex: 1 }}>
      <CampoTexto
        etiqueta={opcional ? `${etiqueta} (opcional)` : etiqueta}
        value={textos[c]}
        onChangeText={(t) => cambiarMedida(c, t)}
        onBlur={() => setTocados((x) => ({ ...x, [c]: true }))}
        keyboardType="decimal-pad"
        sufijo={unidades}
        placeholder={c === "ancho" ? "240" : c === "alto" ? "200" : "40"}
        error={tocados[c] ? errores[c] : null}
      />
    </View>
  );

  return (
    <Pantalla bordes={["top", "bottom"]} teclado>
      <BarraSuperior variante="flujo" paso={3} onCerrar={cerrarFlujo} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: margen.lateral, gap: margen.secciones }}>
        <View style={{ gap: espacio.s8 }}>
          <Texto variante="titleLg" accessibilityRole="header">Restricciones</Texto>
          <Texto variante="bodyMd" color="ink600">
            Las medidas son opcionales. Si las pone, las propuestas las respetan y comprobamos que quepan; si no, la IA propone tamaños según su foto.
          </Texto>
        </View>

        {esp ? (
          <Aviso
            tipo="info"
            titulo={esp.medidasOrigen === "ia" ? `Medidas estimadas de «${esp.nombre}»` : `Medidas de «${esp.nombre}»`}
            mensaje={`${medida(esp.anchoCm, unidades)} de ancho × ${medida(esp.altoCm, unidades)} de alto${esp.fondoCm ? ` × ${medida(esp.fondoCm, unidades)} de fondo` : ""}. ${esp.medidasOrigen === "ia" ? "La IA las calculó mirando la foto; si midió con metro, corríjalas." : "Puede reducirlas, no superarlas."}`}
          />
        ) : null}

        <View style={{ gap: espacio.s16 }}>
          <View style={{ flexDirection: "row", gap: espacio.s12, alignItems: "flex-start" }}>
            {campo("ancho", "Ancho máximo", true)}
            {campo("alto", "Alto máximo", true)}
          </View>
          {campo("fondo", "Fondo máximo", true)}
        </View>

        <View style={{ gap: espacio.s12 }}>
          <Texto variante="labelLg">Material</Texto>
          {catalogos.datos ? (
            <>
              <GrupoChips>
                {catalogos.datos.materiales.map((m) => <Chip key={m.id} texto={m.nombre} activo={b.material === m.id} onPress={() => b.cambiar({ material: m.id })} />)}
              </GrupoChips>
              {materialElegido?.descripcion ? <Texto variante="bodySm" color="ink600">{materialElegido.descripcion}</Texto> : null}
            </>
          ) : catalogos.error ? (
            <Aviso tipo={catalogos.error.sinConexion ? "sinConexion" : "error"} mensaje={catalogos.error.message} accion={{ texto: "Reintentar", onPress: catalogos.recargar }} />
          ) : (
            <GrupoChips>{[120, 90, 110, 100].map((w, i) => <Esqueleto key={i} ancho={w} alto={36} radio={radio.completo} />)}</GrupoChips>
          )}
        </View>

        <View style={{ gap: espacio.s12 }}>
          <Texto variante="labelLg">Presupuesto</Texto>
          {catalogos.datos ? (
            <GrupoChips>
              {catalogos.datos.presupuestos.map((p) => <Chip key={p.id} texto={p.nombre} activo={b.presupuesto === p.id} onPress={() => b.cambiar({ presupuesto: p.id })} />)}
            </GrupoChips>
          ) : (
            <GrupoChips>{[100, 120, 120, 100].map((w, i) => <Esqueleto key={i} ancho={w} alto={36} radio={radio.completo} />)}</GrupoChips>
          )}
          <Texto variante="bodySm" color="ink600">En pesos colombianos. El precio final de cada propuesta se calcula con su despiece.</Texto>
        </View>

        {errorEnvio ? (
          <Aviso
            tipo={errorEnvio.sinConexion ? "sinConexion" : "error"}
            mensaje={errorEnvio.codigo === "sin_creditos" || errorEnvio.codigo === "excede_espacio" ? errorEnvio.message : `${errorEnvio.message}. El crédito no se descontó`}
          />
        ) : null}
      </ScrollView>

      <BarraFija>
        <Boton
          titulo="Generar 4 propuestas · 1 crédito"
          icono={Sparkles}
          onPress={generar}
          cargando={generando}
          deshabilitado={!!motivo}
          motivo={motivo}
          ancho
        />
        {saldo !== undefined && !motivo ? (
          <Texto variante="bodySm" color="ink600" centrado>Tiene {plural(saldo, "crédito", "créditos")}</Texto>
        ) : null}
      </BarraFija>
    </Pantalla>
  );
}
