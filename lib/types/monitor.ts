// TypeScript types for Monitor Tab components

// Main conversation type (matches backend)
export interface Conversation {
  _id: string;
  clientPhoneNumber: string;
  status: 'active' | 'closed' | 'archived';
  startedAt: string;
  lastMessageAt: string;
  messageCount: number;
  whatsappPhoneNumberId?: string;
  metadata?: {
    clientName?: string;
    company?: string;
    tags?: string[];
    notes?: string;
    flagged?: boolean;
  };
}

// Main message type (matches backend)
export interface Message {
  _id: string;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  messageType: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'contact' | 'template';
  content: {
    text?: string;
    mediaUrl?: string;
    mediaType?: string;
    fileName?: string;
    fileSize?: number;
    location?: {
      latitude: number;
      longitude: number;
      name?: string;
      address?: string;
    };
    contact?: {
      name: string;
      phoneNumber: string;
    };
    template?: {
      name: string;
      language: string;
      parameters?: string[];
      flowId?: string;
      flowName?: string;
    };
  };
  status: 'sent' | 'delivered' | 'read' | 'failed';
  statusTimestamp: string;
  timestamp: string;
  metadata?: {
    originalMessageId?: string;
    isReply?: boolean;
    replyToMessageId?: string;
    isForwarded?: boolean;
    forwardedFrom?: string;
    errorCode?: string;
    errorMessage?: string;
    errorType?: 'quality_policy' | 'technical';
    retryCount?: number;
  };
}

export interface ConversationFilters {
  status?: ('active' | 'closed' | 'archived')[];
  startDate?: string;
  endDate?: string;
  search?: string;
  tags?: string[];
  templateName?: string;
  messageType?: string;
  hasResponse?: boolean;
  sortBy?: 'startedAt' | 'lastMessageAt' | 'messageCount';
  sortOrder?: 'asc' | 'desc';
}

export interface ConversationListItem {
  _id: string;
  clientPhoneNumber: string;
  status: 'active' | 'closed' | 'archived';
  startedAt: string;
  lastMessageAt: string;
  messageCount: number;
  whatsappPhoneNumberId?: string;
  metadata?: {
    clientName?: string;
    company?: string;
    tags?: string[];
    notes?: string;
    flagged?: boolean;
  };
  lastMessage?: {
    content: string;
    direction: 'inbound' | 'outbound';
    status: 'sent' | 'delivered' | 'read' | 'failed';
    timestamp: string;
  };
  unreadCount?: number;
}

export interface MessageBubble {
  _id: string;
  direction: 'inbound' | 'outbound';
  messageType: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'contact' | 'template';
  content: {
    text?: string;
    mediaUrl?: string;
    mediaType?: string;
    fileName?: string;
    fileSize?: number;
    location?: {
      latitude: number;
      longitude: number;
      name?: string;
      address?: string;
    };
    contact?: {
      name: string;
      phoneNumber: string;
    };
    template?: {
      name: string;
      language: string;
      parameters?: string[];
      flowId?: string;
      flowName?: string;
    };
  };
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'sending';
  statusTimestamp: string;
  timestamp: string;
  metadata?: {
    originalMessageId?: string;
    isReply?: boolean;
    replyToMessageId?: string;
    isForwarded?: boolean;
    forwardedFrom?: string;
    errorCode?: string;
    errorMessage?: string;
    errorType?: 'quality_policy' | 'technical';
    retryCount?: number;
  };
}

export interface MessageStatusIndicatorProps {
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'sending';
  timestamp?: string;
  className?: string;
  errorMessage?: string;
  errorCode?: string;
  errorType?: 'quality_policy' | 'technical';
}

export interface ConversationMetadata {
  clientName?: string;
  company?: string;
  tags?: string[];
  notes?: string;
  flagged?: boolean;
}

export interface ConversationStats {
  totalMessages: number;
  startedAt: string;
  lastMessageAt: string;
  avgResponseTime?: number;
  customerResponseCount?: number;
}

export interface ReplyInputProps {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export interface ConversationFiltersProps {
  filters: ConversationFilters;
  onFiltersChange: (filters: ConversationFilters) => void;
  onClearFilters: () => void;
  availableTags?: string[];
  availableTemplates?: string[];
  className?: string;
}

export interface ConversationListProps {
  conversations: ConversationListItem[];
  selectedConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  className?: string;
}

export interface MessageThreadProps {
  messages: MessageBubble[];
  conversationId?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  className?: string;
}

export interface MetadataPanelProps {
  conversation: {
    _id: string;
    clientPhoneNumber: string;
    status: 'active' | 'closed' | 'archived';
    metadata?: ConversationMetadata;
  };
  stats?: ConversationStats;
  onUpdateMetadata: (metadata: Partial<ConversationMetadata>) => Promise<void>;
  onFlagConversation: (flagged: boolean) => Promise<void>;
  onArchiveConversation: () => Promise<void>;
  onCloseConversation: () => Promise<void>;
  className?: string;
}

export interface MonitorPageState {
  conversations: ConversationListItem[];
  selectedConversation?: ConversationListItem;
  messages: MessageBubble[];
  filters: ConversationFilters;
  loading: {
    conversations: boolean;
    messages: boolean;
    sending: boolean;
  };
  pagination: {
    conversations: { limit: number; skip: number; hasMore: boolean };
    messages: { limit: number; skip: number; hasMore: boolean };
  };
  searchQuery: string;
  showFilters: boolean;
  showMetadata: boolean;
}

export interface MonitorPageActions {
  setSelectedConversation: (conversation: ConversationListItem | undefined) => void;
  setFilters: (filters: ConversationFilters) => void;
  setSearchQuery: (query: string) => void;
  setShowFilters: (show: boolean) => void;
  setShowMetadata: (show: boolean) => void;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  updateMetadata: (metadata: Partial<ConversationMetadata>) => Promise<void>;
  flagConversation: (flagged: boolean) => Promise<void>;
  archiveConversation: () => Promise<void>;
  closeConversation: () => Promise<void>;
}

// Utility types for component state management
export type ConversationStatus = 'active' | 'closed' | 'archived';
export type MessageDirection = 'inbound' | 'outbound';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'sending';
export type MessageType = 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'contact' | 'template';

// Event handlers
export type ConversationSelectHandler = (conversationId: string) => void;
export type MessageSendHandler = (text: string) => Promise<void>;
export type MetadataUpdateHandler = (metadata: Partial<ConversationMetadata>) => Promise<void>;
export type FilterChangeHandler = (filters: ConversationFilters) => void;
export type SearchHandler = (query: string) => void;

// API response types
export interface ConversationsApiResponse {
  conversations: ConversationListItem[];
  totalConversations: number;
  hasMore: boolean;
  pagination: {
    limit: number;
    skip: number;
    total: number;
  };
}

export interface MessagesApiResponse {
  conversation: {
    _id: string;
    clientPhoneNumber: string;
    status: ConversationStatus;
    metadata?: ConversationMetadata;
  };
  messages: MessageBubble[];
  totalMessages: number;
  hasMore: boolean;
}

// Error types
export interface MonitorError {
  code: string;
  message: string;
  details?: any;
}

export interface ApiError extends MonitorError {
  statusCode: number;
  endpoint: string;
}

// Loading states
export interface LoadingState {
  conversations: boolean;
  messages: boolean;
  sending: boolean;
  updating: boolean;
}

// Polling configuration
export interface PollingConfig {
  enabled: boolean;
  interval: number; // milliseconds
  maxRetries: number;
  retryDelay: number; // milliseconds
}
