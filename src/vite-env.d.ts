/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Firebase web app settings; the community features stay off without them. */
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  /** Optional reCAPTCHA v3 site key for Firebase App Check. */
  readonly VITE_FIREBASE_APPCHECK_SITE_KEY?: string;
  /** "true" to use the local Firebase emulators (npm run emulators). */
  readonly VITE_FIREBASE_EMULATORS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
