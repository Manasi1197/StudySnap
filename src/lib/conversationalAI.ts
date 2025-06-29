// ElevenLabs Conversational AI integration for StudySnap chatbot
import React from 'react';
import { supabase } from './supabase';

export interface ConversationMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

export interface ConversationState {
  conversationId: string | null;
  messages: ConversationMessage[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

export class ConversationalAI {
  private agentId: string;
  private conversationId: string | null = null;
  private onStateChange: (state: ConversationState) => void;
  private state: ConversationState;

  constructor(agentId: string, onStateChange: (state: ConversationState) => void) {
    this.agentId = agentId;
    this.onStateChange = onStateChange;
    this.state = {
      conversationId: null,
      messages: [],
      isConnected: false,
      isLoading: false,
      error: null,
    };
  }

  private updateState(updates: Partial<ConversationState>) {
    this.state = { ...this.state, ...updates };
    this.onStateChange(this.state);
  }

  private async callEdgeFunction(action: string, data: any = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/conversational-ai`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        agentId: this.agentId,
        conversationId: this.conversationId,
        ...data,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async startConversation(): Promise<void> {
    try {
      this.updateState({ isLoading: true, error: null });

      console.log('🤖 Starting conversation with agent:', this.agentId);
      
      const response = await this.callEdgeFunction('start');
      
      this.conversationId = response.conversation_id;
      
      this.updateState({
        conversationId: this.conversationId,
        isConnected: true,
        isLoading: false,
        messages: [{
          id: 'welcome',
          type: 'assistant',
          content: "Hi! I'm StudySnap, your AI study assistant. I'm here to help explain any academic topic in simple, easy-to-understand language. What would you like to learn about today?",
          timestamp: new Date(),
        }],
      });

      console.log('✅ Conversation started:', this.conversationId);
    } catch (error: any) {
      console.error('❌ Failed to start conversation:', error);
      this.updateState({
        isLoading: false,
        error: error.message || 'Failed to start conversation',
      });
    }
  }

  async sendMessage(message: string): Promise<void> {
    if (!this.conversationId) {
      throw new Error('No active conversation');
    }

    try {
      this.updateState({ isLoading: true, error: null });

      // Add user message to state immediately
      const userMessage: ConversationMessage = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: message,
        timestamp: new Date(),
      };

      this.updateState({
        messages: [...this.state.messages, userMessage],
      });

      console.log('📤 Sending message:', message);
      
      const response = await this.callEdgeFunction('send', { message });
      
      // Add assistant response
      const assistantMessage: ConversationMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: response.user_input || response.message || 'I received your message.',
        timestamp: new Date(),
        audioUrl: response.audio_url,
      };

      this.updateState({
        messages: [...this.state.messages, assistantMessage],
        isLoading: false,
      });

      console.log('✅ Message sent and response received');
    } catch (error: any) {
      console.error('❌ Failed to send message:', error);
      this.updateState({
        isLoading: false,
        error: error.message || 'Failed to send message',
      });
    }
  }

  async endConversation(): Promise<void> {
    if (!this.conversationId) {
      return;
    }

    try {
      console.log('🔚 Ending conversation:', this.conversationId);
      
      await this.callEdgeFunction('end');
      
      this.conversationId = null;
      this.updateState({
        conversationId: null,
        isConnected: false,
        messages: [],
        error: null,
      });

      console.log('✅ Conversation ended');
    } catch (error: any) {
      console.error('❌ Failed to end conversation:', error);
      // Still reset state even if API call fails
      this.conversationId = null;
      this.updateState({
        conversationId: null,
        isConnected: false,
        error: error.message || 'Failed to end conversation properly',
      });
    }
  }

  getState(): ConversationState {
    return this.state;
  }
}

// Hook for using conversational AI in React components
export function useConversationalAI(agentId: string) {
  const [state, setState] = React.useState<ConversationState>({
    conversationId: null,
    messages: [],
    isConnected: false,
    isLoading: false,
    error: null,
  });

  const [ai] = React.useState(() => new ConversationalAI(agentId, setState));

  React.useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (state.isConnected) {
        ai.endConversation();
      }
    };
  }, []);

  return {
    ...state,
    startConversation: () => ai.startConversation(),
    sendMessage: (message: string) => ai.sendMessage(message),
    endConversation: () => ai.endConversation(),
  };
}