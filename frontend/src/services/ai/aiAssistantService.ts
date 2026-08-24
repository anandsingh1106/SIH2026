import { UserRole } from '../../types';
import { backendApi } from '../api/backendApi';

export interface AIMessage {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: string[];
  suggestedActions?: { label: string; action: string }[];
  disclaimer?: string;
}

/**
 * Routes assistant questions through the backend so the provider API key stays
 * on the server (§31). When no provider is configured the backend says so
 * plainly rather than returning invented content.
 */
export const getAIContextualResponse = async (
  query: string,
  role: UserRole = 'asha',
  patientContext?: { name: string; age: number; vitals?: string; diagnosis?: string }
): Promise<AIMessage> => {
  const timestamp = new Date().toISOString();

  const context = [
    `The user's role is ${role}.`,
    patientContext
      ? `Patient context: ${patientContext.name}, age ${patientContext.age}` +
        (patientContext.vitals ? `, vitals: ${patientContext.vitals}` : '') +
        (patientContext.diagnosis ? `, working diagnosis: ${patientContext.diagnosis}` : '')
      : '',
  ].filter(Boolean).join(' ');

  try {
    const result = await backendApi.askAssistant(query, context || undefined);

    if (!result.available || !result.answer) {
      return {
        sender: 'assistant',
        text:
          result.answer ||
          'The AI assistant is not configured on this server yet. An administrator needs to set AI_PROVIDER and the matching API key in the backend environment.',
        timestamp,
      };
    }

    return {
      sender: 'assistant',
      text: result.answer,
      timestamp,
      disclaimer: result.disclaimer,
    };
  } catch (err) {
    return {
      sender: 'assistant',
      text:
        err instanceof Error
          ? `The assistant could not answer right now: ${err.message}`
          : 'The assistant could not answer right now.',
      timestamp,
    };
  }
};
