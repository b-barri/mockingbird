import { CartesiaProvider } from "./adapters/cartesia";
import { ElevenLabsProvider } from "./adapters/elevenlabs";
import { SarvamProvider } from "./adapters/sarvam";
import type { AgentProvider, Capabilities, VoiceProvider } from "./types";
import { isAgentProvider } from "./types";

// Provider registry. Adding a new voice provider in V1.1 means dropping
// an adapter file under ./adapters/ and adding a row here — no callers
// downstream need to change (R17).

const FACTORIES = {
  cartesia: () => new CartesiaProvider(),
  sarvam: () => new SarvamProvider(),
  elevenlabs: () => new ElevenLabsProvider(),
} as const;

export type ProviderName = keyof typeof FACTORIES;

export const PROVIDER_NAMES: readonly ProviderName[] = Object.keys(
  FACTORIES
) as ProviderName[];

export class UnknownProviderError extends Error {
  constructor(name: string) {
    super(
      `Unknown voice provider: "${name}". Known providers: ${PROVIDER_NAMES.join(
        ", "
      )}.`
    );
    this.name = "UnknownProviderError";
  }
}

export class AgentMisconfiguredError extends Error {
  constructor(name: string, reason: string) {
    super(`Agent provider "${name}" rejected at registration: ${reason}`);
    this.name = "AgentMisconfiguredError";
  }
}

/**
 * Construct a fresh voice provider instance by name.
 *
 * Validates at construction time that agent providers expose configure()
 * — required for the framework-aware probe path (R14).
 */
export function getProvider(name: string): VoiceProvider {
  const factory = FACTORIES[name as ProviderName];
  if (!factory) {
    throw new UnknownProviderError(name);
  }
  const instance = factory();

  if (isAgentProvider(instance)) {
    const agent = instance as AgentProvider;
    if (typeof agent.configure !== "function") {
      throw new AgentMisconfiguredError(
        name,
        "missing configure() method; agent providers must accept a system prompt"
      );
    }
  }

  return instance;
}

/** Inventory of registered providers with their capability tier. */
export function listProviders(): Array<{
  name: ProviderName;
  capabilities: Capabilities;
}> {
  return PROVIDER_NAMES.map((name) => {
    const instance = FACTORIES[name]();
    return { name, capabilities: instance.capabilities };
  });
}

export type {
  AgentConfig,
  AgentProvider,
  Capabilities,
  ComponentProvider,
  SessionHandle,
  SessionOptions,
  Speaker,
  VoiceEvent,
  VoiceProvider,
  VoiceStateKind,
} from "./types";
export { isAgentProvider, isComponentProvider } from "./types";
