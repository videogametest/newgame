// Build identity for the debug report. The commit is injected by vite.config.ts; 'dev' when run unbuilt.
declare const __BUILD_COMMIT__: string;

export const BUILD_COMMIT: string = typeof __BUILD_COMMIT__ !== 'undefined' ? __BUILD_COMMIT__ : 'dev';
