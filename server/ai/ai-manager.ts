import { gemini, createGeminiClient, getResolvedApiKey } from './gemini-client.ts';
import { buildRagContext } from '../rag/rag-engine.ts';

export type AgentType =
  | 'verse_explanation'
  | 'bible_general'
  | 'search'
  | 'dictionary'
  | 'character'
  | 'story'
  | 'study'
  | 'devotional'
  | 'prayer'
  | 'quiz'
  | 'translation'
  | 'content'
  | 'video_script';

export interface AgentResponse {
  agentType: AgentType;
  agentName: string;
  answer: string;
  ragReferences: string[];
}

/**
 * Live Web Search retrieval helper
 * Fetches real-time encyclopedic, historical, contemporary and biblical references from the Net
 */
async function fetchLiveWebSnippets(query: string): Promise<{ title: string; snippet: string }[]> {
  try {
    const cleanQuery = query
      .replace(/Génère une étude biblique complète.*?sur le sujet\s*:\s*/gi, '')
      .replace(/Explique en détail.*?:/gi, '')
      .replace(/Rédige un[e]? .*?sur :?/gi, '')
      .replace(/[«»"]/g, '')
      .trim();

    if (!cleanQuery) return [];

    const searchUrl =
      'https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=' +
      encodeURIComponent(cleanQuery.slice(0, 100)) +
      '&utf8=1&format=json&origin=*';

    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': 'BibleAI/2.0 (Theological & Scriptural Research)' },
      signal: AbortSignal.timeout(3500),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const list = data?.query?.search || [];
    return list.slice(0, 4).map((item: any) => ({
      title: item.title,
      snippet: (item.snippet || '').replace(/<[^>]+>/g, '').trim(),
    }));
  } catch (e) {
    return [];
  }
}

export const AGENT_DESCRIPTIONS: Record<AgentType, { name: string; role: string }> = {
  verse_explanation: {
    name: 'Verse Explanation Agent',
    role: 'Explication exégétique structurée (passage, contexte, enseignement, application, méditation, questions)'
  },
  bible_general: {
    name: 'Bible Agent',
    role: 'Guide sur les livres bibliques, les auteurs, le canon et la chronologie'
  },
  search: {
    name: 'Search Agent',
    role: 'Recherche biblique thématique et références croisées'
  },
  dictionary: {
    name: 'Theological Dictionary Agent',
    role: 'Définitions doctrinales et étymologie biblique vérifiée'
  },
  character: {
    name: 'Character Agent',
    role: 'Biographies bibliques approfondies, leçons de vie et foi'
  },
  story: {
    name: 'Story Agent',
    role: 'Récits des grandes histoires bibliques avec analyse théologique'
  },
  study: {
    name: 'Bible Study Agent',
    role: 'Concepteur d\'études bibliques complètes et structurées'
  },
  devotional: {
    name: 'Devotional Agent',
    role: 'Méditations quotidiennes centrées sur la grâce et la vie chrétienne'
  },
  prayer: {
    name: 'Prayer Agent',
    role: 'Prières scripturaires fondées sur la Parole de Dieu'
  },
  quiz: {
    name: 'Quiz Agent',
    role: 'Générateur de quiz interactifs et questions théologiques'
  },
  translation: {
    name: 'Translation Agent',
    role: 'Comparaison des versions bibliques et nuances théologiques'
  },
  content: {
    name: 'Content Studio Agent',
    role: 'Rédaction d\'articles, publications chrétiennes et résumés'
  },
  video_script: {
    name: 'Video Script Studio Agent',
    role: 'Concepteur de scripts vidéo YouTube/Reels avec découpage visuel'
  }
};

export function detectAgentType(prompt: string): AgentType {
  const p = prompt.toLowerCase();

  if (p.includes('script video') || p.includes('script vidéo') || p.includes('video script') || p.includes('reels') || p.includes('youtube')) {
    return 'video_script';
  }
  if (p.includes('etude biblique') || p.includes('étude biblique') || p.includes('plan d\'etude') || p.includes('cree une etude') || p.includes('crée une étude')) {
    return 'study';
  }
  if (p.includes('priere') || p.includes('prière') || p.includes('prier pour')) {
    return 'prayer';
  }
  if (p.includes('meditation') || p.includes('méditation') || p.includes('devotion') || p.includes('dévotion')) {
    return 'devotional';
  }
  if (p.includes('quiz') || p.includes('questionnaire') || p.includes('qcm')) {
    return 'quiz';
  }
  if (p.includes('qui est') || p.includes('personnage') || p.includes('vie de ') || p.includes('abraham') || p.includes('moise') || p.includes('david')) {
    return 'character';
  }
  if (p.includes('histoire de') || p.includes('recit de') || p.includes('récit de') || p.includes('parabole')) {
    return 'story';
  }
  if (p.includes('definition') || p.includes('définition') || p.includes('signification') || p.includes('que signifie')) {
    return 'dictionary';
  }
  if (p.includes('traduction') || p.includes('traduire') || p.includes('version')) {
    return 'translation';
  }
  if (p.includes('article') || p.includes('publication') || p.includes('contenu') || p.includes('redige') || p.includes('rédige')) {
    return 'content';
  }
  if (p.includes('explique') || p.includes('verset') || /\b[1-3]?\s*[A-Za-zÀ-ÿ]+\s+\d+:\d+\b/.test(prompt)) {
    return 'verse_explanation';
  }
  if (p.includes('cherche') || p.includes('trouve') || p.includes('quels versets')) {
    return 'search';
  }

  return 'bible_general';
}

const BASE_SYSTEM_PROMPT = `Tu es BIBLE AI, l'assistant spirituel et théologique officiel de la plateforme Bible AI.
Slogan : "La Bible, la connaissance et l'intelligence au même endroit."

PRINCIPES FONDAMENTAUX :
1. RESPECT ET RIGUEUR SACRÉE :
   - Tu fournis des réponses claires, structurées, respectueuses et théologiquement solides.
   - Tu distingues rigoureusement : (1) Le texte biblique exact, (2) Le contexte littéraire et historique, (3) L'interprétation/théologie, (4) L'application pratique personnelle.

2. RÈGLE ABSOLUE SUR LES VERSETS :
   - Ne JAMAIS inventer un verset ni une citation biblique.
   - Si des versets sont fournis dans le [CONTEXTE BIBLIQUE VÉRIFIÉ], utilise prioritairement ces textes officiels.
   - Si une référence n'est pas connue avec certitude absolue, réponds : « Je ne dispose pas de suffisamment d'informations bibliques vérifiées pour confirmer cette information. »

3. POSTURE SPIRITUELLE :
   - Tu es un outil d'aide à la compréhension et à l'édification chrétienne.
   - Tu ne prétends JAMAIS être Dieu, Jésus-Christ, le Saint-Esprit ou une autorité divine infaillible.
   - Lorsque plusieurs interprétations chrétiennes légitimes existent (ex: doctrines évangéliques, réformées, catholiques, orthodoxes), mentionne-les avec bienveillance et équilibre.`;

async function callGeminiWithRetry(
  promptContent: string,
  systemInstruction: string,
  customApiKey?: string
): Promise<string> {
  // Use client with resolved or custom API key
  const activeClient = customApiKey ? createGeminiClient(customApiKey) : gemini;

  // The official supported models from SKILL.md in priority order:
  // 1. gemini-3.1-flash-lite: highest availability, fastest speed (<3s), zero 503 errors
  // 2. gemini-flash-latest: official Flash model
  // 3. gemini-3.8-flash: official text model
  const modelsToTry = [
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.8-flash',
  ];

  let lastError: any = null;

  for (const currentModel of modelsToTry) {
    // 1. Standard prompt with real-time web context injected.
    // Extremely fast, reliable and does NOT hit the googleSearch tool 429 quota.
    try {
      const response = await activeClient.models.generateContent({
        model: currentModel,
        contents: promptContent,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      if (response && response.text && response.text.trim().length > 0) {
        return response.text;
      }
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      console.warn(`[Bible AI] Standard call on ${currentModel} failed: ${errMsg}`);
    }

    // 2. Try with Google Search Grounding tool if standard call encountered a transient issue
    try {
      const responseWithSearch = await activeClient.models.generateContent({
        model: currentModel,
        contents: promptContent,
        config: {
          systemInstruction,
          temperature: 0.7,
          tools: [{ googleSearch: {} }],
        },
      });

      if (responseWithSearch && responseWithSearch.text && responseWithSearch.text.trim().length > 0) {
        return responseWithSearch.text;
      }
    } catch (searchErr: any) {
      lastError = searchErr;
      const errMsg = searchErr?.message || String(searchErr);
      console.warn(`[Bible AI] Search tool call on ${currentModel} failed: ${errMsg}`);
    }
  }

  throw lastError || new Error('Le service Gemini a rencontré une indisponibilité temporaire.');
}

export async function processBibleAiRequest(
  userPrompt: string,
  forcedAgent?: AgentType,
  translation: 'LSG' | 'KJV' = 'LSG',
  customApiKey?: string
): Promise<AgentResponse> {
  const agentType = forcedAgent || detectAgentType(userPrompt);
  const agentMeta = AGENT_DESCRIPTIONS[agentType];

  // Run RAG Retrieval from local Bible database
  const rag = buildRagContext(userPrompt, translation);

  // Fetch Live Web information from the Net in parallel
  const liveWebSnippets = await fetchLiveWebSnippets(userPrompt);
  const webContextText = liveWebSnippets.length > 0
    ? liveWebSnippets.map(s => `• ${s.title} : ${s.snippet}`).join('\n')
    : '';

  let agentSpecificInstruction = '';

  switch (agentType) {
    case 'verse_explanation':
      agentSpecificInstruction = `Tu agis en tant que Verse Explanation Agent. Tu as accès aux informations bibliques et aux données en direct du Net. Structure IMPÉRATIVEMENT ta réponse avec ces sections exactes :
### 📖 Le passage biblique
(Cite le verset mot pour mot d'après la base)
### 💡 Explication générale
### 🔎 Contexte immédiat
### 🏛️ Contexte historique, culturel et recherches contemporaines
### 📚 Références croisées
### 🧠 Enseignement principal
### ❤️ Application pratique pour aujourd'hui
### 🙏 Méditation personnelle
### ❓ Questions de réflexion`;
      break;

    case 'study':
      agentSpecificInstruction = `Tu agis en tant que Study Agent. Tu conçois des parcours d'études théologiques structurés et vivants, enrichis des connaissances bibliques et du contexte historique actuel. Structure l'étude biblique complète :
# Titre de l'étude
- Introduction captivante
- Objectifs d'apprentissage
- Passages clés de méditation
- Explication approfondie et points doctrinaux
- Contexte historique et recherches théologiques récentes
- Questions pour groupe de partage ou méditation personnelle
- Application concrète dans le monde actuel
- Conclusion et Prière de clôture.`;
      break;

    case 'prayer':
      agentSpecificInstruction = `Tu agis en tant que Prayer Agent. Écris une prière fervente, humble et inspirée directement des Écritures et des besoins réels d'aujourd'hui. Intègre des versets en louant la fidélité de Dieu. Ne te présente jamais comme un intercesseur divin, mais comme un guide pour aider le croyant à s'adresser au Père céleste au nom de Jésus-Christ.`;
      break;

    case 'video_script':
      agentSpecificInstruction = `Tu agis en tant que Video Script Studio Agent. Crée un script vidéo dynamique adapté aux formats actuels (YouTube / Reels / TikTok) :
- Titre accrocheur et viral
- Hook percutant (les 5 premières secondes)
- Introduction
- Scène par scène (avec [Visuel suggéré / Texte à l'écran / Narration voix off])
- Références bibliques affichées
- Conclusion inspirante
- Call to action (Abonnement, méditation, partage)
- Description vidéo optimisée et Hashtags.`;
      break;

    case 'character':
      agentSpecificInstruction = `Tu agis en tant que Character Agent. Présente le personnage biblique avec rigueur historique et pertinence actuelle :
- Identité, époque et contexte géopolitique
- Rôle dans l'histoire du salut
- Forces spirituelles et moments de foi
- Faiblesses et leçons tirées des épreuves
- Enseignements intemporels pour le croyant d'aujourd'hui.`;
      break;

    case 'quiz':
      agentSpecificInstruction = `Tu agis en tant que Quiz Agent. Propose des questions captivantes avec 4 choix (A, B, C, D), la réponse correcte clairement identifiée, une explication pédagogique détaillée et la référence biblique justificative.`;
      break;

    default:
      agentSpecificInstruction = `Tu agis en tant que ${agentMeta.name}. Rôle : ${agentMeta.role}. Tu réponds en direct avec des informations théologiques et factuelles vérifiées. Sois pédagogique, précis et profondément édifiant.`;
      break;
  }

  const promptContent = `
${userPrompt}

${webContextText ? `\n[INFORMATIONS EN DIRECT DU NET / CONNAISSANCES COMPLÉMENTAIRES] :\n${webContextText}\n[FIN DU WEB]` : ''}

${rag.formattedContext ? `\n[CONTEXTE BIBLIQUE VÉRIFIÉ DU SYSTÈME RAG] :\n${rag.formattedContext}\n[FIN DU CONTEXTE]` : ''}
`;

  try {
    const answer = await callGeminiWithRetry(
      promptContent,
      `${BASE_SYSTEM_PROMPT}\n\n${agentSpecificInstruction}`,
      customApiKey
    );

    const refs = rag.explicitVerses.map(v => `${v.bookName} ${v.chapter}:${v.verse}`);

    return {
      agentType,
      agentName: agentMeta.name,
      answer,
      ragReferences: refs
    };
  } catch (error: any) {
    console.error('Gemini Bible AI Error:', error);

    const hasAnyKey = Boolean(getResolvedApiKey(customApiKey));

    let fallbackText = '';
    if (!hasAnyKey) {
      fallbackText = `⚠️ **Configuration requise pour l'IA sur Vercel** :\n\nAucune clé API Gemini n'a été détectée dans l'environnement de déploiement.\n\n👉 **Pour activer l'IA sur votre application déployée** :\n1. Rendez-vous sur votre tableau de bord **Vercel** > Projet > **Settings** > **Environment Variables**.\n2. Ajoutez une variable nommée \`GEMINI_API_KEY\` avec votre clé d'API Google AI Studio (disponible gratuitement sur https://aistudio.google.com/app/apikey).\n3. Redéployez votre application, ou saisissez directement votre clé dans l'onglet **Profil** de cette application.\n\nVoici l'analyse biblique complète issue de notre base scripturaire :\n\n`;
    }

    if (webContextText) {
      fallbackText += `🌐 **Éléments vérifiés et contexte actuel du Net** :\n${webContextText}\n\n`;
    }

    if (rag.explicitVerses.length > 0) {
      fallbackText += `📖 **Passages bibliques de référence (${translation})** :\n`;
      rag.explicitVerses.forEach(v => {
        fallbackText += `> « ${v.text} » — *${v.bookName} ${v.chapter}:${v.verse}*\n\n`;
      });
    }

    if (rag.dictionaryEntries.length > 0) {
      fallbackText += `💡 **Définition théologique & Étymologie** :\n`;
      rag.dictionaryEntries.forEach(d => {
        fallbackText += `**${d.term}** : ${d.definition}\n*Portée scripturaire* : ${d.biblicalSignificance}\n\n`;
      });
    }

    if (rag.characterProfiles.length > 0) {
      fallbackText += `👤 **Profil biblique associé** :\n`;
      rag.characterProfiles.forEach(c => {
        fallbackText += `**${c.name}** (${c.era}) : ${c.presentation}\n*Leçons spirituelles* : ${c.teachings.join(' ; ')}\n\n`;
      });
    }

    if (agentType === 'study') {
      fallbackText += `### 📚 Synthèse d'Étude Théologique\n`;
      fallbackText += `* **Fondement scripturaire** : L'ensemble des Écritures révèle la fidélité de Dieu et la centralité du Christ dans l'histoire du salut.\n`;
      fallbackText += `* **Enseignement doctrinal** : La méditation de ce thème nourrit la foi et appelle à une marche sanctifiée et persévérante.\n`;
      fallbackText += `* **Application concrète** : Vivre cette vérité au quotidien dans l'obéissance, la prière fervente et l'amour du prochain.\n\n`;
      fallbackText += `### 🙏 Prière d'ancrage\n*« Seigneur, que Ta vérité vivante sanctifie nos cœurs et que Ta Parole soit la lampe qui guide chacun de nos pas. Au nom de Jésus-Christ. Amen. »*`;
    }

    return {
      agentType,
      agentName: agentMeta.name,
      answer: fallbackText,
      ragReferences: rag.explicitVerses.map(v => `${v.bookName} ${v.chapter}:${v.verse}`)
    };
  }
}
