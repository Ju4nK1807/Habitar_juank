// Lee ancho y alto de un JPEG o PNG sin dependencias, respetando la orientación EXIF del JPEG
// (las fotos de teléfono a veces se guardan acostadas con una marca de "rotar 90°").

export function dimensionesImagen(b: Buffer): { ancho: number; alto: number } | null {
  // PNG: la cabecera IHDR trae ancho y alto en los bytes 16 a 23.
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) {
    return { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20) };
  }
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;

  let orientacion = 1;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marcador = b[i + 1];
    const largo = b.readUInt16BE(i + 2);
    if (marcador === 0xe1 && b.toString("ascii", i + 4, i + 8) === "Exif") {
      orientacion = leerOrientacion(b, i + 10) ?? 1;
    }
    // SOF0 a SOF15, salvo DHT (C4), JPG (C8) y DAC (CC).
    if (marcador >= 0xc0 && marcador <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marcador)) {
      const alto = b.readUInt16BE(i + 5);
      const ancho = b.readUInt16BE(i + 7);
      return orientacion >= 5 ? { ancho: alto, alto: ancho } : { ancho, alto };
    }
    i += 2 + largo;
  }
  return null;
}

function leerOrientacion(b: Buffer, tiff: number): number | null {
  if (tiff + 8 > b.length) return null;
  const le = b.toString("ascii", tiff, tiff + 2) === "II";
  const u16 = (o: number) => (le ? b.readUInt16LE(o) : b.readUInt16BE(o));
  const u32 = (o: number) => (le ? b.readUInt32LE(o) : b.readUInt32BE(o));
  const ifd = tiff + u32(tiff + 4);
  if (ifd + 2 > b.length) return null;
  const entradas = u16(ifd);
  for (let k = 0; k < entradas; k++) {
    const e = ifd + 2 + k * 12;
    if (e + 12 > b.length) return null;
    if (u16(e) === 0x0112) return u16(e + 8);
  }
  return null;
}

/** Tamaño de salida con la misma proporción que la foto, lado mayor máx. 1280, múltiplos de 16. */
export function tamañoSalida(d: { ancho: number; alto: number }, ladoMayor = 1280) {
  const escala = ladoMayor / Math.max(d.ancho, d.alto);
  const m16 = (n: number) => Math.max(256, Math.round((n * escala) / 16) * 16);
  return { ancho: m16(d.ancho), alto: m16(d.alto) };
}
