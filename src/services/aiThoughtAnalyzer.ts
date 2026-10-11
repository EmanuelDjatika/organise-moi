import type { AIThoughtAnalysis, Category } from '../types';

const FALLBACK_MODELS = [
  'llama-3.1-8b-instant',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile',
];

export async function analyzeThoughtContent(
  thoughtText: string,
  apiKey?: string,
  preferredModel: string = 'llama-3.1-8b-instant',
  categories: Category[] = []
): Promise<AIThoughtAnalysis> {
  const text = thoughtText.trim();
  if (!text) {
    return localFallbackAnalysis(text);
  }

  if (apiKey && apiKey.trim().length > 5) {
    const modelsToTry = [preferredModel, ...FALLBACK_MODELS.filter((m) => m !== preferredModel)];

    for (const model of modelsToTry) {
      try {
        const result = await callGroqThoughtAnalysis(text, apiKey.trim(), model, categories);
        return result;
      } catch (err: any) {
        console.warn(`Thought analysis failed on ${model}, trying next...`, err);
      }
    }
  }

  return localFallbackAnalysis(text);
}

async function callGroqThoughtAnalysis(
  text: string,
  apiKey: string,
  model: string,
  categories: Category[]
): Promise<AIThoughtAnalysis> {
  const categoryNames = categories.map((c) => c.name).join(', ') || 'Activité Pro & Travail, Maison & Quotidien, Détente & Loisirs, Santé & Bien-être, Admin & Finances, Idées & Projets';

  const systemPrompt = `Tu es un assistant de clarté mentale et de coaching personnel.
L'utilisateur partage une pensée ou préoccupation.
Ton rôle est d'analyser cette pensée avec bienveillance et pragmatisme de manière CONCISE et DIRECTE.

RÈGLE ABSOLUE : N'inclus AUCUN émoji. Rédige en français avec des phrases TRÈS COURTES (1 phrase par point maximum, sans bavardage).

Catégories disponibles : ${categoryNames}.

Structure JSON STRICTE :
{
  "themeTag": "Un mot ou tag court (ex: Réflexion, Charge mentale, Idée, Projet, Santé, etc.)",
  "summary": "Synthèse en 1 phrase très courte.",
  "clarityInsights": [
    "Prise de recul ou insight concis 1",
    "Prise de recul ou insight concis 2"
  ],
  "actionableSteps": [
    "Action ou conseil concret 1",
    "Action ou conseil concret 2"
  ],
  "extractedTasks": [
    {
      "title": "Titre actionnable sans émoji d'une tâche concrète",
      "categoryName": "Nom exact d'une des catégories disponibles",
      "horizon": "todo"
    }
  ],
  "reflectionQuestion": "Une question courte pour faire avancer la réflexion.",
  "encouragement": "Une phrase d'encouragement concise."
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
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Erreur analyse (${response.status})`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) throw new Error('Réponse vide');

  const parsed = JSON.parse(rawContent);

  return {
    themeTag: parsed.themeTag || 'Réflexion',
    summary: parsed.summary || 'Réflexion enregistrée.',
    clarityInsights: Array.isArray(parsed.clarityInsights) ? parsed.clarityInsights.slice(0, 3) : [],
    actionableSteps: Array.isArray(parsed.actionableSteps) ? parsed.actionableSteps.slice(0, 3) : [],
    extractedTasks: Array.isArray(parsed.extractedTasks) ? parsed.extractedTasks : [],
    reflectionQuestion: parsed.reflectionQuestion || 'Quel est le premier pas simple que vous pouvez poser ?',
    encouragement: parsed.encouragement || 'Un pas après l\'autre suffit amplement.',
  };
}

export function localFallbackAnalysis(text: string): AIThoughtAnalysis {
  const lower = text.toLowerCase();

  const isStress = lower.includes('peur') || lower.includes('stress') || lower.includes('angoisse') || lower.includes('trop') || lower.includes('débord');
  const isIdea = lower.includes('idée') || lower.includes('projet') || lower.includes('créer') || lower.includes('inventer');
  const isDoubt = lower.includes('doute') || lower.includes('hésit') || lower.includes('sais pas') || lower.includes('choix');

  const extractedTasks: AIThoughtAnalysis['extractedTasks'] = [];

  if (text.length > 20) {
    extractedTasks.push({
      title: `Clarifier : ${text.slice(0, 40)}...`,
      categoryName: isIdea ? 'Idées & Projets' : 'Maison & Quotidien',
      horizon: 'todo',
    });
  }

  if (isStress) {
    return {
      themeTag: 'Charge mentale',
      summary: "Une tension accumulée qui demande de la simplification.",
      clarityInsights: [
        "Reconnaître le ressenti désamorce la pression.",
        "Distinguez ce qui dépend de vous immédiatement."
      ],
      actionableSteps: [
        "Faites une pause de 5 minutes pour respirer.",
        "Isolez une seule priorité urgente pour aujourd'hui."
      ],
      extractedTasks,
      reflectionQuestion: "Quelle est la seule chose essentielle à faire aujourd'hui ?",
      encouragement: "Vous n'avez pas besoin de tout résoudre en même temps.",
    };
  }

  if (isIdea) {
    return {
      themeTag: 'Idée créative',
      summary: "Une impulsion créative pour concevoir ou faire évoluer un projet.",
      clarityInsights: [
        "Formulez l'idée en une hypothèse simple.",
        "Identifiez une première étape minimale."
      ],
      actionableSteps: [
        "Notez les 3 points clés de cette idée.",
        "Testez un micro-prototype en moins d'une heure."
      ],
      extractedTasks,
      reflectionQuestion: "Quelle est la version la plus simple que vous pouvez tester ?",
      encouragement: "Donnez à votre idée l'espace d'avancer pas à pas.",
    };
  }

  if (isDoubt) {
    return {
      themeTag: 'Doute & Choix',
      summary: "Une hésitation demandant de clarifier vos priorités.",
      clarityInsights: [
        "Choisir permet de reprendre la maîtrise de son énergie.",
        "Une décision imparfaite vaut mieux que l'inaction."
      ],
      actionableSteps: [
        "Listez les deux options et choisissez la plus alignée.",
        "Fixez-vous une date limite pour trancher."
      ],
      extractedTasks,
      reflectionQuestion: "Que feriez-vous sans crainte du résultat ?",
      encouragement: "Chaque décision est une occasion d'apprendre.",
    };
  }

  return {
    themeTag: 'Réflexion',
    summary: "Un moment de prise de recul sur votre quotidien.",
    clarityInsights: [
      "Mettre des mots ordonne le paysage mental.",
      "L'écriture consolide votre clarté."
    ],
    actionableSteps: [
      "Identifiez si une action immédiate en découle.",
      "Gardez cette note comme repère."
    ],
    extractedTasks,
    reflectionQuestion: "Quel est l'enseignement principal de cette réflexion ?",
    encouragement: "Chaque moment de clarté nourrit votre sérénité.",
  };
}
