import type { BrainstormAnalysis, BrainstormMode, Category, Priority, Horizon } from '../types';

const FALLBACK_MODELS = [
  'llama-3.1-8b-instant',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile',
];

export async function analyzeBrainstormSession(
  prompt: string,
  mode: BrainstormMode = 'structure',
  contextHistory: string = '',
  apiKey?: string,
  preferredModel: string = 'llama-3.1-8b-instant',
  categories: Category[] = []
): Promise<BrainstormAnalysis> {
  const text = prompt.trim();
  if (!text) {
    return localFallbackBrainstorm(text, mode);
  }

  if (apiKey && apiKey.trim().length > 5) {
    const modelsToTry = [preferredModel, ...FALLBACK_MODELS.filter((m) => m !== preferredModel)];

    for (const model of modelsToTry) {
      try {
        const result = await callGroqBrainstormAnalysis(text, mode, contextHistory, apiKey.trim(), model, categories);
        return result;
      } catch (err: any) {
        console.warn(`Brainstorm analysis failed on ${model}, trying next...`, err);
      }
    }
  }

  return localFallbackBrainstorm(text, mode);
}

async function callGroqBrainstormAnalysis(
  prompt: string,
  mode: BrainstormMode,
  contextHistory: string,
  apiKey: string,
  model: string,
  categories: Category[]
): Promise<BrainstormAnalysis> {
  const categoryNames = categories.map((c) => c.name).join(', ') || 'Activité Pro & Travail, Idées & Projets, Admin & Finances, Maison & Quotidien';

  const modeInstructions: Record<BrainstormMode, string> = {
    structure: `Synthétise le projet en 5 blocs ultra-courts et percutants : Vision, Axes, Piliers, Jalons, Actions.`,
    ideation: `Dégage 3 angles novateurs, des leviers différenciants et des tests concrets ultra-courts.`,
    roadmap: `Établis une trajectoire en 2 jalons essentiels et dates indicatives.`,
    action_plan: `Extrais 3 actions directes prêtes à être exécutées.`,
  };

  const systemPrompt = `${modeInstructions[mode]}

RÈGLE D'OR : CONCISION ABSOLUE. PAS DE TEXTE LONG. UNIQUEMENT L'ESSENTIEL.
- Maximum 4 à 8 mots par élément. Style direct et télégraphique.
- Zéro phrase de remplissage, zéro bavardage.
- Aucun émoji.
- Catégories disponibles pour les actions : ${categoryNames}.
- Réponds STRICTEMENT en JSON :

{
  "projectTitle": "Titre (max 3-4 mots)",
  "tagline": "Slogan clé (max 6 mots)",
  "vision": "Intention maîtresse (max 10-15 mots)",
  "strategicDirections": [
    "Axe clé 1",
    "Axe clé 2",
    "Axe clé 3"
  ],
  "pillars": [
    {
      "id": "pillar-1",
      "title": "Nom court",
      "description": "Objectif clé (max 8 mots)",
      "keyPoints": ["Point clé concis"]
    }
  ],
  "milestones": [
    {
      "id": "ms-1",
      "phase": "Jalon 1 : Intitulé",
      "timeline": "S1",
      "objectives": ["Livrable concret"]
    }
  ],
  "immediateActions": [
    {
      "id": "act-1",
      "title": "Verbe + tâche concrète (max 6 mots)",
      "categoryName": "Nom exact d'une catégorie disponible",
      "horizon": "todo",
      "priority": "high",
      "estimatedTime": "30m",
      "rationale": "Bénéfice immédiat"
    }
  ],
  "keyRisksOrConsiderations": [
    "Vigilance concrète (max 7 mots)"
  ],
  "suggestedNextSteps": [
    "Étape suivante directe (max 7 mots)"
  ]
}`;

  const userMessages = [];
  if (contextHistory) {
    userMessages.push({ role: 'system' as const, content: `Contexte précédent : \n${contextHistory}` });
  }
  userMessages.push({ role: 'user' as const, content: `Demande :\n${prompt}` });

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
        ...userMessages,
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Erreur Brainstorm (${response.status})`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) throw new Error('Réponse vide');

  const parsed = JSON.parse(rawContent);

  return {
    projectTitle: parsed.projectTitle || 'Cadrage Clé',
    tagline: parsed.tagline || 'Priorités et passage à l\'action.',
    vision: parsed.vision || 'Définir un cap clair et exécuter l\'essentiel.',
    strategicDirections: Array.isArray(parsed.strategicDirections) ? parsed.strategicDirections : [],
    pillars: Array.isArray(parsed.pillars)
      ? parsed.pillars.map((p: any, idx: number) => ({
          id: p.id || `pillar-${idx + 1}`,
          title: p.title || `Pilier ${idx + 1}`,
          description: p.description || '',
          keyPoints: Array.isArray(p.keyPoints) ? p.keyPoints : [],
        }))
      : [],
    milestones: Array.isArray(parsed.milestones)
      ? parsed.milestones.map((m: any, idx: number) => ({
          id: m.id || `ms-${idx + 1}`,
          phase: m.phase || `Phase ${idx + 1}`,
          timeline: m.timeline || '',
          objectives: Array.isArray(m.objectives) ? m.objectives : [],
        }))
      : [],
    immediateActions: Array.isArray(parsed.immediateActions)
      ? parsed.immediateActions.map((a: any, idx: number) => ({
          id: a.id || `act-${Date.now()}-${idx}`,
          title: a.title || 'Action à exécuter',
          categoryName: a.categoryName || 'Idées & Projets',
          horizon: (a.horizon === 'today' || a.horizon === 'life' ? a.horizon : 'todo') as Horizon,
          priority: (a.priority === 'high' || a.priority === 'low' ? a.priority : 'medium') as Priority,
          estimatedTime: a.estimatedTime || '30m',
          rationale: a.rationale || '',
        }))
      : [],
    keyRisksOrConsiderations: Array.isArray(parsed.keyRisksOrConsiderations) ? parsed.keyRisksOrConsiderations : [],
    suggestedNextSteps: Array.isArray(parsed.suggestedNextSteps) ? parsed.suggestedNextSteps : [],
  };
}

export function localFallbackBrainstorm(text: string, _mode?: BrainstormMode): BrainstormAnalysis {
  const shortTitle = text.slice(0, 25) || 'Projet Clé';

  return {
    projectTitle: shortTitle,
    tagline: 'Priorisation nette et exécution rapide.',
    vision: 'Concentrer l\'énergie sur les leviers à plus forte valeur.',
    strategicDirections: [
      'Valider la proposition centrale',
      'Construire la version minimale viable',
      'Mesurer l\'impact direct',
    ],
    pillars: [
      {
        id: 'pillar-1',
        title: 'Cadrage',
        description: 'Périmètre clair et livrable final.',
        keyPoints: ['Spécifications validées'],
      },
      {
        id: 'pillar-2',
        title: 'Exécution',
        description: 'Lancer un prototype rapide.',
        keyPoints: ['Recueillir des retours directs'],
      },
    ],
    milestones: [
      {
        id: 'ms-1',
        phase: 'Jalon 1 : Cadrage',
        timeline: 'S1',
        objectives: ['Version test opérationnelle'],
      },
      {
        id: 'ms-2',
        phase: 'Jalon 2 : Déploiement',
        timeline: 'S2',
        objectives: ['Mise en pratique réelle'],
      },
    ],
    immediateActions: [
      {
        id: `act-${Date.now()}-1`,
        title: `Rédiger le cadrage : ${shortTitle}`,
        categoryName: 'Idées & Projets',
        horizon: 'todo',
        priority: 'high',
        estimatedTime: '30m',
        rationale: 'Alignement direct du périmètre.',
      },
      {
        id: `act-${Date.now()}-2`,
        title: 'Définir les 3 indicateurs clés',
        categoryName: 'Activité Pro & Travail',
        horizon: 'todo',
        priority: 'medium',
        estimatedTime: '20m',
        rationale: 'Mesurer l\'avancement réel.',
      },
    ],
    keyRisksOrConsiderations: [
      'Dispersion sur des détails secondaires.',
    ],
    suggestedNextSteps: [
      'Ajouter les actions au tableau et lancer le jalon 1.',
    ],
  };
}
