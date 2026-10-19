// Tokens del sistema de diseño de Habita. Ningún componente escribe colores ni medidas sueltas.

const claro = {
  surface000: "#FBF8F4",
  surface100: "#FFFFFF",
  surface200: "#F4EEE6",
  surface300: "#EAE2D6",
  ink900: "#1F1A14",
  ink600: "#5C5347",
  ink400: "#6E6458",
  brand600: "#A8492A",
  brand500: "#C25B36",
  brand100: "#F7E7DE",
  brandInk: "#8E3D22",
  onBrand: "#FFFFFF",
  accent600: "#2F6B52",
  accent100: "#E2EFE8",
  accentInk: "#235340",
  onAccent: "#FFFFFF",
  warning600: "#8A5800",
  warning100: "#FBEFD9",
  danger600: "#B3261E",
  danger100: "#FBE4E1",
  border200: "#E3DACD",
  border400: "#9C8E7B",
  scrim: "rgba(31, 26, 20, 0.45)",
  // Sobre la cámara el fondo es siempre negro, en ambos temas.
  camaraFondo: "#000000",
  camaraTinta: "#FFFFFF",
  camaraVelo: "rgba(0, 0, 0, 0.55)",
  camaraGuia: "rgba(255, 255, 255, 0.85)",
};

export type Colores = typeof claro;

const oscuro: Colores = {
  surface000: "#15110D",
  surface100: "#1F1A15",
  surface200: "#28221B",
  surface300: "#352D25",
  ink900: "#F4EEE6",
  ink600: "#C9BEB0",
  ink400: "#A3968A",
  brand600: "#D9734C",
  brand500: "#E68A64",
  brand100: "#3A2419",
  brandInk: "#F0A27F",
  onBrand: "#15110D",
  accent600: "#5FB08C",
  accent100: "#1C3329",
  accentInk: "#8FD1B2",
  onAccent: "#15110D",
  warning600: "#E0A93B",
  warning100: "#3A2C10",
  danger600: "#F2766B",
  danger100: "#3B1A17",
  border200: "#3A3128",
  border400: "#7A6D5F",
  scrim: "rgba(0, 0, 0, 0.6)",
  camaraFondo: "#000000",
  camaraTinta: "#FFFFFF",
  camaraVelo: "rgba(0, 0, 0, 0.55)",
  camaraGuia: "rgba(255, 255, 255, 0.85)",
};

export const paletas = { claro, oscuro };

export const fuentes = {
  display: "Fraunces_700Bold",
  regular: "Inter_400Regular",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

const t = (fontFamily: string, fontSize: number, lineHeight: number, extra: object = {}) => ({ fontFamily, fontSize, lineHeight, ...extra });

export const tipografia = {
  displayLg: t(fuentes.display, 40, 44),
  displayMd: t(fuentes.display, 32, 36),
  titleLg: t(fuentes.bold, 24, 30),
  titleMd: t(fuentes.semibold, 20, 26),
  titleSm: t(fuentes.semibold, 17, 24),
  bodyLg: t(fuentes.regular, 17, 26),
  bodyMd: t(fuentes.regular, 15, 22),
  bodySm: t(fuentes.regular, 13, 20),
  labelLg: t(fuentes.semibold, 15, 20),
  labelMd: t(fuentes.semibold, 13, 16),
  labelSm: t(fuentes.bold, 11, 14, { letterSpacing: 0.6, textTransform: "uppercase" as const }),
};

export type VarianteTexto = keyof typeof tipografia;

/** Retícula de 4. */
export const espacio = { s4: 4, s8: 8, s12: 12, s16: 16, s20: 20, s24: 24, s32: 32, s40: 40, s48: 48, s64: 64 } as const;

export const margen = { lateral: 16, secciones: 24, tarjeta: 16 } as const;

export const radio = { campo: 8, boton: 12, tarjeta: 16, hoja: 24, completo: 999 } as const;

export const alto = { boton: 52, campo: 52, botonIcono: 44, chip: 36, tocable: 48, botonPequeño: 40, botonMini: 32 } as const;

export const icono = { tamaño: 24, trazo: 1.75 } as const;
