/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_REFRESH_MINUTES: string;
  readonly VITE_API_URL: string;
  readonly VITE_LOCK_TIMEOUT_MINUTES: string;
  readonly VITE_STUCK_LOCK_CHECK_SECONDS: string;
  readonly VITE_SHOW_DEBUG_LOGS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
