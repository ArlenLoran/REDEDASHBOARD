/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_REFRESH_MINUTES: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
