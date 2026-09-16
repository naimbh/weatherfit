// Dev-only ambient declarations so `tsc` can check this project before
// `npm install`. These are deliberately close to React's real shapes: a
// too-loose stub strips hook generics and JSX element types, which hides the
// errors this check exists to catch. Once dependencies are installed the real
// package types are used instead — see tools/verify.mjs.

declare module 'node:test';
declare module 'node:assert/strict';

interface ImportMeta { env: { PROD: boolean; DEV: boolean } }

declare module 'react' {
  export type ReactNode = any;
  export type Key = string | number;
  export const StrictMode: any;
  export const Fragment: any;

  export function useState<S>(initial: S | (() => S)): [S, (v: S | ((prev: S) => S)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useMemo<T>(factory: () => T, deps?: readonly unknown[]): T;
  export function useCallback<T extends (...a: any[]) => any>(fn: T, deps?: readonly unknown[]): T;
  export function useRef<T>(initial: T): { current: T };

  export interface ChangeEvent<T = any> { target: T & { value: string; checked: boolean } }

  const React: { Fragment: any; StrictMode: any; createElement(...a: any[]): any };
  export default React;
}

declare module 'react-dom/client' {
  export function createRoot(el: Element | null): { render(node: any): void };
}

// With jsx: "react-jsx", TypeScript resolves the JSX namespace through here.
declare module 'react/jsx-runtime' {
  export namespace JSX {
    interface IntrinsicElements { [name: string]: any }
    type Element = any;
    type ElementType = any;
    interface ElementAttributesProperty { props: object }
    interface ElementChildrenAttribute { children: object }
  }
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
  export const Fragment: any;
}
declare module 'react/jsx-dev-runtime' {
  export namespace JSX {
    interface IntrinsicElements { [name: string]: any }
    type Element = any;
    type ElementType = any;
  }
  export function jsxDEV(type: any, props: any, key?: any): any;
  export const Fragment: any;
}

// Vite declares these for real via vite/client.
declare module '*.css';
