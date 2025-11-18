"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { MessageThreadProps, MessageBubble } from "@/lib/types/monitor";
import { MessageStatusIndicator } from "./message-status-indicator";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ChevronUp, Calendar, Download, MapPin, Phone, FileText } from "lucide-react";

export function MessageThread({
  messages,
  conversationId,
  onLoadMore,
  hasMore = false,
  loading = false,
  className
}: MessageThreadProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showJumpToTop, setShowJumpToTop] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current && messages.length > 0) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages.length]);

  // Show jump to top button when scrolled up
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      setShowJumpToTop(scrollTop > 100);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

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
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Helper function to check if two dates are same day
  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate();
  };

  // Helper function to format date separator
  const formatDateSeparator = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (isSameDay(date, today)) {
      return 'Today';
    } else if (isSameDay(date, yesterday)) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  const renderMessageContent = (message: MessageBubble) => {
    const { content, messageType } = message;

    switch (messageType) {
      case 'text':
        return (
          <div className="whitespace-pre-wrap break-words">
            {content.text || '[Message content not available]'}
          </div>
        );
      
      case 'image':
        return (
          <div className="space-y-2">
            {content.mediaUrl && (
              <img 
                src={content.mediaUrl} 
                alt="Image" 
                className="max-w-full h-auto rounded-lg"
                loading="lazy"
              />
            )}
            {content.text && (
              <div className="whitespace-pre-wrap break-words">
                {content.text}
              </div>
            )}
          </div>
        );
      
      case 'document':
        return (
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <FileText className="h-8 w-8 text-blue-500" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">
                {content.fileName || 'Document'}
              </div>
              {content.fileSize && (
                <div className="text-xs text-gray-500">
                  {(content.fileSize / 1024).toFixed(1)} KB
                </div>
              )}
            </div>
            {content.mediaUrl && (
              <Button size="sm" variant="outline" asChild>
                <a href={content.mediaUrl} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        );
      
      case 'location':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <MapPin className="h-4 w-4 text-red-500" />
              <span className="font-medium">Location</span>
            </div>
            {content.location && (
              <div className="text-sm text-gray-600">
                {content.location.name && <div>{content.location.name}</div>}
                {content.location.address && <div>{content.location.address}</div>}
                <div className="text-xs text-gray-500">
                  {content.location.latitude.toFixed(6)}, {content.location.longitude.toFixed(6)}
                </div>
              </div>
            )}
          </div>
        );
      
      case 'contact':
        return (
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <Phone className="h-8 w-8 text-green-500" />
            <div className="flex-1 min-w-0">
              {content.contact && (
                <>
                  <div className="font-medium text-sm">
                    {content.contact.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {content.contact.phoneNumber}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      
      case 'template':
        return (
          <div className="space-y-2">
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              Template: {content.template?.name}
            </div>
            {content.text && (
              <div className="whitespace-pre-wrap break-words">
                {content.text}
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <div className="text-sm text-gray-500 italic">
            {messageType} message
          </div>
        );
    }
  };

  const renderMessageBubble = (message: MessageBubble, index: number) => {
    const isOutbound = message.direction === 'outbound';
    const showDateSeparator = index === 0 || 
      !isSameDay(new Date(message.timestamp), new Date(messages[index - 1].timestamp));

    return (
      <div key={message._id} className="flex flex-col space-y-1">
        {/* Date separator - only show when date changes */}
        {showDateSeparator && (
          <div className="flex justify-center my-4">
            <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
              {formatDateSeparator(message.timestamp)}
            </div>
          </div>
        )}
        
        <div className={cn(
          "flex",
          isOutbound ? "justify-end" : "justify-start"
        )}>
          <div className={cn(
            "max-w-[70%] rounded-2xl px-4 py-2 shadow-sm",
            isOutbound 
              ? "bg-green-500 text-white" 
              : "bg-white text-gray-900 border border-gray-200"
          )}>
            <div className="space-y-1">
              {renderMessageContent(message)}
              
              {/* Timestamp and status inside bubble - small and subtle */}
              <div className="flex items-center justify-end gap-1 text-[10px] opacity-70 mt-1">
                <span>{formatTimestamp(message.timestamp)}</span>
                {isOutbound && (
                  <MessageStatusIndicator 
                    status={message.status} 
                    timestamp={message.timestamp}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading && messages.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="flex items-center space-x-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading messages...</span>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">💬</div>
          <div className="text-lg font-medium">No messages yet</div>
          <div className="text-sm">Start a conversation by sending a message</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {/* Load more button */}
          {hasMore && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="text-xs"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Load older messages
                  </>
                )}
              </Button>
            </div>
          )}
          
          {/* Messages */}
          {messages.map((message, index) => renderMessageBubble(message, index))}
        </div>
      </ScrollArea>
      
      {/* Jump to top button */}
      {showJumpToTop && (
        <div className="absolute bottom-20 right-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
              if (scrollContainer) {
                scrollContainer.scrollTop = 0;
              }
            }}
            className="rounded-full shadow-lg"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Compact version for smaller spaces
export function CompactMessageThread({
  messages,
  conversationId,
  onLoadMore,
  hasMore = false,
  loading = false,
  className
}: MessageThreadProps) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleLoadMore = async () => {
    if (!onLoadMore || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      await onLoadMore();
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-32", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-32 text-gray-500", className)}>
        No messages yet
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="text-xs"
          >
            {isLoadingMore ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <ChevronUp className="h-3 w-3 mr-1" />
            )}
            Load older
          </Button>
        </div>
      )}
      
      {messages.map((message) => (
        <div key={message._id} className="flex items-center space-x-2 text-sm">
          <div className={cn(
            "flex-1 p-2 rounded-lg",
            message.direction === 'outbound' 
              ? "bg-green-100 text-green-900" 
              : "bg-gray-100 text-gray-900"
          )}>
            <div className="truncate">
              {message.content.text || `${message.messageType} message`}
            </div>
            <div className="flex items-center justify-end mt-1">
              {message.direction === 'outbound' && (
                <MessageStatusIndicator 
                  status={message.status} 
                  className="text-xs"
                />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
