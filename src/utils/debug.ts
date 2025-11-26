import Debug from 'debug';

const PREFIX = 'uni-pages:';

const DEBUG_TYPES = [
  'info',
  'error',
  'debug',
  'warn',
] as const;

export type DebugType = typeof DEBUG_TYPES[number];

export const logger = generateDebug();

function generateDebug() {
  return Object.fromEntries(DEBUG_TYPES.map(t => ([t, Debug(PREFIX + t)]))) as Record<DebugType, Debug.Debugger>;
}

export function enableDebug(enable: boolean | DebugType) {
  if (!enable) {
    return;
  }

  const suffix = typeof enable === 'boolean' ? '*' : enable;

  Debug.enable(`${PREFIX}${suffix}`);
}
