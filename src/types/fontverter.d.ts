declare module 'fontverter' {
  type Format = 'sfnt' | 'truetype' | 'woff' | 'woff2';
  const fontverter: {
    convert(buffer: Buffer, to: Format, from?: Format): Promise<Buffer>;
    detectFormat(buffer: Buffer): Format;
  };
  export default fontverter;
}
