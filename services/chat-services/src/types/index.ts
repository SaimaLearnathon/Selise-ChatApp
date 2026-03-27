// ─── Socket Auth ───────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'admin';

export interface SocketUser {
  userId:  string;
  email:   string;
  role:    UserRole;
}

// ─── Message Types ─────────────────────────────────────────────────────────────

export interface IMessage {
  conversationId: string;
  senderId:       string;
  senderEmail:    string;
  content:        string;
  createdAt:      Date;
}

// ─── Event Payloads ────────────────────────────────────────────────────────────

export interface SendMessagePayload {
  conversationId: string;
  content:        string;
}

export interface JoinConversationPayload {
  conversationId: string;
}