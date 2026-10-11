import type { Task, Category, TodayOptimizationResult, OptimizedScheduleTask } from '../types';

const FALLBACK_MODELS = [
  'llama-3.1-8b-instant',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile',
];

export async function optimizeTodaySchedule(
  tasks: Task[],
  categories: Category[],
  apiKey?: string,
  preferredModel: string = 'llama-3.1-8b-instant'
): Promise<TodayOptimizationResult> {
  const activeTasks = tasks.filter((t) => !t.completed && !t.cancelled);

  if (activeTasks.length === 0) {
    return {
      scheduleSummary: "Aucune tâche active pour aujourd'hui.",
      energyAdvice: "Ajoutez ou piochez des tâches sans date pour composer votre journée.",
      orderedTasks: [],
    };
  }

  // If apiKey is provided, call Groq API
  if (apiKey && apiKey.trim().length > 5) {
    const modelsToTry = [preferredModel, ...FALLBACK_MODELS.filter((m) => m !== preferredModel)];

    for (const model of modelsToTry) {
      try {
        const result = await callGroqScheduleOptimizer(activeTasks, categories, apiKey.trim(), model);
        return result;
      } catch (err: any) {
        console.warn(`Schedule optimization failed on ${model}, trying next...`, err);
      }
    }
  }

  // Fallback if no API key or if API calls fail
  return localFallbackOptimizer(activeTasks, categories);
}

async function callGroqScheduleOptimizer(
  tasks: Task[],
  categories: Category[],
  apiKey: string,
  model: string
): Promise<TodayOptimizationResult> {
  const taskDescriptions = tasks.map((t) => {
    const cat = categories.find((c) => c.id === t.categoryId);
    return `[ID: ${t.id}] Titre: "${t.title}" | Catégorie: "${cat?.name || 'Général'}" | Priorité: ${t.priority || 'medium'} | Temps estimé: ${t.estimatedTime || 'non spécifié'} | Notes: ${t.notes || 'aucun'}`;
  }).join('\n');

  const systemPrompt = `Tu es un expert en chronobiologie cognitive et optimisation du flux de travail.
Ton rôle est d'ordonner de manière optimale les tâches de la journée :
1. LE PRINCIPE DU CRAPAUD : La tâche la plus exigeante/stratégique est placée en premier (matin).
2. LA CHRONOBIOLOGIE : Matin (Deep work/Crapaud), Début d'après-midi (Tâches légères/Admin), Fin d'après-midi (Deuxième souffle), Soir (Clôture).

RÈGLE ABSOLUE : N'inclus AUCUN émoji. Rédige en français avec des phrases TRÈS COURTES, concises et directes (maximum 1 phrase courte par champ).

Tu dois impérativement renvoyer un JSON STRICT :
{
  "scheduleSummary": "Synthèse en 1 phrase courte de la stratégie du jour.",
  "frogTaskTitle": "Titre exact de la tâche crapaud.",
  "frogRationale": "Raison courte (1 phrase max) pour laquelle cette tâche est prioritaire.",
  "energyAdvice": "Conseil d'énergie court (1 phrase max).",
  "orderedTasks": [
    {
      "taskId": "ID exact de la tâche fournie",
      "order": 1,
      "taskTitle": "Titre de la tâche",
      "phase": "morning_frog | morning_focus | afternoon_low | afternoon_peak | evening_wrap",
      "phaseLabel": "Matin - Crapaud",
      "suggestedTimeSlot": "09:00 - 10:30",
      "energyLevel": "high | medium | low",
      "rationale": "Raison courte en 1 phrase (ex: Pic d'énergie matinal pour une concentration maximale).",
      "isFrog": true
    }
  ]
}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Voici les tâches de ma journée à ordonner :\n\n${taskDescriptions}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Erreur optimisation planning (${response.status})`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) throw new Error('Réponse vide');

  const parsed = JSON.parse(rawContent);

  // Validate and map tasks ensuring all tasks are represented
  const orderedList: OptimizedScheduleTask[] = [];
  const rawList = Array.isArray(parsed.orderedTasks) ? parsed.orderedTasks : [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const found = rawList.find((item: any) => item.taskId === task.id || item.taskTitle?.toLowerCase() === task.title.toLowerCase());

    if (found) {
      orderedList.push({
        taskId: task.id,
        taskTitle: task.title,
        order: Number(found.order) || (i + 1),
        phase: found.phase || (i === 0 ? 'morning_frog' : 'morning_focus'),
        phaseLabel: found.phaseLabel || (i === 0 ? 'Matin - Crapaud' : 'Matin - Focus'),
        suggestedTimeSlot: found.suggestedTimeSlot || `${9 + i}:00 - ${10 + i}:00`,
        energyLevel: found.energyLevel || 'high',
        rationale: found.rationale || 'Créneau optimal selon votre rythme.',
        isFrog: Boolean(found.isFrog),
      });
    } else {
      orderedList.push({
        taskId: task.id,
        taskTitle: task.title,
        order: i + 1,
        phase: i === 0 ? 'morning_frog' : i === 1 ? 'morning_focus' : 'afternoon_peak',
        phaseLabel: i === 0 ? 'Matin - Crapaud' : 'Matin - Focus',
        suggestedTimeSlot: `${9 + i}:00 - ${10 + i}:00`,
        energyLevel: i === 0 ? 'high' : 'medium',
        rationale: 'Positionnée selon votre flux journalier.',
        isFrog: i === 0,
      });
    }
  }

  // Sort by order
  orderedList.sort((a, b) => a.order - b.order);

  const frogItem = orderedList.find((item) => item.isFrog) || orderedList[0];

  return {
    scheduleSummary: parsed.scheduleSummary || "Planning optimisé selon vos cycles d'énergie.",
    frogTaskTitle: parsed.frogTaskTitle || frogItem?.taskTitle || tasks[0]?.title,
    frogRationale: parsed.frogRationale || "Tâche stratégique à finaliser dès le matin.",
    energyAdvice: parsed.energyAdvice || "Attaquez votre première tâche dès 9h sans interruption.",
    orderedTasks: orderedList,
  };
}

export function localFallbackOptimizer(
  tasks: Task[],
  _categories?: Category[]
): TodayOptimizationResult {
  // Sort tasks: high priority first, then medium, then low
  const sorted = [...tasks].sort((a, b) => {
    const weight = (p: string) => (p === 'high' ? 3 : p === 'medium' ? 2 : 1);
    return weight(b.priority) - weight(a.priority);
  });

  const slots = [
    { slot: '09:00 - 10:30', phase: 'morning_frog' as const, label: 'Matin - Crapaud', energy: 'high' as const },
    { slot: '10:45 - 12:15', phase: 'morning_focus' as const, label: 'Matin - Focus', energy: 'high' as const },
    { slot: '13:45 - 15:00', phase: 'afternoon_low' as const, label: 'Après-midi - Routine', energy: 'low' as const },
    { slot: '15:15 - 16:45', phase: 'afternoon_peak' as const, label: 'Après-midi - Dynamique', energy: 'medium' as const },
    { slot: '17:00 - 18:00', phase: 'evening_wrap' as const, label: 'Soir - Clôture', energy: 'low' as const },
  ];

  const orderedTasks: OptimizedScheduleTask[] = sorted.map((t, idx) => {
    const slotInfo = slots[idx] || {
      slot: `${18 + Math.floor(idx / 2)}:00 - ${19 + Math.floor(idx / 2)}:00`,
      phase: 'evening_wrap' as const,
      label: 'Soir - Clôture',
      energy: 'low' as const,
    };

    const isFrog = idx === 0;

    let rationale = '';
    if (isFrog) {
      rationale = 'À accomplir en premier dès le matin pour éliminer la charge mentale.';
    } else if (slotInfo.phase === 'morning_focus') {
      rationale = 'Concentration soutenue durant votre premier pic d\'énergie.';
    } else if (slotInfo.phase === 'afternoon_low') {
      rationale = 'Tâche accessible idéale pour le creux d\'après-midi.';
    } else if (slotInfo.phase === 'afternoon_peak') {
      rationale = 'Deuxième pic d\'énergie pour finaliser avec dynamisme.';
    } else {
      rationale = 'À clore en fin de journée pour préparer le lendemain.';
    }

    return {
      taskId: t.id,
      taskTitle: t.title,
      order: idx + 1,
      phase: slotInfo.phase,
      phaseLabel: slotInfo.label,
      suggestedTimeSlot: slotInfo.slot,
      energyLevel: slotInfo.energy,
      rationale,
      isFrog,
    };
  });

  const frog = orderedTasks[0];

  return {
    scheduleSummary: "Planning ordonné selon vos pics d'énergie.",
    frogTaskTitle: frog ? frog.taskTitle : tasks[0]?.title,
    frogRationale: "Tâche stratégique à finaliser dès le matin.",
    energyAdvice: "Travaillez par blocs avec des pauses régulières.",
    orderedTasks,
  };
}
