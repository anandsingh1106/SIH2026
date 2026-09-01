import { UserRole } from '../../types';
import { backendApi } from '../api/backendApi';

export interface AIMessage {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: string[];
  suggestedActions?: { label: string; action: string }[];
  disclaimer?: string;
  /** Which layer answered: the live model or the offline knowledge base. */
  origin?: 'ai' | 'knowledge-base';
  /** True when the request failed, so the UI can offer a retry. */
  failed?: boolean;
}

const MAX_CONTEXT_TURNS = 6;

/** Formats a timestamp the same way the composer stamps user messages. */
const stamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Builds the context string sent alongside the question. The backend takes a
 * single `context` field (max 4000 chars), so recent turns are folded into it —
 * this is what lets follow-ups like "what about for a 2 year old?" resolve.
 */
const buildContext = (
  role: UserRole,
  history: AIMessage[],
  patientContext?: { name: string; age: number; vitals?: string; diagnosis?: string }
): string => {
  const parts = [`The user's role is ${role}.`];

  if (patientContext) {
    parts.push(
      `Patient context: ${patientContext.name}, age ${patientContext.age}` +
        (patientContext.vitals ? `, vitals: ${patientContext.vitals}` : '') +
        (patientContext.diagnosis ? `, working diagnosis: ${patientContext.diagnosis}` : '')
    );
  }

  // Only real exchanges are useful as context; a failed turn carries no answer.
  const recent = history.filter((m) => !m.failed).slice(-MAX_CONTEXT_TURNS);
  if (recent.length) {
    parts.push(
      'Earlier conversation:\n' +
        recent.map((m) => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n')
    );
  }

  // Stay inside the backend's 4000-character limit, keeping the most recent text.
  const context = parts.join('\n');
  return context.length > 3900 ? context.slice(-3900) : context;
};

/**
 * Routes assistant questions through the backend so the provider API key stays
 * on the server (§31). When no provider is configured the backend answers from
 * its offline knowledge base rather than returning invented content.
 */
export const getAIContextualResponse = async (
  query: string,
  role: UserRole = 'asha',
  patientContext?: { name: string; age: number; vitals?: string; diagnosis?: string },
  history: AIMessage[] = []
): Promise<AIMessage> => {
  const context = buildContext(role, history, patientContext);

  try {
    const result = await backendApi.askAssistant(query, context || undefined);

    if (!result.answer) {
      return {
        sender: 'assistant',
        text:
          'The AI assistant is not configured on this server yet. An administrator needs to set ' +
          'AI_PROVIDER and the matching API key in the backend environment.',
        timestamp: stamp(),
        failed: true,
      };
    }

    return {
      sender: 'assistant',
      text: result.answer,
      timestamp: stamp(),
      disclaimer: result.disclaimer,
      origin: result.source,
      sources: result.reference ? [result.reference] : undefined,
    };
  } catch (err) {
    return {
      sender: 'assistant',
      text:
        err instanceof Error
          ? `The assistant could not answer right now: ${err.message}`
          : 'The assistant could not answer right now.',
      timestamp: stamp(),
      failed: true,
    };
  }
};
