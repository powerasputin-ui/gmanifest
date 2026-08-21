'use client';

import { useState, useMemo, useCallback } from 'react';
import { useSettings, useUpdateSettings, useTestLlmConnection } from '@/hooks/use-settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, RotateCcw, PlugZap } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_LABELS: Record<string, { title: string; description: string }> = {
  llm: { title: 'LLM', description: 'Настройки языковой модели' },
  parser: { title: 'Парсер', description: 'Настройки парсинга документов' },
  general: { title: 'Общие', description: 'Общие настройки платформы' },
  ui: { title: 'Модули интерфейса', description: 'Дополнительные разделы меню — включайте только то, что реально нужно' },
};

const UI_MODULE_LABELS: Record<string, { title: string; description: string }> = {
  ui_module_workflows: {
    title: 'Бизнес-процессы',
    description: 'Многошаговые сценарии обработки для сложных процессов с несколькими документами и проектом.',
  },
  ui_module_templates: {
    title: 'Шаблоны',
    description: 'Загрузка DOCX-шаблонов с {{переменными}} и настройка автозаполнения данными проекта.',
  },
  ui_module_profiles: {
    title: 'Профили',
    description: 'Настройка того, какие именно поля ИИ извлекает из документов разных типов.',
  },
  ui_module_rules: {
    title: 'Правила',
    description: 'Дополнительные требования к данным для конкретных бизнес-процессов.',
  },
};

const PROVIDER_OPTIONS = [
  { value: 'zai', label: 'Z-AI (встроенный)', hint: 'Облачный сервис. Текст документов уходит во внешний API.' },
  { value: 'api', label: 'API по токену', hint: 'Любой OpenAI-совместимый API. Текст уходит на указанный URL.' },
  { value: 'local', label: 'Локальная модель', hint: 'Ollama / LM Studio на этом компьютере. Данные не покидают машину.' },
];

const BASE_URL_PRESETS = [
  { label: 'OpenAI', url: 'https://api.openai.com/v1' },
  { label: 'NVIDIA NIM', url: 'https://integrate.api.nvidia.com/v1' },
  { label: 'Ollama', url: 'http://localhost:11434/v1' },
  { label: 'LM Studio', url: 'http://localhost:1234/v1' },
];

export function SettingsPage() {
  const { data, isLoading, isError } = useSettings();
  const updateSettings = useUpdateSettings();
  const testLlm = useTestLlmConnection();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  const grouped = data?.grouped || {};
  const allSettings = data?.settings || [];

  // Build initial values map from settings data
  const initialValues = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of allSettings) {
      map[s.key] = s.value;
    }
    return map;
  }, [allSettings]);

  const getValue = useCallback((key: string) => {
    return edits[key] !== undefined ? edits[key] : (initialValues[key] || '');
  }, [edits, initialValues]);

  const handleChange = useCallback((key: string, value: string) => {
    setEdits((prev) => {
      const next = { ...prev, [key]: value };
      const hasChanges = Object.entries(next).some(([k, v]) => {
        return v !== (initialValues[k] || '');
      });
      setIsDirty(hasChanges);
      return next;
    });
  }, [initialValues]);

  const handleSave = async () => {
    const items = allSettings
      .map((s) => {
        const val = edits[s.key] !== undefined ? edits[s.key] : s.value;
        return { key: s.key, value: val };
      })
      .filter((item) => {
        const orig = allSettings.find((s) => s.key === item.key);
        return orig ? item.value !== orig.value : false;
      });

    if (items.length === 0) {
      toast.info('Нет изменений для сохранения');
      return;
    }
    await updateSettings.mutateAsync(items);
    setEdits({});
    setIsDirty(false);
  };

  const handleReset = () => {
    setEdits({});
    setIsDirty(false);
    toast.info('Настройки сброшены');
  };

  // Module toggles save immediately on click — a switch that only takes
  // effect after a separate "Сохранить" click reads as broken.
  const handleModuleToggle = async (key: string, value: string) => {
    await updateSettings.mutateAsync([{ key, value }]);
  };

  if (isLoading) return <SettingsSkeleton />;
  if (isError || !data) return <p className="text-destructive">Ошибка загрузки настроек</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Настройки</h1>
          <p className="text-muted-foreground">Конфигурация платформы обработки</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={!isDirty}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Сбросить
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isDirty || updateSettings.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Save className="mr-2 h-4 w-4" />
            Сохранить
          </Button>
        </div>
      </div>

      {Object.entries(CATEGORY_LABELS).map(([cat, info]) => {
        const settings = grouped[cat] || [];
        if (settings.length === 0) return null;

        return (
          <Card key={cat}>
            <CardHeader>
              <CardTitle className="text-base">{info.title}</CardTitle>
              <CardDescription>{info.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.map((s) => (
                <SettingField
                  key={s.key}
                  setting={s}
                  value={getValue(s.key)}
                  onChange={(v) => handleChange(s.key, v)}
                  onImmediateSave={(v) => handleModuleToggle(s.key, v)}
                />
              ))}
              {cat === 'llm' && (
                <div className="flex items-center gap-3 border-t pt-4">
                  <Button
                    variant="outline"
                    onClick={() => testLlm.mutate()}
                    disabled={testLlm.isPending}
                  >
                    <PlugZap className="mr-2 h-4 w-4" />
                    {testLlm.isPending ? 'Проверка...' : 'Проверить подключение'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Проверяются сохранённые настройки — сначала нажмите «Сохранить».
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function SettingField({
  setting,
  value,
  onChange,
  onImmediateSave,
}: {
  setting: { key: string; description: string | null };
  value: string;
  onChange: (v: string) => void;
  onImmediateSave?: (v: string) => void;
}) {
  const { key, description } = setting;

  // UI module toggles → switch with title + plain-language explanation.
  // Saves immediately on click (no separate "Сохранить" step) — a toggle
  // that doesn't visibly take effect right away reads as broken.
  if (key.startsWith('ui_module_')) {
    const info = UI_MODULE_LABELS[key];
    return (
      <div className="flex items-start justify-between gap-4 py-1">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">{info?.title || description || key}</Label>
          <p className="text-xs text-muted-foreground">{info?.description}</p>
        </div>
        <Switch
          checked={value === 'true'}
          onCheckedChange={(v) => onImmediateSave?.(v ? 'true' : 'false')}
        />
      </div>
    );
  }

  // Temperature → slider
  if (key === 'llm_temperature') {
    const numVal = parseFloat(value) || 0;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{description || key}</Label>
          <span className="text-sm font-mono">{numVal.toFixed(2)}</span>
        </div>
        <Slider
          value={[numVal]}
          min={0}
          max={2}
          step={0.05}
          onValueChange={([v]) => onChange(String(v))}
          className="w-full"
        />
      </div>
    );
  }

  // Max tokens → number input
  if (key === 'llm_max_tokens') {
    return (
      <div className="space-y-2">
        <Label>{description || key}</Label>
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-[200px]"
        />
      </div>
    );
  }

  // Provider selection
  if (key === 'llm_provider') {
    const selected = PROVIDER_OPTIONS.find((o) => o.value === value);
    return (
      <div className="space-y-2">
        <Label>{description || key}</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="max-w-[400px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROVIDER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected && (
          <p className="text-xs text-muted-foreground">{selected.hint}</p>
        )}
      </div>
    );
  }

  // Base URL with presets
  if (key === 'llm_base_url') {
    return (
      <div className="space-y-2">
        <Label>{description || key}</Label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-[400px] font-mono"
          placeholder="https://api.openai.com/v1"
        />
        <div className="flex flex-wrap gap-2">
          {BASE_URL_PRESETS.map((p) => (
            <Button
              key={p.url}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange(p.url)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  // Model name — free input (local models have arbitrary names)
  if (key === 'llm_model') {
    return (
      <div className="space-y-2">
        <Label>{description || key}</Label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-[400px] font-mono"
          placeholder="gpt-4o-mini / meta/llama-3.1-70b-instruct / llama3.1..."
        />
      </div>
    );
  }

  // API keys → masked
  if (key.toLowerCase().includes('key') || key.toLowerCase().includes('api')) {
    return (
      <div className="space-y-2">
        <Label>{description || key}</Label>
        <Input
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-[400px] font-mono"
          placeholder="••••••••"
        />
      </div>
    );
  }

  // Default: text input
  return (
    <div className="space-y-2">
      <Label>{description || key}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[400px]"
      />
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full max-w-[300px]" />
            <Skeleton className="h-10 w-full max-w-[300px]" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
