declare module 'jsqr' {
  interface QRCode {
    binaryData: Uint8ClampedArray
    data: string
    location: any
  }
  function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' }
  ): QRCode | null
  export default jsQR
}
