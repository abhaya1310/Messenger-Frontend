"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  fetchConversations,
  fetchConversationMessages,
  updateConversationMetadata,
  sendTextMessage
} from "@/lib/api";
import {
  Conversation,
  Message,
  ConversationFilters,
  ConversationListItem,
  MessageBubble,
  ConversationMetadata
} from "@/lib/types/monitor";
import { ConversationList } from "@/components/monitor/conversation-list";
import { MessageThread } from "@/components/monitor/message-thread";
import { ReplyInput } from "@/components/monitor/reply-input";
import { MetadataPanel } from "@/components/monitor/metadata-panel";
import { ConversationFilters as ConversationFiltersComponent } from "@/components/monitor/conversation-filters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  MessageSquare,
  Users,
  Filter,
  Settings,
  RefreshCw,
  Menu,
  X,
  Phone,
  Flag,
  Archive,
  Clock,
  Home
} from "lucide-react";

export default function MonitorPage() {
  // State
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [messages, setMessages] = useState<MessageBubble[]>([]);
  const [filters, setFilters] = useState<ConversationFilters>({});
  const [monitorError, setMonitorError] = useState<string | null>(null);
  const [orgNoWhatsapp, setOrgNoWhatsapp] = useState(false);
  const [loading, setLoading] = useState({
    conversations: false,
    messages: false,
    sending: false,
    updating: false
  });
  const [pagination, setPagination] = useState({
    conversations: { limit: 20, skip: 0, hasMore: true },
    messages: { limit: 50, skip: 0, hasMore: true }
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pollingIntervalRef = useRef<number | null>(null);
  const messagesLengthRef = useRef(0);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    messagesLengthRef.current = messages.length;
  }, [messages.length]);

  // Helper function to deduplicate conversations by _id
  const deduplicateConversations = useCallback((conversations: ConversationListItem[]): ConversationListItem[] => {
    const seen = new Set<string>();
    return conversations.filter(conv => {
      const id = String(conv._id);
      if (seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
  }, []);

  // Load conversations
  const loadConversations = useCallback(async (reset = false) => {
    if (loading.conversations) return;

    setLoading(prev => ({ ...prev, conversations: true }));

    try {
      setMonitorError(null);
      const skip = reset ? 0 : pagination.conversations.skip;
      const response = await fetchConversations({
        ...filters,
        limit: pagination.conversations.limit,
        skip
      });

      setOrgNoWhatsapp(false);

      // Deduplicate conversations before setting state
      const deduplicatedNew = deduplicateConversations(response.conversations);

      if (reset) {
        setConversations(deduplicatedNew);
      } else {
        setConversations(prev => {
          // Combine existing and new, then deduplicate
          const combined = [...prev, ...deduplicatedNew];
          return deduplicateConversations(combined);
        });
      }

      setPagination(prev => ({
        ...prev,
        conversations: {
          ...prev.conversations,
          skip: skip + deduplicatedNew.length,
          hasMore: response.hasMore
        }
      }));
    } catch (error) {
      const e: any = error;
      const reasonCode = e?.reasonCode;
      const status = e?.status;

      if (status === 409 && reasonCode === 'ORG_NO_WHATSAPP_NUMBER') {
        setOrgNoWhatsapp(true);
        setConversations([]);
        setSelectedConversation(null);
        setMessages([]);
        setPagination(prev => ({
          ...prev,
          conversations: { ...prev.conversations, skip: 0, hasMore: false },
        }));
        return;
      }

      setMonitorError(e?.message || 'Failed to load conversations');
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(prev => ({ ...prev, conversations: false }));
    }
  }, [filters, pagination.conversations, loading.conversations, deduplicateConversations]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (conversationId: string, reset = false) => {
    if (loading.messages) return;

    setLoading(prev => ({ ...prev, messages: true }));

    try {
      setMonitorError(null);
      const conversation = conversations.find(c => c._id === conversationId);
      if (!conversation) return;

      const skip = reset ? 0 : pagination.messages.skip;
      const response = await fetchConversationMessages(conversation.clientPhoneNumber, {
        limit: pagination.messages.limit,
        skip
      });

      setOrgNoWhatsapp(false);

      if (reset) {
        setMessages(response.messages);
      } else {
        setMessages(prev => [...response.messages, ...prev]);
      }

      setPagination(prev => ({
        ...prev,
        messages: {
          ...prev.messages,
          skip: skip + response.messages.length,
          hasMore: response.hasMore
        }
      }));
    } catch (error) {
      const e: any = error;
      const reasonCode = e?.reasonCode;
      const status = e?.status;

      if (status === 409 && reasonCode === 'ORG_NO_WHATSAPP_NUMBER') {
        setOrgNoWhatsapp(true);
        setSelectedConversation(null);
        setMessages([]);
        return;
      }

      if (status === 403) {
        setMonitorError(e?.message || 'You do not have access to this conversation.');
        setSelectedConversation(null);
        setMessages([]);
        return;
      }

      setMonitorError(e?.message || 'Failed to load messages');
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(prev => ({ ...prev, messages: false }));
    }
  }, [conversations, pagination.messages, loading.messages]);

  // Send message
  const handleSendMessage = async (text: string) => {
    if (!selectedConversation) return;

    setLoading(prev => ({ ...prev, sending: true }));

    try {
      const response = await sendTextMessage(selectedConversation.clientPhoneNumber, text);

      // Add optimistic message to UI
      const optimisticMessage: MessageBubble = {
        _id: `temp-${Date.now()}`,
        direction: 'outbound',
        messageType: 'text',
        content: { text },
        status: 'sending',
        statusTimestamp: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        metadata: {}
      };

      setMessages(prev => [...prev, optimisticMessage]);

      // Update message status when we get the real message ID
      if (response.messageId) {
        setMessages(prev => prev.map(msg =>
          msg._id === optimisticMessage._id
            ? { ...msg, _id: response.messageId, status: 'sent' }
            : msg
        ));
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg._id !== `temp-${Date.now()}`));
    } finally {
      setLoading(prev => ({ ...prev, sending: false }));
    }
  };

  // Update conversation metadata
  const handleUpdateMetadata = async (metadata: Partial<ConversationMetadata>) => {
    if (!selectedConversation) return;

    setLoading(prev => ({ ...prev, updating: true }));

    try {
      setMonitorError(null);
      await updateConversationMetadata(selectedConversation.clientPhoneNumber, metadata);

      setOrgNoWhatsapp(false);

      // Update local state
      setSelectedConversation(prev => prev ? {
        ...prev,
        metadata: { ...prev.metadata, ...metadata }
      } : null);

      setConversations(prev => {
        const updated = prev.map(conv =>
          conv._id === selectedConversation._id
            ? { ...conv, metadata: { ...conv.metadata, ...metadata } }
            : conv
        );
        // Defensive deduplication after update
        return deduplicateConversations(updated);
      });
    } catch (error) {
      const e: any = error;
      const reasonCode = e?.reasonCode;
      const status = e?.status;
      if (status === 409 && reasonCode === 'ORG_NO_WHATSAPP_NUMBER') {
        setOrgNoWhatsapp(true);
        setSelectedConversation(null);
        setMessages([]);
        return;
      }
      if (status === 403) {
        setMonitorError(e?.message || 'You do not have access to update this conversation.');
        setSelectedConversation(null);
        setMessages([]);
        return;
      }
      setMonitorError(e?.message || 'Failed to update metadata');
      console.error('Failed to update metadata:', error);
    } finally {
      setLoading(prev => ({ ...prev, updating: false }));
    }
  };

  // Flag conversation
  const handleFlagConversation = async (flagged: boolean) => {
    await handleUpdateMetadata({ flagged });
  };

  // Archive conversation
  const handleArchiveConversation = async () => {
    // This would call an archive endpoint
    console.log('Archive conversation:', selectedConversation?._id);
  };

  // Close conversation
  const handleCloseConversation = async () => {
    // This would call a close endpoint
    console.log('Close conversation:', selectedConversation?._id);
  };

  // Handle conversation selection
  const handleSelectConversation = (conversationId: string) => {
    const conversation = conversations.find(c => c._id === conversationId);
    if (conversation) {
      setSelectedConversation(conversation);
      loadMessages(conversationId, true);
      if (isMobile) {
        setShowMetadata(false);
      }
    }
  };

  // Handle filter changes
  const handleFiltersChange = (newFilters: ConversationFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({
      ...prev,
      conversations: { ...prev.conversations, skip: 0, hasMore: true }
    }));
  };

  // Polling for new messages
  useEffect(() => {
    if (!selectedConversation) return;

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    const pollMessages = async () => {
      try {
        const response = await fetchConversationMessages(selectedConversation.clientPhoneNumber, {
          limit: 50,
          skip: 0
        });

        setOrgNoWhatsapp(false);

        // Check if we have new messages
        if (response.messages.length > messagesLengthRef.current) {
          setMessages(response.messages);
        }
      } catch (error) {
        const e: any = error;
        const reasonCode = e?.reasonCode;
        const status = e?.status;
        if (status === 409 && reasonCode === 'ORG_NO_WHATSAPP_NUMBER') {
          setOrgNoWhatsapp(true);
          setSelectedConversation(null);
          setMessages([]);
          return;
        }
        if (status === 403) {
          setSelectedConversation(null);
          setMessages([]);
          return;
        }
        console.error('Failed to poll messages:', error);
      }
    };

    const interval = window.setInterval(pollMessages, 10000); // Poll every 10 seconds
    pollingIntervalRef.current = interval;

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [selectedConversation]);

  // Load conversations on mount and when filters change
  useEffect(() => {
    loadConversations(true);
  }, [filters]);

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="text-gray-500 hover:text-gray-700 transition-colors">
              <Home className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-semibold">Monitor Conversations</h1>
            <Badge variant="outline" className="text-xs">
              {conversations.length} conversations
            </Badge>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="text-gray-500"
            >
              <Filter className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadConversations(true)}
              disabled={loading.conversations}
              className="text-gray-500"
            >
              <RefreshCw className={cn("h-4 w-4", loading.conversations && "animate-spin")} />
            </Button>

            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMetadata(!showMetadata)}
                className="text-gray-500"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {orgNoWhatsapp ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          This organization has no WhatsApp phone number configured. Please add a phone number to view conversations.
        </div>
      ) : monitorError ? (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {monitorError}
        </div>
      ) : null}

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 p-4">
          <ConversationFiltersComponent
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={() => handleFiltersChange({})}
            availableTags={[]}
            availableTemplates={[]}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Layout */}
        {!isMobile && (
          <>
            {/* Conversation List */}
            <div className="w-80 border-r border-gray-200 bg-white">
              <ConversationList
                conversations={conversations}
                selectedConversationId={selectedConversation?._id}
                onSelectConversation={handleSelectConversation}
                onLoadMore={() => loadConversations(false)}
                hasMore={pagination.conversations.hasMore}
                loading={loading.conversations}
              />
            </div>

            {/* Message Thread */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  <div className="flex-1 overflow-hidden">
                    <MessageThread
                      messages={messages}
                      conversationId={selectedConversation._id}
                      onLoadMore={() => loadMessages(selectedConversation._id, false)}
                      hasMore={pagination.messages.hasMore}
                      loading={loading.messages}
                    />
                  </div>

                  <div className="border-t border-gray-200 p-4">
                    <ReplyInput
                      onSend={handleSendMessage}
                      disabled={selectedConversation.status !== 'active' || loading.sending}
                      placeholder="Type a message..."
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                    <p className="text-sm">
                      {orgNoWhatsapp
                        ? "No WhatsApp phone number configured for this organization"
                        : "Choose a conversation from the list to view messages"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Metadata Panel */}
            <div className="w-80 border-l border-gray-200 bg-white">
              {selectedConversation ? (
                <MetadataPanel
                  conversation={selectedConversation}
                  stats={{
                    totalMessages: selectedConversation.messageCount,
                    startedAt: selectedConversation.startedAt,
                    lastMessageAt: selectedConversation.lastMessageAt
                  }}
                  onUpdateMetadata={handleUpdateMetadata}
                  onFlagConversation={handleFlagConversation}
                  onArchiveConversation={handleArchiveConversation}
                  onCloseConversation={handleCloseConversation}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium mb-2">Customer Information</h3>
                    <p className="text-sm">Select a conversation to view customer details</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Mobile Layout */}
        {isMobile && (
          <div className="flex-1 flex flex-col">
            {!selectedConversation ? (
              /* Conversation List on Mobile */
              <ConversationList
                conversations={conversations}
                selectedConversationId={undefined}
                onSelectConversation={handleSelectConversation}
                onLoadMore={() => loadConversations(false)}
                hasMore={pagination.conversations.hasMore}
                loading={loading.conversations}
              />
            ) : showMetadata ? (
              /* Metadata Panel on Mobile */
              <div className="flex-1 overflow-auto">
                <div className="p-4 border-b border-gray-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMetadata(false)}
                    className="mb-2"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Back to Messages
                  </Button>
                </div>
                <MetadataPanel
                  conversation={selectedConversation}
                  stats={{
                    totalMessages: selectedConversation.messageCount,
                    startedAt: selectedConversation.startedAt,
                    lastMessageAt: selectedConversation.lastMessageAt
                  }}
                  onUpdateMetadata={handleUpdateMetadata}
                  onFlagConversation={handleFlagConversation}
                  onArchiveConversation={handleArchiveConversation}
                  onCloseConversation={handleCloseConversation}
                />
              </div>
            ) : (
              /* Message Thread on Mobile */
              <>
                <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedConversation(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div>
                      <h3 className="font-medium">
                        {selectedConversation.metadata?.clientName || selectedConversation.clientPhoneNumber}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {selectedConversation.metadata?.company || selectedConversation.clientPhoneNumber}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMetadata(true)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex-1 overflow-hidden">
                  <MessageThread
                    messages={messages}
                    conversationId={selectedConversation._id}
                    onLoadMore={() => loadMessages(selectedConversation._id, false)}
                    hasMore={pagination.messages.hasMore}
                    loading={loading.messages}
                  />
                </div>

                <div className="border-t border-gray-200 p-4">
                  <ReplyInput
                    onSend={handleSendMessage}
                    disabled={selectedConversation.status !== 'active' || loading.sending}
                    placeholder="Type a message..."
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
