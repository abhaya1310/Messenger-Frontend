"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MetadataPanelProps, ConversationMetadata } from "@/lib/types/monitor";
import { 
  Flag, 
  Archive, 
  X, 
  Edit3, 
  Save, 
  Copy, 
  Check, 
  User, 
  Building, 
  Tag, 
  FileText,
  Calendar,
  MessageSquare,
  Clock,
  Phone
} from "lucide-react";

export function MetadataPanel({
  conversation,
  stats,
  onUpdateMetadata,
  onFlagConversation,
  onArchiveConversation,
  onCloseConversation,
  className
}: MetadataPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMetadata, setEditedMetadata] = useState<ConversationMetadata>({});
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setEditedMetadata(conversation.metadata || {});
  }, [conversation.metadata]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateMetadata(editedMetadata);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update metadata:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedMetadata(conversation.metadata || {});
    setIsEditing(false);
  };

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText(conversation.clientPhoneNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy phone number:', error);
    }
  };

  const handleAddTag = (tag: string) => {
    if (!tag.trim()) return;
    const currentTags = editedMetadata.tags || [];
    if (!currentTags.includes(tag.trim())) {
      setEditedMetadata(prev => ({
        ...prev,
        tags: [...currentTags, tag.trim()]
      }));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditedMetadata(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
    }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Customer Information</h3>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="text-gray-500 hover:text-gray-700"
          >
            <Edit3 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Phone Number */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4 text-gray-500" />
              <span className="font-mono text-sm">{conversation.clientPhoneNumber}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyPhone}
              className="text-gray-500 hover:text-gray-700"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customer Name */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Name</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isEditing ? (
            <Input
              value={editedMetadata.clientName || ''}
              onChange={(e) => setEditedMetadata(prev => ({ ...prev, clientName: e.target.value }))}
              placeholder="Enter customer name"
              className="text-sm"
            />
          ) : (
            <div className="text-sm text-gray-700">
              {conversation.metadata?.clientName || 'Not specified'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Company */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center space-x-2">
            <Building className="h-4 w-4" />
            <span>Company</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isEditing ? (
            <Input
              value={editedMetadata.company || ''}
              onChange={(e) => setEditedMetadata(prev => ({ ...prev, company: e.target.value }))}
              placeholder="Enter company name"
              className="text-sm"
            />
          ) : (
            <div className="text-sm text-gray-700">
              {conversation.metadata?.company || 'Not specified'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center space-x-2">
            <Tag className="h-4 w-4" />
            <span>Tags</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isEditing ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {(editedMetadata.tags || []).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Add tag and press Enter"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddTag(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
                className="text-sm"
              />
            </div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {(conversation.metadata?.tags || []).length > 0 ? (
                conversation.metadata?.tags?.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-gray-500">No tags</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Notes</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isEditing ? (
            <Textarea
              value={editedMetadata.notes || ''}
              onChange={(e) => setEditedMetadata(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add notes about this customer..."
              className="text-sm min-h-[80px]"
            />
          ) : (
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {conversation.metadata?.notes || 'No notes'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-2">
        <div className="flex space-x-2">
          <Button
            variant={conversation.metadata?.flagged ? "default" : "outline"}
            size="sm"
            onClick={() => onFlagConversation(!conversation.metadata?.flagged)}
            className="flex-1"
          >
            <Flag className="h-4 w-4 mr-1" />
            {conversation.metadata?.flagged ? 'Unflag' : 'Flag'}
          </Button>
          
          {conversation.status === 'active' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onArchiveConversation}
              className="flex-1"
            >
              <Archive className="h-4 w-4 mr-1" />
              Archive
            </Button>
          )}
        </div>

        {conversation.status === 'active' && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCloseConversation}
            className="w-full"
          >
            <X className="h-4 w-4 mr-1" />
            Close Conversation
          </Button>
        )}
      </div>

      {/* Edit Actions */}
      {isEditing && (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Save
              </>
            )}
          </Button>
        </div>
      )}

      {/* Conversation Stats */}
      {stats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Conversation Stats</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Total Messages</span>
              <span className="font-medium">{stats.totalMessages}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Started</span>
              <span className="font-medium">{formatRelativeTime(stats.startedAt)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Last Message</span>
              <span className="font-medium">{formatRelativeTime(stats.lastMessageAt)}</span>
            </div>
            {stats.avgResponseTime && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Avg Response Time</span>
                <span className="font-medium">{stats.avgResponseTime}m</span>
              </div>
            )}
            {stats.customerResponseCount !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Customer Responses</span>
                <span className="font-medium">{stats.customerResponseCount}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Compact version for smaller spaces
export function CompactMetadataPanel({
  conversation,
  stats,
  onUpdateMetadata,
  onFlagConversation,
  onArchiveConversation,
  onCloseConversation,
  className
}: MetadataPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMetadata, setEditedMetadata] = useState<ConversationMetadata>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditedMetadata(conversation.metadata || {});
  }, [conversation.metadata]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateMetadata(editedMetadata);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update metadata:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Phone Number */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm">{conversation.clientPhoneNumber}</span>
        <div className="flex space-x-1">
          <Button
            variant={conversation.metadata?.flagged ? "default" : "ghost"}
            size="sm"
            onClick={() => onFlagConversation(!conversation.metadata?.flagged)}
            className="h-6 w-6 p-0"
          >
            <Flag className="h-3 w-3" />
          </Button>
          {conversation.status === 'active' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onArchiveConversation}
              className="h-6 w-6 p-0"
            >
              <Archive className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Customer Info */}
      <div className="space-y-1 text-sm">
        <div className="flex items-center space-x-2">
          <User className="h-3 w-3 text-gray-500" />
          <span>{conversation.metadata?.clientName || 'Unknown'}</span>
        </div>
        {conversation.metadata?.company && (
          <div className="flex items-center space-x-2">
            <Building className="h-3 w-3 text-gray-500" />
            <span>{conversation.metadata.company}</span>
          </div>
        )}
        {(conversation.metadata?.tags || []).length > 0 && (
          <div className="flex items-center space-x-2">
            <Tag className="h-3 w-3 text-gray-500" />
            <div className="flex flex-wrap gap-1">
              {conversation.metadata?.tags?.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="text-xs text-gray-500 space-y-1">
          <div>{stats.totalMessages} messages</div>
          <div>Last: {new Date(stats.lastMessageAt).toLocaleTimeString()}</div>
        </div>
      )}

      {/* Edit Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsEditing(!isEditing)}
        className="w-full text-xs"
      >
        {isEditing ? 'Cancel' : 'Edit'}
      </Button>

      {/* Edit Form */}
      {isEditing && (
        <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
          <Input
            value={editedMetadata.clientName || ''}
            onChange={(e) => setEditedMetadata(prev => ({ ...prev, clientName: e.target.value }))}
            placeholder="Customer name"
            className="text-xs"
          />
          <Input
            value={editedMetadata.company || ''}
            onChange={(e) => setEditedMetadata(prev => ({ ...prev, company: e.target.value }))}
            placeholder="Company"
            className="text-xs"
          />
          <Textarea
            value={editedMetadata.notes || ''}
            onChange={(e) => setEditedMetadata(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Notes"
            className="text-xs min-h-[60px]"
          />
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full text-xs"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  );
}
