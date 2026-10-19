import { useState } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { useTema } from "@/theme/tema";
import { alto, espacio, radio, tipografia } from "@/theme/tokens";
import { Texto } from "./Texto";

type Props = Omit<TextInputProps, "style"> & {
  etiqueta: string;
  ayuda?: string;
  error?: string | null;
  /** Muestra "n/max" y bloquea al llegar al máximo. */
  max?: number;
  sufijo?: string;
  lineas?: number;
};

export function CampoTexto({ etiqueta, ayuda, error, max, sufijo, lineas, value = "", ...resto }: Props) {
  const { c } = useTema();
  const [foco, setFoco] = useState(false);
  const multilinea = !!lineas && lineas > 1;
  const cerca = max !== undefined && value.length >= max * 0.9;

  return (
    <View style={{ gap: espacio.s8 }}>
      <Texto variante="labelLg">{etiqueta}</Texto>
      <View
        style={{
          flexDirection: "row",
          alignItems: multilinea ? "flex-start" : "center",
          minHeight: multilinea ? 22 * lineas + espacio.s24 : alto.campo,
          borderRadius: radio.campo,
          borderWidth: foco || error ? 2 : 1,
          borderColor: error ? c.danger600 : foco ? c.brand600 : c.border400,
          backgroundColor: c.surface100,
          paddingHorizontal: foco || error ? espacio.s16 - 1 : espacio.s16,
        }}
      >
        <TextInput
          {...resto}
          value={value}
          maxLength={max}
          multiline={multilinea}
          textAlignVertical={multilinea ? "top" : "center"}
          placeholderTextColor={c.ink400}
          selectionColor={c.brand600}
          cursorColor={c.brand600}
          accessibilityLabel={etiqueta}
          accessibilityHint={error ?? ayuda}
          maxFontSizeMultiplier={1.4}
          onFocus={(e) => { setFoco(true); resto.onFocus?.(e); }}
          onBlur={(e) => { setFoco(false); resto.onBlur?.(e); }}
          style={[
            tipografia.bodyLg,
            { flex: 1, color: c.ink900, paddingVertical: multilinea ? espacio.s12 : 0, minHeight: multilinea ? 22 * lineas : undefined },
          ]}
        />
        {sufijo ? <Texto variante="bodyMd" color="ink600" style={{ marginLeft: espacio.s8 }}>{sufijo}</Texto> : null}
      </View>
      {(error || ayuda || max !== undefined) && (
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: espacio.s12 }}>
          <Texto variante="bodySm" color={error ? "danger600" : "ink600"} style={{ flex: 1 }} accessibilityLiveRegion="polite">
            {error ?? ayuda ?? ""}
          </Texto>
          {max !== undefined && (
            <Texto variante="bodySm" color={value.length >= max ? "danger600" : cerca ? "warning600" : "ink600"} accessibilityLabel={`${value.length} de ${max} caracteres`}>
              {value.length}/{max}
            </Texto>
          )}
        </View>
      )}
    </View>
  );
}
