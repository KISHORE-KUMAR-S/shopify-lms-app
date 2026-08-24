/// <reference types="vite/client" />
/// <reference types="@react-router/node" />
/// <reference types="@shopify/app-bridge-types" />

interface ImportMetaEnv {
  /** Base URL of the standalone Express REST API (server/). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
