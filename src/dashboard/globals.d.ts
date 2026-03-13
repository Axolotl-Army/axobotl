declare module 'vanta/dist/vanta.halo.min'

interface ColorEntry {
  hex: string
  rgb: string
  rgba: (opacity?: number) => string
  values: string
}

interface Window {
  colorMap: Record<string, Record<string | number, ColorEntry>>
}
