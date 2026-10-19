import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const CLAVE = "habita.dispositivo";
let cache: Promise<string> | null = null;

/** Identificador anónimo y estable del dispositivo. No hay login: es lo que separa los datos de cada persona. */
export function idDispositivo(): Promise<string> {
  cache ??= (async () => {
    const guardado = await SecureStore.getItemAsync(CLAVE);
    if (guardado) return guardado;
    const nuevo = Crypto.randomUUID();
    await SecureStore.setItemAsync(CLAVE, nuevo);
    return nuevo;
  })();
  return cache;
}
