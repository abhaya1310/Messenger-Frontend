"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ReplyInputProps } from "@/lib/types/monitor";
import { Send, Loader2 } from "lucide-react";

export function ReplyInput({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
  maxLength = 4096,
  className
}: ReplyInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if (!message.trim() || isSending || disabled) return;

    setIsSending(true);
    setError(null);

    try {
      await onSend(message.trim());
      setMessage("");
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    setError(null);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const characterCount = message.length;
  const isOverLimit = characterCount > maxLength;
  const canSend = message.trim().length > 0 && !isOverLimit && !isSending && !disabled;

  const getCharacterCountColor = () => {
    if (isOverLimit) return "text-red-500";
    if (characterCount > maxLength * 0.9) return "text-yellow-500";
    return "text-gray-500";
  };

  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      {error && (
        <div className="text-sm text-red-500 bg-red-50 p-2 rounded-md">
          {error}
        </div>
      )}
      
      <div className="flex items-end space-x-2 p-3 bg-white border border-gray-200 rounded-lg">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            className={cn(
              "min-h-[40px] max-h-[120px] resize-none border-0 focus:ring-0 focus:outline-none",
              "placeholder:text-gray-500",
              isOverLimit && "border-red-300 focus:border-red-300"
            )}
            style={{ height: 'auto' }}
          />
          
          {/* Character counter */}
          <div className="absolute bottom-1 right-1 text-xs">
            <span className={getCharacterCountColor()}>
              {characterCount}/{maxLength}
            </span>
          </div>
        </div>
        
        <Button
          onClick={handleSend}
          disabled={!canSend}
          size="sm"
          className={cn(
            "h-10 w-10 p-0 rounded-full",
            "bg-green-500 hover:bg-green-600 text-white",
            "disabled:bg-gray-300 disabled:cursor-not-allowed",
            "transition-colors duration-200"
          )}
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {/* Helper text */}
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>Press Enter to send, Shift+Enter for new line</span>
        {isOverLimit && (
          <span className="text-red-500">
            Message too long ({characterCount - maxLength} characters over limit)
          </span>
        )}
      </div>
    </div>
  );
}

// Compact version for smaller spaces
export function CompactReplyInput({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
  maxLength = 4096,
  className
}: ReplyInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!message.trim() || isSending || disabled) return;

    setIsSending(true);
    setError(null);

    try {
      await onSend(message.trim());
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const characterCount = message.length;
  const isOverLimit = characterCount > maxLength;
  const canSend = message.trim().length > 0 && !isOverLimit && !isSending && !disabled;

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="flex-1 relative">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          className={cn(
            "w-full px-3 py-2 border border-gray-200 rounded-lg",
            "focus:ring-2 focus:ring-green-500 focus:border-green-500",
            "disabled:bg-gray-50 disabled:cursor-not-allowed",
            isOverLimit && "border-red-300 focus:border-red-300"
          )}
        />
        
        {isOverLimit && (
          <div className="absolute -top-6 right-0 text-xs text-red-500">
            {characterCount - maxLength} over limit
          </div>
        )}
      </div>
      
      <Button
        onClick={handleSend}
        disabled={!canSend}
        size="sm"
        className={cn(
          "h-10 w-10 p-0 rounded-full",
          "bg-green-500 hover:bg-green-600 text-white",
          "disabled:bg-gray-300 disabled:cursor-not-allowed"
        )}
      >
        {isSending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

// WhatsApp-style reply input with emoji support
export function WhatsAppReplyInput({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
  maxLength = 4096,
  className
}: ReplyInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!message.trim() || isSending || disabled) return;

    setIsSending(true);
    setError(null);

    try {
      await onSend(message.trim());
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const characterCount = message.length;
  const isOverLimit = characterCount > maxLength;
  const canSend = message.trim().length > 0 && !isOverLimit && !isSending && !disabled;

  return (
    <div className={cn("flex items-center space-x-2 bg-gray-100 p-2 rounded-full", className)}>
      <div className="flex-1 relative">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          className={cn(
            "w-full px-4 py-2 bg-white border-0 rounded-full",
            "focus:ring-2 focus:ring-green-500 focus:outline-none",
            "disabled:bg-gray-50 disabled:cursor-not-allowed",
            isOverLimit && "border-red-300"
          )}
        />
        
        {isOverLimit && (
          <div className="absolute -top-6 right-0 text-xs text-red-500">
            {characterCount - maxLength} over limit
          </div>
        )}
      </div>
      
      <Button
        onClick={handleSend}
        disabled={!canSend}
        size="sm"
        className={cn(
          "h-8 w-8 p-0 rounded-full",
          "bg-green-500 hover:bg-green-600 text-white",
          "disabled:bg-gray-300 disabled:cursor-not-allowed"
        )}
      >
        {isSending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

