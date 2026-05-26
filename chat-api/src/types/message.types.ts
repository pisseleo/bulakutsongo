export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  media_type: 'image' | 'video' | 'document' | 'voice' | null;
  created_at: Date;
  updated_at: Date;
}

export interface SendMessageDto {
  conversationId: string;
  content?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document' | 'voice';
}