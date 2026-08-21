'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { BookOpen } from 'lucide-react';

interface InstructionsDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function InstructionsDialog({ open, onOpenChange }: InstructionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5 text-emerald-600" />
            Инструкция по использованию
          </DialogTitle>
          <DialogDescription>
            AI DocProc — платформа обработки документов на базе ИИ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 text-sm leading-relaxed">
          {/* 1. Two ways to use the product */}
          <section className="space-y-2">
            <h3 className="font-semibold text-base text-emerald-700 dark:text-emerald-300">1. Два сценария использования</h3>
            <p>
              У платформы есть два независимых уровня работы — выберите тот, что нужен именно вам:
            </p>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                <strong>Простой: один документ → готовый файл.</strong> Загрузили скан — сразу скачали его
                как читаемый Word или как заполненный Excel-бланк. Проект и настройка ничего не требуют.
                Раздел 2 ниже.
              </li>
              <li>
                <strong>Продвинутый: многошаговый бизнес-процесс.</strong> Несколько документов, проект,
                накопление данных, автоматическая проверка полноты и генерация итоговых документов по шаблону.
                Разделы 3–7 ниже.
              </li>
            </ul>
          </section>

          {/* 2. Simple path */}
          <section className="space-y-2">
            <h3 className="font-semibold text-base text-emerald-700 dark:text-emerald-300">2. Быстрый способ: обработать один документ</h3>
            <ol className="list-decimal ml-5 space-y-1">
              <li>
                Откройте раздел <strong>«Документы»</strong> → <strong>«Загрузить»</strong> и выберите файл
                (PDF, DOCX, PNG, JPG). Система сама распознает текст, включая сканы без текстового слоя.
              </li>
              <li>
                У загруженного документа нажмите кнопку <strong>«Действия»</strong> справа в таблице. Там доступно:
                <ul className="list-disc ml-5 mt-1 space-y-1">
                  <li>
                    <strong>«Скачать как Word (.docx)»</strong> — распознанный текст документа сразу превращается
                    в обычный текстовый Word-файл (заголовки, таблицы) — без ИИ, за секунду.
                  </li>
                  <li>
                    <strong>«Заполнить СГТ (Excel)»</strong> — ИИ читает документ (например, техпаспорт судна/контейнера)
                    и заполняет фиксированный бланк «Суммарный грузовой талон»: строку таблицы груза
                    (вес, габариты, владелец, техописание и т.п.). Логистические поля шапки бланка (поставщик,
                    получатель, даты) и чек-лист осмотра при загрузке ИИ не трогает — их нужно, как и раньше,
                    заполнить вручную, так как этих данных обычно нет в техпаспорте. Занимает до минуты — идёт
                    обращение к ИИ.
                  </li>
                </ul>
              </li>
              <li>
                <strong>«Обработать (извлечь поля)»</strong> в том же меню — это уже часть продвинутого сценария:
                извлекает данные в структурированную модель проекта (см. раздел 3).
              </li>
            </ol>
          </section>

          {/* 3. Quick start advanced */}
          <section className="space-y-2">
            <h3 className="font-semibold text-base text-emerald-700 dark:text-emerald-300">3. Продвинутый сценарий: пошагово</h3>
            <ol className="list-decimal ml-5 space-y-1">
              <li>
                <strong>Создайте проект</strong> — в разделе «Проекты» нажмите «Создать проект».
                Укажите название, заказчика и подрядчика.
              </li>
              <li>
                <strong>Загрузите документы</strong> в «Документы» и привяжите их к проекту.
              </li>
              <li>
                <strong>Обработайте документы</strong> — «Действия» → «Обработать», выберите профиль извлечения.
                ИИ извлечёт структурированные данные в модель проекта.
              </li>
              <li>
                <strong>Проверьте данные</strong> — в проекте откройте вкладку «Модель данных», проверьте и при
                необходимости исправьте извлечённые значения вручную.
              </li>
              <li>
                <strong>Сгенерируйте документ</strong> — загрузите DOCX-шаблон с переменными{' '}
                <code className="bg-muted px-1 rounded">{'{{переменная}}'}</code>, настройте маппинг и сгенерируйте
                готовый документ.
              </li>
            </ol>
          </section>

          {/* 4. Workflows */}
          <section className="space-y-2">
            <h3 className="font-semibold text-base text-emerald-700 dark:text-emerald-300">4. Бизнес-процессы</h3>
            <p>
              Раздел «Бизнес-процессы» — готовые многошаговые сценарии для повторяющихся операций:
            </p>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>Подготовка коммерческого предложения</strong> — полный цикл от сбора данных до готового КП.</li>
              <li><strong>Оформление рейса судна</strong> — сбор и обработка документов для рейса.</li>
              <li><strong>Суточная сводка</strong> — ежедневная обработка отчётов и формирование сводки.</li>
              <li><strong>Мобилизация оборудования</strong> — оформление документов мобилизации.</li>
              <li><strong>Оформление наряда-допуска</strong> — подготовка наряда для работ повышенной опасности.</li>
              <li><strong>Согласование работ</strong> — подготовка пакета документов для согласования.</li>
            </ul>
            <p className="mt-2">
              Нажмите «Запустить» на карточке шаблона, выберите проект и следуйте шагам-подсказкам стрелки процесса.
              Каждый шаг требует определённые документы/сущности — система показывает, чего не хватает.
            </p>
          </section>

          {/* 5. Templates */}
          <section className="space-y-2">
            <h3 className="font-semibold text-base text-emerald-700 dark:text-emerald-300">5. Шаблоны и генерация DOCX</h3>
            <ol className="list-decimal ml-5 space-y-1">
              <li>
                В разделе «Шаблоны» нажмите «Загрузить шаблон» и выберите DOCX-файл с переменными вида{' '}
                <code className="bg-muted px-1 rounded">{'{{название}}'}</code>.
              </li>
              <li>
                Откройте шаблон и привяжите каждую переменную к полю модели данных проекта
                (например, <code className="bg-muted px-1 rounded">Company.company_1.name</code>), либо
                нажмите «AI Автомаппинг» для автоматического сопоставления.
              </li>
              <li>
                В проекте, вкладка «Генерация» → выберите шаблон → «Сгенерировать». Готовый файл скачается
                автоматически.
              </li>
            </ol>
          </section>

          {/* 6. Profiles & rules */}
          <section className="space-y-2">
            <h3 className="font-semibold text-base text-emerald-700 dark:text-emerald-300">6. Профили извлечения и бизнес-правила</h3>
            <p>
              <strong>Профили</strong> (раздел «Профили») определяют, какие данные ИИ извлекает из документов —
              каждый привязан к типу сущности (компания, судно, персонал и т.д.) и содержит JSON-схему, промпт
              и правила валидации.
            </p>
            <p>
              <strong>Бизнес-правила</strong> (раздел «Правила») описывают дополнительные требования к данным
              для процессов.
            </p>
          </section>

          {/* 7. Settings */}
          <section className="space-y-2">
            <h3 className="font-semibold text-base text-emerald-700 dark:text-emerald-300">7. Настройки ИИ</h3>
            <p>
              В разделе «Настройки» выбирается провайдер ИИ, который используется и для извлечения данных,
              и для заполнения СГТ:
            </p>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>Z-AI (встроенный)</strong> — облачный сервис, не требует настройки.</li>
              <li><strong>API по токену</strong> — любой OpenAI-совместимый API (OpenAI, NVIDIA NIM и др.).</li>
              <li><strong>Локальная модель</strong> — Ollama / LM Studio на этом компьютере. Данные не покидают машину, но маленькие модели (1–3B) хуже справляются со сложными формами вроде СГТ — для качественного результата нужна модель помощнее или облачный провайдер.</li>
            </ul>
            <p className="mt-2">
              После изменения настроек нажмите «Сохранить» и проверьте подключение кнопкой «Проверить подключение».
            </p>
          </section>

          {/* 8. Tips */}
          <section className="space-y-2">
            <h3 className="font-semibold text-base text-emerald-700 dark:text-emerald-300">8. Полезные советы</h3>
            <ul className="list-disc ml-5 space-y-1">
              <li>Загружайте документы в хорошем качестве — это повышает точность распознавания и извлечения.</li>
              <li>Для СГТ и извлечения данных используйте достаточно мощную модель — слабая локальная модель может заполнить только самые очевидные поля.</li>
              <li>Проверяйте извлечённые данные в «Модели данных» проекта и исправляйте ошибки вручную.</li>
              <li>Используйте бизнес-процессы для стандартизации повторяющихся многошаговых операций, а не для разовой обработки одного файла.</li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
