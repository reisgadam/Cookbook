// The hearts, "I made this" and notes features use Firebase. They switch on
// only when the Firebase settings are provided at build time (GitHub Actions
// repository variables, or .env.local for development). Without them the rest
// of the site works and these features simply don't appear.

const env = import.meta.env;

export const useEmulators = env.VITE_FIREBASE_EMULATORS === "true";

export const firebaseConfig = {
  // The emulators accept any key, but the SDK insists on having one.
  apiKey: env.VITE_FIREBASE_API_KEY || (useEmulators ? "demo-key" : ""),
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || (useEmulators ? "localhost" : ""),
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? "",
  appId: env.VITE_FIREBASE_APP_ID || (useEmulators ? "demo-app" : ""),
};

export const appCheckSiteKey = env.VITE_FIREBASE_APPCHECK_SITE_KEY ?? "";

export const communityEnabled = Boolean(
  firebaseConfig.projectId && (useEmulators || (firebaseConfig.apiKey && firebaseConfig.appId)),
);

export type ReactionKind = "love" | "made";

/** Comment threads: one per recipe, plus the guestbook on the About page. */
export const threadFor = (slug: string) => `recipe:${slug}`;
export const GUESTBOOK = "guestbook";

export const LIMITS = { name: 60, body: 2000, cooldownSeconds: 30 };
