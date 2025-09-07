import type { ConversationSummary } from './dialogueTrackingAgent';
import type { DialogueTrackingResponse } from '$lib/ai/config/ResponseSchemas';

// ========================================
// SYSTEM PROMPTS
// ========================================

/**
 * System prompt for conversation similarity checking
 */
export const SIMILARITY_CHECK_SYSTEM_PROMPT = [
  'You are a Dialogue Tracking Agent responsible for preventing repetitive conversations in an AI RPG game.',
  'Your task is to analyze planned conversation content against previous conversation history to detect similarities.',
  '',
  '🎯 ANALYSIS OBJECTIVES:',
  '- Detect if the planned conversation covers similar topics to previous conversations',
  '- Identify if the same characters are discussing the same subjects again',
  '- Determine if the conversation would feel repetitive to the player',
  '- Suggest alternative approaches to make conversations fresh and engaging',
  '',
  '🔍 SIMILARITY CRITERIA:',
  '- HIGH SIMILARITY (0.8-1.0): Same characters discussing very similar topics with similar outcomes',
  '- MEDIUM SIMILARITY (0.5-0.7): Similar topics but different context, participants, or outcomes',
  '- LOW SIMILARITY (0.2-0.4): Some overlapping elements but substantially different conversation',
  '- NO SIMILARITY (0.0-0.1): Completely different conversation topics or contexts',
  '',
  '✅ ACCEPTABLE REPETITION:',
  '- Brief acknowledgments or greetings between characters who know each other',
  '- Follow-up conversations that build upon previous discussions',
  '- New information or developments related to previously discussed topics',
  '',
  '❌ UNACCEPTABLE REPETITION:',
  '- Exact same conversations happening again without narrative purpose',
  '- Characters re-explaining information they\'ve already shared',
  '- Identical introductions or first-meeting dialogues repeating',
  '',
  'Generate structured response with similarity analysis and recommendations.'
].join('\n');

/**
 * System prompt for conversation extraction from story content
 */
export const EXTRACTION_SYSTEM_PROMPT = [
  'You are a Conversation Extraction Agent responsible for identifying and summarizing dialogue content from story text.',
  'Your task is to extract meaningful conversation information that can be used to prevent future repetitive dialogues.',
  '',
  '🎯 EXTRACTION OBJECTIVES:',
  '- Identify if the story content contains significant character dialogue',
  '- Extract conversation participants, topics, and key points',
  '- Summarize the outcome or resolution of the conversation',
  '- Generate a unique conversation identifier',
  '',
  '🔍 WHAT CONSTITUTES A SIGNIFICANT CONVERSATION:',
  '- Character interactions with meaningful dialogue (not just actions)',
  '- Information exchange between characters',
  '- Relationship developments or revelations',
  '- Plot-relevant discussions',
  '- Character introductions or first meetings',
  '',
  '❌ WHAT TO IGNORE:',
  '- Pure action sequences without dialogue',
  '- Internal monologue or narrator descriptions',
  '- Brief acknowledgments or single-word responses',
  '- Combat descriptions without character interaction',
  '',
  'Generate structured conversation summary or null if no significant conversation found.'
].join('\n');

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Returns the system prompt for conversation similarity checking
 */
export function buildSimilarityCheckPrompt(): string {
  return SIMILARITY_CHECK_SYSTEM_PROMPT;
}

/**
 * Builds the user message for conversation similarity checking
 */
export function buildSimilarityCheckUserMessage(
  plannedConversation: string,
  relevantConversations: ConversationSummary[],
  currentParticipants: string[]
): string {
  const conversationHistoryText = relevantConversations.map((conv, index) =>
    `CONVERSATION ${index + 1}:\n` +
    `- Participants: ${conv.participants.join(', ')}\n` +
    `- Topics: ${conv.topics.join(', ')}\n` +
    `- Key Points: ${conv.key_points.join('; ')}\n` +
    `- Outcome: ${conv.outcome}\n` +
    `- Context: ${conv.temporal_context || 'Not specified'}\n`
  ).join('\n');

  return [
    'PLANNED CONVERSATION TO ANALYZE:',
    plannedConversation,
    '',
    'CURRENT PARTICIPANTS:',
    currentParticipants.join(', '),
    '',
    'PREVIOUS RELEVANT CONVERSATIONS:',
    conversationHistoryText,
    '',
    'Analyze the planned conversation against the previous conversations and provide similarity assessment.'
  ].join('\n');
}

/**
 * Returns the system prompt for conversation extraction
 */
export function buildExtractionPrompt(): string {
  return EXTRACTION_SYSTEM_PROMPT;
}

/**
 * Builds the user message for conversation extraction from story content
 */
export function buildExtractionUserMessage(
  storyContent: string,
  gameStateId: number,
  temporalContext?: string
): string {
  return `STORY CONTENT TO ANALYZE:\n${storyContent}\n\nGAME_STATE_ID: ${gameStateId}\nTEMPORAL_CONTEXT: ${temporalContext || 'Not specified'}`;
}

/**
 * Returns a fallback result when similarity check fails
 */
export function getFallbackSimilarityResult(): DialogueTrackingResponse {
  return {
    is_similar_conversation: false,
    similarity_score: 0.0,
    similarity_explanation: "Unable to analyze similarity due to technical error. Allowing conversation to proceed."
  };
}
