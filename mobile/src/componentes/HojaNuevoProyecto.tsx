import { useState } from "react";
import { api, ErrorApi } from "@/servicios/api";
import type { Proyecto } from "@/servicios/tipos";
import { HojaInferior } from "./HojaInferior";
import { CampoTexto } from "./CampoTexto";
import { Boton } from "./Boton";

type Props = { visible: boolean; onCerrar: () => void; onCreado: (p: Proyecto) => void; espacioId?: number | null; sugerencia?: string };

export function HojaNuevoProyecto({ visible, onCerrar, onCreado, espacioId, sugerencia = "" }: Props) {
  const [nombre, setNombre] = useState(sugerencia);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al abrirse, empieza limpia.
  const [abierta, setAbierta] = useState(visible);
  if (visible !== abierta) {
    setAbierta(visible);
    if (visible) {
      setNombre(sugerencia);
      setError(null);
    }
  }

  const crear = async () => {
    setGuardando(true);
    setError(null);
    try {
      onCreado(await api.crearProyecto(nombre.trim(), espacioId));
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No pudimos crear el proyecto. Intente de nuevo");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <HojaInferior
      visible={visible}
      titulo="Nuevo proyecto"
      onCerrar={onCerrar}
      pie={
        <Boton
          titulo="Crear proyecto"
          onPress={crear}
          cargando={guardando}
          deshabilitado={!nombre.trim()}
          motivo="Escriba un nombre para crearlo"
          ancho
        />
      }
    >
      <CampoTexto
        etiqueta="Nombre del proyecto"
        value={nombre}
        onChangeText={setNombre}
        placeholder="Ej: Remodelación de la sala"
        max={40}
        autoFocus
        error={error}
        returnKeyType="done"
        onSubmitEditing={() => nombre.trim() && crear()}
      />
    </HojaInferior>
  );
}
