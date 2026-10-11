import type { Category, CategorizeResult, Priority } from '../types';

const FALLBACK_MODELS = [
  'llama-3.1-8b-instant',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile',
];

import {
  ORGANISATION_QUOTES,
  getRandomQuote,
  getNextUniqueQuote,
} from './quoteService';

export { ORGANISATION_QUOTES, getRandomQuote, getNextUniqueQuote };

export async function fetchAvailableGroqModels(apiKey: string): Promise<string[]> {
  if (!apiKey || apiKey.trim().length < 5) return [];
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data && Array.isArray(data.data)) {
      return data.data
        .map((m: any) => m.id)
        .filter((id: string) => typeof id === 'string' && !id.includes('whisper') && !id.includes('guard'));
    }
    return [];
  } catch (e) {
    console.warn('Could not fetch Groq models:', e);
    return [];
  }
}

export async function categorizeTasks(
  rawInput: string,
  existingCategories: Category[],
  apiKey: string,
  preferredModel: string = 'llama-3.1-8b-instant'
): Promise<CategorizeResult> {
  const cleanInput = rawInput.trim();
  if (!cleanInput) {
    return { tasks: [] };
  }

  // If apiKey is provided, try Groq API with auto-fallback on available models
  if (apiKey && apiKey.trim().length > 5) {
    const modelsToTry = [preferredModel, ...FALLBACK_MODELS.filter((m) => m !== preferredModel)];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const result = await callGroqAPI(cleanInput, existingCategories, apiKey.trim(), model);
        return result;
      } catch (err: any) {
        lastError = err;
        const msg = String(err.message || '');
        if (
          msg.includes('does not exist') ||
          msg.includes('not have access') ||
          msg.includes('model_not_found') ||
          msg.includes('404')
        ) {
          console.warn(`Model ${model} unavailable, trying next fallback...`);
          continue;
        } else {
          break;
        }
      }
    }

    console.warn('All Groq models failed, falling back to local categorizer:', lastError);
    const fallback = localSmartCategorize(cleanInput, existingCategories);
    return fallback;
  }

  // Otherwise, use local smart categorizer
  return localSmartCategorize(cleanInput, existingCategories);
}

async function callGroqAPI(
  input: string,
  existingCategories: Category[],
  apiKey: string,
  model: string
): Promise<CategorizeResult> {
  const categoryNamesList = existingCategories.map((c) => c.name).join(', ');

  const systemPrompt = `Tu es un assistant d'organisation personnelle d'élite.
L'utilisateur te fournit une liste brute de pensées et tâches dispersées ("brain dump").
Ta mission principale et essentielle est de trier et classer chaque action dans la bonne catégorie de vie (Activité Pro, Détente & Loisirs, Maison, etc.).
Attention: N'inclus JAMAIS d'émojis dans les titres, catégories ou réponses.

Catégories existantes recommandées : ${categoryNamesList}.
Tu peux réutiliser ces catégories principales :
- "Activité Pro & Travail" : travail, clients, réunions, code, livrables, projets professionnels
- "Détente & Loisirs" : lecture, films, jeux, sorties, restaurant, musique, passions, repos
- "Maison & Quotidien" : ménage, bricolage, rangement, tâches domestiques
- "Santé & Bien-être" : sport, rendez-vous médicaux, bien-être, sommeil, alimentation
- "Courses & Achats" : supermarché, achats divers, commandes
- "Admin & Finances" : factures, banque, impôts, documents officiels
- "Idées & Projets" : réflexions créatives, nouveaux projets à explorer
- "Appels & Rendez-vous" : appels téléphoniques, prises de contact

Horizons de planification :
- "today" : Tâche explicitement demandée pour aujourd'hui ou ce soir
- "todo" : Tâche à faire (sans date fixée, l'utilisateur choisira lui-même)

Pour chaque tâche extraite, détermine :
- "title": Titre court, clair et actionnable (en français, sans émoji)
- "categoryName": Nom de la catégorie la plus adaptée
- "horizon": "today" si explicitement pour aujourd'hui/ce soir, sinon "todo"
- "priority": "high", "medium", ou "low" (basé sur l'urgence ou l'importance)
- "estimatedTime": estimation réaliste si déductible (ex: "10 min", "30 min", "1h") ou null
- "dueDate": délai ou mention temporelle si présente (ex: "Aujourd'hui", "Ce soir", "Mardi 15h") ou null
- "notes": détail ou contexte supplémentaire si nécessaire ou null

Ajoute OBLIGATOIREMENT un champ "aiTip" : une citation puissante, mémorable et inspirante en français sur l'organisation personnelle ou ses compétences clés connexes (gestion du temps, deep work, concentration, discipline, priorisation, élimination du superflu, clarté mentale, constance, exécution) avec son auteur au format « Citation. » — Auteur. Évite absolument les répétitions et les citations banales. N'utilise aucun émoji.

Tu DOIS répondre STRICTEMENT au format JSON valide suivant :
{
  "tasks": [
    {
      "title": "Préparer la réunion client",
      "categoryName": "Activité Pro & Travail",
      "horizon": "todo",
      "priority": "high",
      "estimatedTime": "45 min",
      "dueDate": null,
      "notes": null
    }
  ],
  "aiTip": "« Pour chaque minute passée à organiser, une heure est gagnée. » — Benjamin Franklin"
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
        { role: 'user', content: input },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `Erreur Groq (${response.status})`;
    throw new Error(message);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error('Réponse vide de Groq');
  }

  const parsed = JSON.parse(rawContent);
  const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];

  const fallbackQuote = getNextUniqueQuote();

  return {
    tasks: tasks.map((t: any) => {
      const validHorizon = ['today', 'todo', 'life'].includes(t.horizon)
        ? t.horizon
        : (t.dueDate === "Aujourd'hui" || t.dueDate === "Ce soir" ? 'today' : 'todo');

      return {
        title: String(t.title || '').trim(),
        categoryName: String(t.categoryName || 'Maison & Quotidien').trim(),
        horizon: validHorizon,
        priority: (['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium') as Priority,
        estimatedTime: t.estimatedTime ? String(t.estimatedTime) : undefined,
        dueDate: t.dueDate ? String(t.dueDate) : undefined,
        notes: t.notes ? String(t.notes) : undefined,
      };
    }).filter((t: any) => t.title.length > 0),
    aiTip: parsed.aiTip && parsed.aiTip.length > 5 ? parsed.aiTip : fallbackQuote,
  };
}

/**
 * Intelligent Local Categorizer (Runs offline without any API key)
 */
export function localSmartCategorize(
  input: string,
  existingCategories: Category[]
): CategorizeResult {
  const lines = input
    .split(/\r?\n|[•\-\*]\s+|;\s+/)
    .map((l) => l.trim().replace(/^[-*•\d+.)]\s*/, ''))
    .filter((l) => l.length > 1);

  const tasks: CategorizeResult['tasks'] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Priority detection
    let priority: Priority = 'medium';
    if (
      lower.includes('urgent') ||
      lower.includes('asap') ||
      lower.includes('vite') ||
      lower.includes('important') ||
      lower.includes('priorit') ||
      lower.includes('ce matin') ||
      lower.includes('immédiat')
    ) {
      priority = 'high';
    } else if (
      lower.includes('un jour') ||
      lower.includes('peut-être') ||
      lower.includes('id') ||
      lower.includes('plus tard') ||
      lower.includes('quand j\'ai le temps')
    ) {
      priority = 'low';
    }

    // Due date extraction
    let dueDate: string | undefined;
    if (lower.includes("aujourd'hui") || lower.includes('ce jour')) {
      dueDate = "Aujourd'hui";
    } else if (lower.includes('demain')) {
      dueDate = 'Demain';
    } else if (lower.includes('ce soir')) {
      dueDate = 'Ce soir';
    } else if (lower.includes('ce week-end') || lower.includes('ce weekend')) {
      dueDate = 'Ce week-end';
    } else if (lower.includes('lundi')) {
      dueDate = 'Lundi';
    } else if (lower.includes('mardi')) {
      dueDate = 'Mardi';
    } else if (lower.includes('mercredi')) {
      dueDate = 'Mercredi';
    } else if (lower.includes('jeudi')) {
      dueDate = 'Jeudi';
    } else if (lower.includes('vendredi')) {
      dueDate = 'Vendredi';
    } else if (lower.includes('fin du mois') || lower.includes('fin de mois')) {
      dueDate = 'Fin du mois';
    }

    // Time estimate extraction
    let estimatedTime: string | undefined;
    const timeMatch = line.match(/(\d+)\s*(min|minute|minutes|h|heure|heures|s)/i);
    if (timeMatch) {
      estimatedTime = `${timeMatch[1]} ${timeMatch[2].toLowerCase().startsWith('h') ? 'h' : 'min'}`;
    }

    // Category detection rules
    let categoryName = 'Maison & Quotidien';

    if (
      lower.includes('achet') ||
      lower.includes('course') ||
      lower.includes('magasin') ||
      lower.includes('supermarch') ||
      lower.includes('pain') ||
      lower.includes('lait') ||
      lower.includes('beurre') ||
      lower.includes('café') ||
      lower.includes('commander') ||
      lower.includes('amazon') ||
      lower.includes('cadeau')
    ) {
      categoryName = 'Courses & Achats';
    } else if (
      lower.includes('appel') ||
      lower.includes('téléphon') ||
      lower.includes('dentiste') ||
      lower.includes('docteur') ||
      lower.includes('médecin') ||
      lower.includes('rdv') ||
      lower.includes('rendez-vous') ||
      lower.includes('rencontr') ||
      lower.includes('call') ||
      lower.includes('zoom')
    ) {
      categoryName = 'Appels & Rendez-vous';
    } else if (
      lower.includes('film') ||
      lower.includes('série') ||
      lower.includes('lire') ||
      lower.includes('livre') ||
      lower.includes('musique') ||
      lower.includes('resto') ||
      lower.includes('restaurant') ||
      lower.includes('bar') ||
      lower.includes('jeu') ||
      lower.includes('détente') ||
      lower.includes('relax') ||
      lower.includes('repos') ||
      lower.includes('weekend') ||
      lower.includes('week-end') ||
      lower.includes('ciné')
    ) {
      categoryName = 'Détente & Loisirs';
    } else if (
      lower.includes('mail') ||
      lower.includes('email') ||
      lower.includes('client') ||
      lower.includes('projet') ||
      lower.includes('présentation') ||
      lower.includes('réunion') ||
      lower.includes('boss') ||
      lower.includes('devis') ||
      lower.includes('contrat') ||
      lower.includes('code') ||
      lower.includes('bug') ||
      lower.includes('livrable') ||
      lower.includes('rapport') ||
      lower.includes('compte-rendu') ||
      lower.includes('travail') ||
      lower.includes('pro')
    ) {
      categoryName = 'Activité Pro & Travail';
    } else if (
      lower.includes('sport') ||
      lower.includes('courir') ||
      lower.includes('gym') ||
      lower.includes('fitness') ||
      lower.includes('médit') ||
      lower.includes('yoga') ||
      lower.includes('santé') ||
      lower.includes('marche') ||
      lower.includes('eau') ||
      lower.includes('dormir') ||
      lower.includes('sommeil')
    ) {
      categoryName = 'Santé & Bien-être';
    } else if (
      lower.includes('facture') ||
      lower.includes('impôt') ||
      lower.includes('edf') ||
      lower.includes('loyer') ||
      lower.includes('banque') ||
      lower.includes('virement') ||
      lower.includes('payer') ||
      lower.includes('papier') ||
      lower.includes('assurance') ||
      lower.includes('admin')
    ) {
      categoryName = 'Admin & Finances';
    } else if (
      lower.includes('idée') ||
      lower.includes('penser à') ||
      lower.includes('tester') ||
      lower.includes('voyage') ||
      lower.includes('vacance') ||
      lower.includes('projet perso')
    ) {
      categoryName = 'Idées & Projets';
    }

    // Horizon detection (defaults to 'todo' sans date unless explicit)
    let horizon: 'today' | 'todo' | 'life' = 'todo';
    if (
      dueDate === "Aujourd'hui" ||
      dueDate === "Ce soir" ||
      lower.includes("aujourd'hui") ||
      lower.includes('ce soir') ||
      lower.includes('ce matin')
    ) {
      horizon = 'today';
    } else {
      horizon = 'todo';
    }

    // Match with existing categories if available
    const existing = existingCategories.find(
      (c) => c.name.toLowerCase() === categoryName.toLowerCase()
    );
    if (existing) {
      categoryName = existing.name;
    }

    tasks.push({
      title: line.charAt(0).toUpperCase() + line.slice(1),
      categoryName,
      horizon,
      priority,
      estimatedTime,
      dueDate,
    });
  }

  const quote = getNextUniqueQuote();

  return {
    tasks,
    aiTip: quote,
  };
}
