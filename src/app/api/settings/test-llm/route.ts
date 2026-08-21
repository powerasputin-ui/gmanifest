import { NextResponse } from 'next/server';
import { getLlmConfig, llmExtract } from '@/lib/llm/provider';

/**
 * POST /api/settings/test-llm
 * Makes a real minimal request to the configured LLM and reports
 * status/latency. Used by the "Проверить подключение" button.
 */
export async function POST() {
  const started = Date.now();
  try {
    const cfg = await getLlmConfig();
    const { content } = await llmExtract(
      'You are a connectivity probe. Reply with exactly: ok',
      'ping'
    );

    if (!content || content.trim().length === 0) {
      return NextResponse.json({
        ok: false,
        provider: cfg.provider,
        model: cfg.provider === 'zai' ? 'z-ai-web-dev-sdk' : cfg.model,
        latencyMs: Date.now() - started,
        error: 'Модель вернула пустой ответ',
      });
    }

    return NextResponse.json({
      ok: true,
      provider: cfg.provider,
      model: cfg.provider === 'zai' ? 'z-ai-web-dev-sdk' : cfg.model,
      latencyMs: Date.now() - started,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : 'Connection failed',
    });
  }
}
