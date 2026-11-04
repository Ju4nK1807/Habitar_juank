import { useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Camera, Images, LayoutGrid } from "lucide-react-native";
import { api, urlArchivo } from "@/servicios/api";
import { useConsulta } from "@/hooks/useConsulta";
import { useTema } from "@/theme/tema";
import { espacio, margen, radio } from "@/theme/tokens";
import { useBorrador } from "@/store/borrador";
import { cerrarFlujo } from "@/lib/flujo";
import { usarFoto } from "@/lib/fotoEspacio";
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
import { toast } from "@/componentes/Toast";

export default function PasoEspacio() {
  const { c } = useTema();
  const { espacio: elegido, foto, elegirEspacio } = useBorrador();
  const [eligiendo, setEligiendo] = useState(false);
  const { datos: espacios, error, cargando, recargar } = useConsulta(api.espacios);

  const abrir = async (origen: "camara" | "galeria") => {
    if (origen === "camara") {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) {
        toast.error("Habita no tiene permiso para usar la cámara. Actívelo en Ajustes o elija una foto de la galería");
        return;
      }
    }
    const opciones: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.7 };
    const r = origen === "camara" ? await ImagePicker.launchCameraAsync(opciones) : await ImagePicker.launchImageLibraryAsync(opciones);
    if (r.canceled) return;
    usarFoto(r.assets[0].uri);
  };

  const imagen = foto?.uri ?? urlArchivo(elegido?.fotoUrl);
  const hayEspacio = !!foto || !!elegido;

  return (
    <Pantalla bordes={["top", "bottom"]}>
      <BarraSuperior variante="flujo" paso={1} onCerrar={cerrarFlujo} />
      <ScrollView contentContainerStyle={{ padding: margen.lateral, gap: margen.secciones }}>
        <View style={{ gap: espacio.s8 }}>
          <Texto variante="titleLg" accessibilityRole="header">¿Dónde va el mueble?</Texto>
          <Texto variante="bodyMd" color="ink600">
            Tome una foto de su cuarto, sala o cocina. Miramos sus colores y le recomendamos qué mueble le queda mejor.
          </Texto>
        </View>

        {imagen ? (
          <View style={{ gap: espacio.s8 }}>
            <Image
              source={{ uri: imagen }}
              style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: radio.tarjeta, backgroundColor: c.surface200 }}
              contentFit="cover"
              accessibilityLabel={elegido ? `Foto de ${elegido.nombre}` : "Foto de su espacio"}
            />
            <Texto variante="bodySm" color="ink600">
              {elegido ? `Espacio guardado: ${elegido.nombre}` : "Mientras escribe lo que quiere, miramos los colores de la foto."}
            </Texto>
          </View>
        ) : null}

        {elegido && !elegido.fotoUrl ? (
          <Aviso tipo="info" mensaje="Este espacio no tiene foto. Las propuestas no podrán usar sus colores ni verse en su espacio." />
        ) : null}

        {error ? <Aviso tipo={error.sinConexion ? "sinConexion" : "error"} mensaje={error.message} accion={{ texto: "Reintentar", onPress: recargar }} /> : null}

        <View style={{ gap: espacio.s12 }}>
          <OpcionTarjeta
            icono={Camera}
            titulo={hayEspacio ? "Tomar otra foto" : "Tomar foto"}
            descripcion="De frente al lugar donde irá el mueble"
            onPress={() => abrir("camara")}
          />
          <OpcionTarjeta icono={Images} titulo="Elegir de la galería" descripcion="Una foto que ya tenga del espacio" onPress={() => abrir("galeria")} />
          {cargando && !espacios ? (
            <Esqueleto alto={88} radio={16} />
          ) : (
            <OpcionTarjeta
              icono={LayoutGrid}
              titulo="Usar un espacio guardado"
              descripcion={espacios?.length ? plural(espacios.length, "espacio guardado", "espacios guardados") : ""}
              deshabilitado={!espacios?.length}
              motivo="Aún no tiene espacios guardados. Tome una foto y queda guardado"
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
            accessibilityHint="Sigue sin foto; las propuestas no usarán los colores de su espacio"
          />
          <Boton
            titulo="Continuar"
            onPress={() => router.push("/nuevo/necesidad")}
            deshabilitado={!hayEspacio}
            motivo="Tome o elija una foto, o toque Omitir"
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
