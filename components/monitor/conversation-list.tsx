"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ConversationListProps, ConversationListItem } from "@/lib/types/monitor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  Flag, 
  MessageSquare, 
  Clock, 
  User, 
  Building, 
  Tag,
  Loader2,
  ChevronDown,
  Filter
} from "lucide-react";

export function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onLoadMore,
  hasMore = false,
  loading = false,
  className
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;

    const query = searchQuery.toLowerCase();
    return conversations.filter(conv => {
      const phoneMatch = conv.clientPhoneNumber.toLowerCase().includes(query);
      const nameMatch = conv.metadata?.clientName?.toLowerCase().includes(query);
      const companyMatch = conv.metadata?.company?.toLowerCase().includes(query);
      const lastMessageMatch = conv.lastMessage?.content.toLowerCase().includes(query);
      
      return phoneMatch || nameMatch || companyMatch || lastMessageMatch;
    });
  }, [conversations, searchQuery]);

  const handleLoadMore = async () => {
    if (!onLoadMore || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      await onLoadMore();
    } finally {
      setIsLoadingMore(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  const getConversationDisplayName = (conv: ConversationListItem) => {
    if (conv.metadata?.clientName) {
      return conv.metadata.clientName;
    }
    return conv.clientPhoneNumber;
  };

  const getConversationSubtitle = (conv: ConversationListItem) => {
    if (conv.metadata?.company) {
      return conv.metadata.company;
    }
    return conv.clientPhoneNumber;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'archived': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderConversationItem = (conv: ConversationListItem) => {
    const isSelected = selectedConversationId === conv._id;
    const isFlagged = conv.metadata?.flagged;
    const hasUnread = conv.unreadCount && conv.unreadCount > 0;
    const lastMessage = conv.lastMessage;

    return (
      <div
        key={String(conv._id)}
        onClick={() => onSelectConversation(conv._id)}
        className={cn(
          "flex items-center space-x-3 p-3 cursor-pointer border-b border-gray-100",
          "hover:bg-gray-50 transition-colors",
          isSelected && "bg-blue-50 border-blue-200",
          isFlagged && "bg-yellow-50 border-yellow-200"
        )}
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm",
            isFlagged ? "bg-yellow-500" : "bg-green-500"
          )}>
            {conv.metadata?.clientName ? 
              conv.metadata.clientName.charAt(0).toUpperCase() : 
              conv.clientPhoneNumber.slice(-2)
            }
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {getConversationDisplayName(conv)}
              </h4>
              {isFlagged && (
                <Flag className="h-3 w-3 text-yellow-500" />
              )}
              {hasUnread && (
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">
                {formatTimestamp(conv.lastMessageAt)}
              </span>
              <Badge 
                variant="secondary" 
                className={cn("text-xs", getStatusColor(conv.status))}
              >
                {conv.status}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-500 truncate">
              {getConversationSubtitle(conv)}
            </p>
            <div className="flex items-center space-x-1">
              {conv.messageCount > 0 && (
                <span className="text-xs text-gray-400">
                  {conv.messageCount} msg{conv.messageCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Last Message Preview */}
          {lastMessage && (
            <div className="mt-1 flex items-center space-x-2">
              <div className={cn(
                "text-xs truncate flex-1",
                lastMessage.direction === 'inbound' ? "text-gray-600" : "text-gray-500"
              )}>
                {lastMessage.content}
              </div>
              {lastMessage.direction === 'outbound' && (
                <div className="flex-shrink-0">
                  <div className="flex items-center space-x-0.5">
                    {lastMessage.status === 'sent' && (
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    )}
                    {lastMessage.status === 'delivered' && (
                      <>
                        <div className="w-2 h-2 bg-gray-400 rounded-full" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      </>
                    )}
                    {lastMessage.status === 'read' && (
                      <>
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      </>
                    )}
                    {lastMessage.status === 'failed' && (
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {conv.metadata?.tags && conv.metadata.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {conv.metadata.tags.slice(0, 2).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {conv.metadata.tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{conv.metadata.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading && conversations.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="flex items-center space-x-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading conversations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-gray-500"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4"
          />
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Filters coming soon...
          </div>
        </div>
      )}

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-gray-100">
          {filteredConversations.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <div className="text-center">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <div className="text-sm">
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </div>
              </div>
            </div>
          ) : (
            filteredConversations.map(renderConversationItem)
          )}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="p-4 border-t border-gray-200">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="w-full"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Load More
                </>
              )}
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// Compact version for smaller spaces
export function CompactConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onLoadMore,
  hasMore = false,
  loading = false,
  className
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;

    const query = searchQuery.toLowerCase();
    return conversations.filter(conv => {
      const phoneMatch = conv.clientPhoneNumber.toLowerCase().includes(query);
      const nameMatch = conv.metadata?.clientName?.toLowerCase().includes(query);
      const companyMatch = conv.metadata?.company?.toLowerCase().includes(query);
      const lastMessageMatch = conv.lastMessage?.content.toLowerCase().includes(query);
      
      return phoneMatch || nameMatch || companyMatch || lastMessageMatch;
    });
  }, [conversations, searchQuery]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  const getConversationDisplayName = (conv: ConversationListItem) => {
    if (conv.metadata?.clientName) {
      return conv.metadata.clientName;
    }
    return conv.clientPhoneNumber;
  };

  if (loading && conversations.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-32", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-6 pr-2 text-xs h-8"
        />
      </div>

      {/* Conversations */}
      {filteredConversations.length === 0 ? (
        <div className="text-center text-gray-500 text-xs py-4">
          {searchQuery ? 'No matches' : 'No conversations'}
        </div>
      ) : (
        filteredConversations.map((conv) => {
          const isSelected = selectedConversationId === conv._id;
          const isFlagged = conv.metadata?.flagged;
          const hasUnread = conv.unreadCount && conv.unreadCount > 0;

          return (
            <div
              key={String(conv._id)}
              onClick={() => onSelectConversation(conv._id)}
              className={cn(
                "flex items-center space-x-2 p-2 cursor-pointer rounded-lg",
                "hover:bg-gray-50 transition-colors",
                isSelected && "bg-blue-50",
                isFlagged && "bg-yellow-50"
              )}
            >
              {/* Avatar */}
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium",
                isFlagged ? "bg-yellow-500" : "bg-green-500"
              )}>
                {conv.metadata?.clientName ? 
                  conv.metadata.clientName.charAt(0).toUpperCase() : 
                  conv.clientPhoneNumber.slice(-1)
                }
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <span className="text-xs font-medium truncate">
                      {getConversationDisplayName(conv)}
                    </span>
                    {isFlagged && <Flag className="h-2 w-2 text-yellow-500" />}
                    {hasUnread && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(conv.lastMessageAt)}
                  </span>
                </div>
                
                {conv.lastMessage && (
                  <div className="text-xs text-gray-500 truncate">
                    {conv.lastMessage.content}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Load More */}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onLoadMore}
          className="w-full text-xs"
        >
          Load More
        </Button>
      )}
    </div>
  );
}

