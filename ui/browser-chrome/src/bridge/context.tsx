import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { ShellBridge, ShellSnapshot } from './types';

const Ctx = createContext<ShellBridge | null>(null);

export function BridgeProvider({ bridge, children }: { bridge: ShellBridge; children: ReactNode }) {
  return <Ctx.Provider value={bridge}>{children}</Ctx.Provider>;
}

export function useBridge(): ShellBridge {
  const b = useContext(Ctx);
  if (!b) throw new Error('BridgeProvider missing');
  return b;
}

export function useSnapshot(): ShellSnapshot | null {
  const b = useBridge();
  return useSyncExternalStore(b.subscribe.bind(b), () => b.getSnapshot());
}
