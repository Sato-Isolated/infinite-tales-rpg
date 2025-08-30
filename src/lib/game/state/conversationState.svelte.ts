import type { ConversationSummary } from '$lib/ai/agents/dialogueTrackingAgent';

/**
 * Conversation state for managing dialogue history and deduplication
 */
export interface ConversationState {
  /** Array of conversation summaries from the game */
  conversation_history: ConversationSummary[];
  /** Maximum number of conversations to keep in memory */
  max_conversations: number;
  /** Whether dialogue deduplication is enabled */
  deduplication_enabled: boolean;
  /** Similarity threshold for considering conversations as duplicates (0.0-1.0) */
  similarity_threshold: number;
}

/**
 * Default conversation state
 */
const defaultConversationState: ConversationState = {
  conversation_history: [],
  max_conversations: 50, // Keep last 50 conversations for memory management
  deduplication_enabled: true,
  similarity_threshold: 0.7 // Consider conversations with 70%+ similarity as duplicates
};

/**
 * Conversation State Manager - Simplified version
 * 
 * Manages only the essential conversation history for dialogue tracking.
 */
export class ConversationStateManager {
  private state: ConversationState;
  private readonly storageKey = 'conversationState';

  constructor() {
    this.state = this.loadFromStorage();
  }

  /**
   * Load conversation state from localStorage
   */
  private loadFromStorage(): ConversationState {
    if (typeof window === 'undefined') {
      return { ...defaultConversationState };
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...defaultConversationState,
          ...parsed
        };
      }
    } catch (error) {
      console.warn('Failed to load conversation state from localStorage:', error);
    }

    return { ...defaultConversationState };
  }

  /**
   * Save conversation state to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (error) {
      console.warn('Failed to save conversation state to localStorage:', error);
    }
  }

  /**
   * Add a new conversation to the history
   * @param conversation The conversation summary to add
   */
  addConversation(conversation: ConversationSummary): void {
    const currentHistory = [...this.state.conversation_history];

    // Add the new conversation
    currentHistory.push(conversation);

    // Maintain the maximum number of conversations
    while (currentHistory.length > this.state.max_conversations) {
      currentHistory.shift(); // Remove oldest conversation
    }

    // Update the state
    this.state = {
      ...this.state,
      conversation_history: currentHistory
    };

    // Persist to localStorage
    this.saveToStorage();
  }

  /**
   * Get recent conversations for similarity checking
   * @param count Number of recent conversations to retrieve
   * @returns Array of recent conversation summaries
   */
  getRecentConversations(count: number = 10): ConversationSummary[] {
    const history = this.state.conversation_history;
    return history.slice(-count);
  }

  /**
   * Check if dialogue deduplication is enabled
   * @returns Boolean indicating if deduplication is active
   */
  isDeduplicationEnabled(): boolean {
    return this.state.deduplication_enabled;
  }

  /**
   * Get the similarity threshold for duplicate detection
   * @returns The similarity threshold (0.0-1.0)
   */
  getSimilarityThreshold(): number {
    return this.state.similarity_threshold;
  }

  /**
   * Clear all conversation history (for debugging or reset)
   */
  clearConversationHistory(): void {
    this.state = {
      ...this.state,
      conversation_history: []
    };

    this.saveToStorage();
  }
}
