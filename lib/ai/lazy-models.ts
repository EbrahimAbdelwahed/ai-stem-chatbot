// Lazy load AI model configurations
export const loadOpenAIConfig = async () => {
  const { openai } = await import('@ai-sdk/openai');
  return openai;
};

export const loadAnthropicConfig = async () => {
  const { anthropic } = await import('@ai-sdk/anthropic');
  return anthropic;
};

export const loadGoogleConfig = async () => {
  const { google } = await import('@ai-sdk/google');
  return google;
};

export const loadXAIConfig = async () => {
  const { xai } = await import('@ai-sdk/xai');
  return xai;
};

export const loadTogetherAIConfig = async () => {
  const { togetherai } = await import('@ai-sdk/togetherai');
  return togetherai;
};

// ---------------------------------------------------------------------------
//  Helper: Map friendly UI IDs → provider-accepted IDs
// ---------------------------------------------------------------------------

function resolveModelId(modelId: string): string {
  switch (modelId) {
    // OpenAI ---------------------------------------------------------------
    //  UI aliases → actual OpenAI chat model IDs
    case 'gpt-4.1.mini':
      return 'gpt-4.1-mini'; // normalize dot vs dash

    // optionally map older UI alias; keep openai prefix detection below
    case 'o4-mini':
      return 'gpt-4o-mini'; // in case OpenAI publishes under this id

    // xAI ------------------------------------------------------------------
    //  As of 2025-06, Grok-1 is the production model exposed via the SDK.
    //  We map our legacy "grok-3" aliases to Grok-1 until Grok-3 becomes
    //  publicly available through the AI SDK provider.
    // No mapping needed for grok-3 variants – they are now directly supported by the xAI provider

    default:
      return modelId; // pass through for already valid IDs (gemini, claude, …)
  }
}

// Fallback when the caller passes nothing
const DEFAULT_MODEL_ID = 'gpt-4o';

// ---------------------------------------------------------------------------
//  getModelConfig – returns both the model instance *and* a base system prompt
// ---------------------------------------------------------------------------

export interface AIModelConfig {
  /** The fully-configured model instance returned from the AI SDK */
  model: any; // Using `any` to avoid tight coupling to sdk types
  /** A base system prompt providing the assistant persona */
  system: string;
}

export async function getModelConfig(modelId: string | undefined): Promise<AIModelConfig> {
  const safeId = modelId ?? DEFAULT_MODEL_ID;
  const resolvedId = resolveModelId(safeId);

  // Debug helper – helps track mismatches in the server logs
  if (resolvedId !== safeId) {
    console.log(`[lazy-models] Resolved model ID: \`${safeId}\` → \`${resolvedId}\``);
  }

  // Helper to build the model instance
  async function loadModel(): Promise<any> {
    switch (true) {
      case resolvedId.startsWith('gpt-') || resolvedId.startsWith('o'): {
        const openai = await loadOpenAIConfig();
        return openai(resolvedId);
      }
      case resolvedId.startsWith('claude-'): {
        const anthropic = await loadAnthropicConfig();
        return anthropic(resolvedId);
      }
      case resolvedId.startsWith('gemini-'): {
        const google = await loadGoogleConfig();
        return google(resolvedId);
      }
      case resolvedId.startsWith('grok-'): {
        const xai = await loadXAIConfig();
        return xai(resolvedId);
      }
      case resolvedId.toLowerCase().includes('deepseek'): {
        const togetherai = await loadTogetherAIConfig();
        return togetherai(resolvedId);
      }
      default: {
        // If we land here, fall back to GPT-4o (widely available)
        const fallback = await loadOpenAIConfig();
        console.warn(`[lazy-models] Unknown model id: ${resolvedId}. Falling back to gpt-4o`);
        return fallback('gpt-4o');
      }
    }
  }

  // Base persona for the assistant – keep concise for now
  const baseSystem = `You are a helpful STEM assistant. Focus on providing accurate, educational information about science, technology, engineering, and mathematics. Explain concepts clearly and provide examples where appropriate.`;

  // Specialize prompt per model when helpful
  let system = baseSystem;
  switch (resolvedId) {
    case 'gemini-1.5-flash-latest':
      system += '\n\nYou are powered by Gemini 1.5 Flash.';
      break;
    case 'claude-3-haiku-20240307':
      system += '\n\nYou are powered by Claude 3 Haiku.';
      break;
    case 'gpt-4o':
      system += '\n\nYou are powered by GPT-4o.';
      break;
    case 'o4-mini':
      system += '\n\nYou are powered by o4-mini with advanced reasoning capabilities.';
      break;
    case 'o3':
      system += '\n\nYou are powered by O3.';
      break;
    default:
      // For other / experimental models we keep the generic system prompt
      break;
  }

  const modelInstance = await loadModel();

  return { model: modelInstance, system };
}

// Preload specific model SDK
export function preloadModelSDK(modelId: string): void {
  const resolvedId = resolveModelId(modelId);

  if (resolvedId.startsWith('gpt-') || resolvedId.startsWith('o')) {
    loadOpenAIConfig().catch(console.error);
  } else if (resolvedId.startsWith('claude-')) {
    loadAnthropicConfig().catch(console.error);
  } else if (resolvedId.startsWith('gemini-')) {
    loadGoogleConfig().catch(console.error);
  } else if (resolvedId.startsWith('grok-')) {
    loadXAIConfig().catch(console.error);
  } else if (resolvedId.toLowerCase().includes('deepseek')) {
    loadTogetherAIConfig().catch(console.error);
  }
} 