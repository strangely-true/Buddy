import { supabase } from './supabase'

export interface ConversationData {
  id?: string
  session_id: string
  user_id: string
  title: string
  topic_analysis?: string
  content_type?: string
  status?: string
  total_messages?: number
  duration_seconds?: number
  created_at?: string
  updated_at?: string
}

export interface ConversationMessage {
  id?: string
  conversation_id: string
  speaker_id: string
  speaker_name: string
  message_content: string
  message_type: 'ai' | 'user' | 'system'
  timestamp?: string
  audio_duration?: number
  sequence_number?: number
}

export class ConversationService {
  // Create a new conversation
  static async createConversation(data: ConversationData): Promise<ConversationData | null> {
    try {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
          session_id: data.session_id,
          user_id: data.user_id,
          title: data.title,
          topic_analysis: data.topic_analysis,
          content_type: data.content_type || 'text prompt',
          status: 'active',
          total_messages: 0,
          duration_seconds: 0
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating conversation:', error)
        return null
      }

      return conversation
    } catch (error) {
      console.error('Error in createConversation:', error)
      return null
    }
  }

  // Get conversation by session ID
  static async getConversationBySessionId(sessionId: string): Promise<ConversationData | null> {
    try {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('session_id', sessionId)
        .single()

      if (error) {
        console.error('Error getting conversation:', error)
        return null
      }

      return conversation
    } catch (error) {
      console.error('Error in getConversationBySessionId:', error)
      return null
    }
  }

  // Get user's conversations
  static async getUserConversations(userId: string): Promise<ConversationData[]> {
    try {
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error getting user conversations:', error)
        return []
      }

      return conversations || []
    } catch (error) {
      console.error('Error in getUserConversations:', error)
      return []
    }
  }

  // Add message to conversation
  static async addMessage(message: ConversationMessage): Promise<ConversationMessage | null> {
    try {
      // Get current message count for sequence number
      const { count } = await supabase
        .from('conversation_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', message.conversation_id)

      const { data: newMessage, error } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: message.conversation_id,
          speaker_id: message.speaker_id,
          speaker_name: message.speaker_name,
          message_content: message.message_content,
          message_type: message.message_type,
          audio_duration: message.audio_duration || 0,
          sequence_number: (count || 0) + 1
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding message:', error)
        return null
      }

      // Update conversation message count
      await this.updateConversationStats(message.conversation_id)

      return newMessage
    } catch (error) {
      console.error('Error in addMessage:', error)
      return null
    }
  }

  // Get conversation messages
  static async getConversationMessages(conversationId: string): Promise<ConversationMessage[]> {
    try {
      const { data: messages, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('sequence_number', { ascending: true })

      if (error) {
        console.error('Error getting messages:', error)
        return []
      }

      return messages || []
    } catch (error) {
      console.error('Error in getConversationMessages:', error)
      return []
    }
  }

  // Update conversation status
  static async updateConversationStatus(sessionId: string, status: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('session_id', sessionId)

      if (error) {
        console.error('Error updating conversation status:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in updateConversationStatus:', error)
      return false
    }
  }

  // Update conversation statistics
  static async updateConversationStats(conversationId: string): Promise<boolean> {
    try {
      // Get message count
      const { count } = await supabase
        .from('conversation_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)

      // Get total audio duration
      const { data: messages } = await supabase
        .from('conversation_messages')
        .select('audio_duration')
        .eq('conversation_id', conversationId)

      const totalDuration = messages?.reduce((sum, msg) => sum + (msg.audio_duration || 0), 0) || 0

      const { error } = await supabase
        .from('conversations')
        .update({ 
          total_messages: count || 0,
          duration_seconds: Math.floor(totalDuration / 1000),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

      if (error) {
        console.error('Error updating conversation stats:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in updateConversationStats:', error)
      return false
    }
  }

  // Delete conversation
  static async deleteConversation(sessionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('session_id', sessionId)

      if (error) {
        console.error('Error deleting conversation:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in deleteConversation:', error)
      return false
    }
  }

  // Generate conversation title from content
  static generateConversationTitle(content: string, contentType: string): string {
    const maxLength = 60
    
    if (contentType === 'multimodal') {
      return 'Multimodal Analysis Discussion'
    }
    
    // Extract first meaningful sentence or phrase
    const sentences = content.split(/[.!?]+/)
    const firstSentence = sentences[0]?.trim()
    
    if (firstSentence && firstSentence.length <= maxLength) {
      return firstSentence
    }
    
    // Truncate and add ellipsis
    const truncated = content.substring(0, maxLength).trim()
    const lastSpace = truncated.lastIndexOf(' ')
    
    if (lastSpace > maxLength * 0.7) {
      return truncated.substring(0, lastSpace) + '...'
    }
    
    return truncated + '...'
  }
}