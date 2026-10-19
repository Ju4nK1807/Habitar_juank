import type { LucideIcon } from "lucide-react-native";
import { useTema } from "@/theme/tema";
import { icono, type Colores } from "@/theme/tokens";

type Props = { de: LucideIcon; color?: keyof Colores; tamaño?: number };

/** Iconos a 24, trazo 1.75, sin relleno. */
export function Icono({ de: Componente, color = "ink900", tamaño = icono.tamaño }: Props) {
  const { c } = useTema();
  return <Componente size={tamaño} color={c[color]} strokeWidth={icono.trazo} />;
}
