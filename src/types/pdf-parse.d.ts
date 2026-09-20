declare module "pdf-parse" {
  export class PDFParse {
    constructor(options: { data: Buffer | Uint8Array; verbosity?: number });
    getText(): Promise<string | { text: string }>;
    destroy(): Promise<void>;
  }
}
