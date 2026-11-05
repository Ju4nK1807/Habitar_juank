// Búsqueda de muebles reales en tiendas colombianas. Solo fuentes públicas:
// Éxito expone la búsqueda pública de su plataforma (VTEX) y Falabella entrega los resultados en
// la página de búsqueda. Mercado Libre exige cuenta de desarrollador (403), Alkosto solo se podría
// con una llave interna de su página y Facebook Marketplace prohíbe extraer datos: no se usan.

export type Producto = {
  tienda: "Éxito" | "Falabella";
  nombre: string;
  precioCop: number;
  url: string;
  imagenUrl: string;
  /** Ruta de categorías de la tienda, si la da; sirve para descartar lo que no es un mueble. */
  categoria: string;
};

const NAVEGADOR = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
const ESPERA_MS = 12_000;

async function pedir(url: string, señal?: AbortSignal) {
  const r = await fetch(url, {
    headers: { "user-agent": NAVEGADOR, "accept-language": "es-CO,es;q=0.9" },
    signal: señal ? AbortSignal.any([señal, AbortSignal.timeout(ESPERA_MS)]) : AbortSignal.timeout(ESPERA_MS),
  });
  // La búsqueda de Éxito responde 206 (contenido parcial) cuando hay más resultados.
  if (!r.ok && r.status !== 206) throw new Error(`${new URL(url).host} respondió ${r.status}`);
  return r;
}

type ProductoVtex = {
  productName: string;
  link: string;
  categories?: string[];
  items?: { images?: { imageUrl: string }[]; sellers?: { commertialOffer?: { Price: number; AvailableQuantity: number } }[] }[];
};

async function exito(consulta: string, señal?: AbortSignal): Promise<Producto[]> {
  const r = await pedir(`https://www.exito.com/io/api/catalog_system/pub/products/search?ft=${encodeURIComponent(consulta)}&_from=0&_to=11`, señal);
  const lista = (await r.json()) as ProductoVtex[];
  return lista.flatMap((p) => {
    const item = p.items?.[0];
    const oferta = item?.sellers?.find((s) => (s.commertialOffer?.AvailableQuantity ?? 0) > 0)?.commertialOffer;
    const imagen = item?.images?.[0]?.imageUrl;
    if (!oferta || oferta.Price <= 0 || !imagen) return [];
    return [{ tienda: "Éxito" as const, nombre: p.productName, precioCop: Math.round(oferta.Price), url: p.link, imagenUrl: imagen, categoria: p.categories?.[0] ?? "" }];
  });
}

type ResultadoFalabella = {
  displayName: string;
  url: string;
  mediaUrls?: string[];
  prices?: { type: string; crossed: boolean; price: string[] }[];
  availability?: { homeDeliveryShipping?: string };
};

async function falabella(consulta: string, señal?: AbortSignal): Promise<Producto[]> {
  const r = await pedir(`https://www.falabella.com.co/falabella-co/search?Ntt=${encodeURIComponent(consulta)}`, señal);
  const html = await r.text();
  const datos = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if (!datos) throw new Error("Falabella cambió su página de búsqueda");
  const resultados = (JSON.parse(datos) as { props?: { pageProps?: { results?: ResultadoFalabella[] } } }).props?.pageProps?.results ?? [];
  return resultados.slice(0, 12).flatMap((p) => {
    // El precio vigente es el que no está tachado ("1.299.990" → 1299990).
    const vigente = p.prices?.find((x) => !x.crossed) ?? p.prices?.[0];
    const precio = Number(vigente?.price?.[0]?.replace(/\./g, "").replace(",", "."));
    const imagen = p.mediaUrls?.[0];
    if (!precio || !imagen) return [];
    return [{ tienda: "Falabella" as const, nombre: p.displayName, precioCop: Math.round(precio), url: p.url, imagenUrl: imagen, categoria: "" }];
  });
}

/** Busca en las dos tiendas a la vez. Si una falla, se usan los resultados de la otra. */
export async function buscarEnTiendas(consulta: string, señal?: AbortSignal): Promise<Producto[]> {
  const [a, b] = await Promise.allSettled([exito(consulta, señal), falabella(consulta, señal)]);
  for (const [tienda, r] of [["Éxito", a], ["Falabella", b]] as const) {
    if (r.status === "rejected") console.warn(`Búsqueda en ${tienda} falló:`, (r.reason as Error).message);
  }
  const deEsta = (r: PromiseSettledResult<Producto[]>) => (r.status === "fulfilled" ? r.value : []);
  // Se intercalan para no favorecer una tienda.
  const [x, y] = [deEsta(a), deEsta(b)];
  const todos: Producto[] = [];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i]) todos.push(x[i]);
    if (y[i]) todos.push(y[i]);
  }
  return todos;
}

/** Descarga la foto del producto (para la tarjeta y como referencia al ponerlo en la foto). */
export async function descargarImagen(url: string, señal?: AbortSignal): Promise<Buffer> {
  const r = await pedir(url, señal);
  return Buffer.from(await r.arrayBuffer());
}
