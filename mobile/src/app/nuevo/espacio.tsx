import { useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Camera, LayoutGrid, ScanLine } from "lucide-react-native";
import { api } from "@/servicios/api";
import { useConsulta } from "@/hooks/useConsulta";
import { espacio, margen } from "@/theme/tokens";
import { useBorrador } from "@/store/borrador";
import { cerrarFlujo } from "@/lib/flujo";
import { plural } from "@/lib/formato";
import { Pantalla, BarraFija } from "@/componentes/Pantalla";
import { BarraSuperior } from "@/componentes/BarraSuperior";
import { Texto } from "@/componentes/Texto";
import { Boton } from "@/componentes/Boton";
import { Aviso } from "@/componentes/Aviso";
import { Esqueleto } from "@/componentes/Esqueleto";
import { OpcionTarjeta } from "@/componentes/OpcionTarjeta";
import { TarjetaEspacio } from "@/componentes/TarjetaEspacio";
import { HojaInferior } from "@/componentes/HojaInferior";

export default function PasoEspacio() {
  const { espacio: elegido, elegirEspacio } = useBorrador();
  const [eligiendo, setEligiendo] = useState(false);
  const { datos: espacios, error, cargando, recargar } = useConsulta(api.espacios);

  const capturar = (modo: "foto" | "escanear") => router.push({ pathname: "/espacio/nuevo", params: { modo, desde: "flujo" } });

  return (
    <Pantalla bordes={["top", "bottom"]}>
      <BarraSuperior variante="flujo" paso={1} onCerrar={cerrarFlujo} />
      <ScrollView contentContainerStyle={{ padding: margen.lateral, gap: margen.secciones }}>
        <View style={{ gap: espacio.s8 }}>
          <Texto variante="titleLg" accessibilityRole="header">¿Dónde irá el mueble?</Texto>
          <Texto variante="bodyMd" color="ink600">Con el espacio, cada propuesta se ajusta a sus medidas reales y combina con lo que ya tiene.</Texto>
        </View>

        {elegido ? (
          <View style={{ gap: espacio.s8 }}>
            <Texto variante="labelSm" color="ink600">Espacio elegido</Texto>
            <TarjetaEspacio espacio={elegido} horizontal seleccionado onPress={() => setEligiendo(true)} />
          </View>
        ) : null}

        {error ? <Aviso tipo={error.sinConexion ? "sinConexion" : "error"} mensaje={error.message} accion={{ texto: "Reintentar", onPress: recargar }} /> : null}

        <View style={{ gap: espacio.s12 }}>
          <OpcionTarjeta icono={Camera} titulo="Tomar foto" descripcion="Foto del muro y sus medidas en un diagrama" onPress={() => capturar("foto")} />
          <OpcionTarjeta icono={ScanLine} titulo="Escanear espacio" descripcion="Foto, medidas y obstáculos como enchufes, ventanas o zócalo" onPress={() => capturar("escanear")} />
          {cargando && !espacios ? (
            <Esqueleto alto={88} radio={16} />
          ) : (
            <OpcionTarjeta
              icono={LayoutGrid}
              titulo="Elegir espacio guardado"
              descripcion={espacios?.length ? plural(espacios.length, "espacio guardado", "espacios guardados") : ""}
              deshabilitado={!espacios?.length}
              motivo="Aún no tiene espacios guardados. Tome una foto o escanee uno"
              onPress={() => setEligiendo(true)}
            />
          )}
        </View>
      </ScrollView>

      <BarraFija>
        <View style={{ flexDirection: "row", gap: espacio.s12, alignItems: "flex-start" }}>
          <Boton
            titulo="Omitir"
            variante="texto"
            onPress={() => {
              elegirEspacio(null);
              router.push("/nuevo/necesidad");
            }}
            accessibilityHint="Sigue sin espacio; escribirá las medidas en el paso 3"
          />
          <Boton
            titulo="Continuar"
            onPress={() => router.push("/nuevo/necesidad")}
            deshabilitado={!elegido}
            motivo="Elija un espacio o toque Omitir"
            style={{ flex: 1 }}
          />
        </View>
      </BarraFija>

      <HojaInferior visible={eligiendo} titulo="Sus espacios" onCerrar={() => setEligiendo(false)}>
        {espacios?.map((e) => (
          <TarjetaEspacio
            key={e.id}
            espacio={e}
            horizontal
            seleccionado={elegido?.id === e.id}
            onPress={() => {
              elegirEspacio(e);
              setEligiendo(false);
            }}
          />
        ))}
      </HojaInferior>
    </Pantalla>
  );
}
