// Drift test: every UI intent must exist as a PageHandler method in the mojom,
// and enum orders assumed by bridge/mojo.ts must match the mojom.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { INTENT_NAMES } from '../bridge/types';

const mojom = readFileSync(join(__dirname, '../../../../browser/integration/justslide/webui/justslide_shell.mojom'), 'utf8');
const block = (name: string) => mojom.match(new RegExp(`interface ${name} \\{([\\s\\S]*?)\\n\\};`))?.[1] ?? '';
const enumBody = (name: string) => mojom.match(new RegExp(`enum ${name} \\{([^}]*)\\}`))?.[1] ?? '';
const upper = (s: string) => s[0].toUpperCase() + s.slice(1);

describe('mojom contract', () => {
  it('PageHandler has every intent', () => {
    const handler = block('PageHandler');
    for (const n of INTENT_NAMES) expect(handler, n).toMatch(new RegExp(`\\b${upper(n)}\\(`));
    expect(handler).toMatch(/GetSnapshot\(\)/);
  });
  it('enum orders match bridge/mojo.ts', () => {
    const order = (e: string) => [...enumBody(e).matchAll(/\bk([A-Za-z]+)\b/g)].map(m => m[1]);
    expect(order('SecurityLevel')).toEqual(['Unknown', 'Secure', 'Insecure', 'Internal', 'Dangerous']);
    expect(order('OpenedBy')).toEqual(['User', 'Agent', 'Extension', 'Restore', 'Popup']);
    expect(order('ColorMode')).toEqual(['System', 'Light', 'Dark']);
    expect(order('WorkspaceIcon')).toEqual(['Personal', 'ChatGpt', 'ClaudeCode', 'Agent', 'Work', 'Generic', 'Codex']);
    expect(order('ProfileKind')).toEqual(['Personal', 'AgentIsolated']);
    expect(order('AgentState')).toEqual(['Active', 'Paused', 'Revoked']);
  });
});
