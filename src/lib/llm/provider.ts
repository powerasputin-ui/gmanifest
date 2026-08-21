import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

export type LlmProviderKind = 'zai' | 'api' | 'local';

export interface LlmConfig {
  provider: LlmProviderKind;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

const DEFAULT_BASE_URLS: Record<Exclude<LlmProviderKind, 'zai'>, string> = {
  api: 'https://api.openai.com/v1',
  local: 'http://localhost:11434/v1',
};

const REQUEST_TIMEOUT_MS = 180_000;

/**
 * Read LLM configuration from the Settings table.
 * Defaults preserve the original behavior (z-ai-web-dev-sdk).
 */
export async function getLlmConfig(): Promise<LlmConfig> {
  const rows = await db.settings.findMany({
    where: {
      key: {
        in: [
          'llm_provider',
          'llm_api_key',
          'llm_base_url',
          'llm_model',
          'llm_temperature',
          'llm_max_tokens',
        ],
      },
    },
  });
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;

  const rawProvider = map.llm_provider;
  const provider: LlmProviderKind =
    rawProvider === 'api' || rawProvider === 'local' ? rawProvider : 'zai';

  return {
    provider,
    apiKey: map.llm_api_key || '',
    baseUrl: (map.llm_base_url || '').trim() ||
      (provider === 'zai' ? '' : DEFAULT_BASE_URLS[provider]),
    model: map.llm_model || 'default',
    temperature: parseFloat(map.llm_temperature ?? '') || 0.1,
    maxTokens: parseInt(map.llm_max_tokens ?? '', 10) || 4096,
  };
}

/** Human-readable name of the active model, for ExtractionRun.modelUsed. */
export async function getActiveModelName(): Promise<string> {
  const cfg = await getLlmConfig();
  if (cfg.provider === 'zai') return 'z-ai-web-dev-sdk';
  return `${cfg.provider}:${cfg.model}`;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: unknown;
}

/**
 * Call an OpenAI-compatible chat completions endpoint.
 * Works for cloud APIs (token) and local servers (Ollama, LM Studio, vLLM...).
 */
async function openAiCompatibleChat(
  cfg: LlmConfig,
  messages: ChatMessage[]
): Promise<{ content: string; tokensUsed?: number }> {
  const url = `${cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey || 'local'}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: cfg.temperature,
        max_tokens: cfg.maxTokens,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `LLM endpoint недоступен (${cfg.baseUrl}). ` +
        (cfg.provider === 'local'
          ? 'Убедитесь, что локальный сервер модели запущен (Ollama / LM Studio). '
          : 'Проверьте base URL и сетевое подключение. ') +
        `Детали: ${reason}`
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const hint =
      response.status === 401 || response.status === 403
        ? 'Проверьте API-токен в настройках.'
        : response.status === 404
          ? `Модель «${cfg.model}» не найдена на этом endpoint. Проверьте точное имя (например, у NVIDIA NIM формат «vendor/model»: meta/llama-3.1-70b-instruct).`
          : cfg.provider === 'local'
            ? 'Проверьте, что модель загружена на локальном сервере.'
            : '';
    throw new Error(`LLM API вернул ${response.status}: ${body.slice(0, 300)}. ${hint}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { total_tokens?: number };
  };

  return {
    content: data.choices?.[0]?.message?.content || '',
    tokensUsed: data.usage?.total_tokens,
  };
}

export async function llmExtract(
  systemPrompt: string,
  userMessage: string
): Promise<{ content: string; tokensUsed?: number }> {
  const cfg = await getLlmConfig();

  if (cfg.provider !== 'zai') {
    return openAiCompatibleChat(cfg, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]);
  }

  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    thinking: { type: 'disabled' },
  });
  return {
    content: completion.choices[0]?.message?.content || '',
    tokensUsed: completion.usage?.total_tokens,
  };
}

/**
 * Vision call (image OCR). Routed through the configured provider;
 * for api/local providers the OpenAI vision message format is used,
 * which requires a vision-capable model (e.g. gpt-4o, llava, qwen2.5-vl).
 */
export async function llmVision(
  prompt: string,
  imageDataUrl: string
): Promise<{ content: string; tokensUsed?: number }> {
  const cfg = await getLlmConfig();

  if (cfg.provider !== 'zai') {
    return openAiCompatibleChat(cfg, [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      },
    ]);
  }

  const zai = await ZAI.create();
  const completion = await zai.chat.completions.createVision({
    model: 'default',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      },
    ],
    thinking: { type: 'disabled' },
  });
  return {
    content: completion.choices[0]?.message?.content || '',
    tokensUsed: completion.usage?.total_tokens,
  };
}
