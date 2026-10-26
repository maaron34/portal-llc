export {};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    oaiq?: (...args: unknown[]) => void;
  }
}
