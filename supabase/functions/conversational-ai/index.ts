/*
  # ElevenLabs Conversational AI Edge Function
  
  This function handles the conversational AI integration with ElevenLabs
  using the dedicated conversational API key for security.
*/

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ConversationRequest {
  action: 'start' | 'send' | 'end'
  conversationId?: string
  message?: string
  agentId: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const ELEVENLABS_CONVERSATIONAL_API_KEY = Deno.env.get('ELEVENLABS_CONVERSATIONAL_API_KEY')
    
    if (!ELEVENLABS_CONVERSATIONAL_API_KEY) {
      throw new Error('ElevenLabs Conversational API key not configured')
    }

    const { action, conversationId, message, agentId }: ConversationRequest = await req.json()

    const baseUrl = 'https://api.elevenlabs.io/v1/convai/conversations'
    
    let response: Response
    let responseData: any

    switch (action) {
      case 'start':
        // Start a new conversation
        response = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'xi-api-key': ELEVENLABS_CONVERSATIONAL_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agent_id: agentId,
          }),
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Failed to start conversation: ${response.status} - ${errorText}`)
        }
        
        responseData = await response.json()
        break

      case 'send':
        // Send a message to existing conversation
        if (!conversationId || !message) {
          throw new Error('Conversation ID and message are required for send action')
        }
        
        response = await fetch(`${baseUrl}/${conversationId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': ELEVENLABS_CONVERSATIONAL_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_input: message,
          }),
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Failed to send message: ${response.status} - ${errorText}`)
        }
        
        responseData = await response.json()
        break

      case 'end':
        // End the conversation
        if (!conversationId) {
          throw new Error('Conversation ID is required for end action')
        }
        
        response = await fetch(`${baseUrl}/${conversationId}`, {
          method: 'DELETE',
          headers: {
            'xi-api-key': ELEVENLABS_CONVERSATIONAL_API_KEY,
          },
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Failed to end conversation: ${response.status} - ${errorText}`)
        }
        
        responseData = { success: true }
        break

      default:
        throw new Error(`Invalid action: ${action}`)
    }

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Conversational AI error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})