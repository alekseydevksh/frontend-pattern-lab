/**
 * The few parts of jsdom that prototype-parity.test.ts uses. jsdom ships no types and adding
 * @types/jsdom would be a new dependency for one test, so this declares only what is needed.
 */
declare module 'jsdom' {
  export class JSDOM {
    constructor(html?: string, options?: { runScripts?: 'dangerously' | 'outside-only' });
    readonly window: Window & typeof globalThis;
  }
}
