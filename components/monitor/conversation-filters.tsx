"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ConversationFiltersTypeProps, ConversationFiltersType as ConversationFiltersTypeType } from "@/lib/types/monitor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Filter, 
  X, 
  Calendar, 
  Tag, 
  Building, 
  MessageSquare, 
  Clock,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export function ConversationFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  availableTags = [],
  availableTemplates = [],
  className
}: ConversationFiltersTypeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState<ConversationFiltersType>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof ConversationFiltersType, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters: ConversationFiltersType = {};
    setLocalFilters(clearedFilters);
    onClearFilters();
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.status && localFilters.status.length > 0) count++;
    if (localFilters.startDate) count++;
    if (localFilters.endDate) count++;
    if (localFilters.search) count++;
    if (localFilters.tags && localFilters.tags.length > 0) count++;
    if (localFilters.templateName) count++;
    if (localFilters.messageType) count++;
    if (localFilters.hasResponse !== undefined) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs"
            >
              {isExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Search</Label>
            <Input
              placeholder="Search by phone, name, or message content..."
              value={localFilters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Status</Label>
            <div className="flex flex-wrap gap-2">
              {['active', 'closed', 'archived'].map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={localFilters.status?.includes(status as any) || false}
                    onCheckedChange={(checked) => {
                      const currentStatus = localFilters.status || [];
                      if (checked) {
                        handleFilterChange('status', [...currentStatus, status]);
                      } else {
                        handleFilterChange('status', currentStatus.filter(s => s !== status));
                      }
                    }}
                  />
                  <Label htmlFor={`status-${status}`} className="text-xs capitalize">
                    {status}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Start Date</Label>
              <Input
                type="date"
                value={localFilters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">End Date</Label>
              <Input
                type="date"
                value={localFilters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {/* Tags */}
          {availableTags.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Tags</Label>
              <div className="flex flex-wrap gap-1">
                {availableTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={localFilters.tags?.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => {
                      const currentTags = localFilters.tags || [];
                      if (currentTags.includes(tag)) {
                        handleFilterChange('tags', currentTags.filter(t => t !== tag));
                      } else {
                        handleFilterChange('tags', [...currentTags, tag]);
                      }
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Template */}
          {availableTemplates.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Template Used</Label>
              <Select
                value={localFilters.templateName || ''}
                onValueChange={(value) => handleFilterChange('templateName', value || undefined)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All templates</SelectItem>
                  {availableTemplates.map((template) => (
                    <SelectItem key={template} value={template}>
                      {template}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Message Type */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Message Type</Label>
            <Select
              value={localFilters.messageType || ''}
              onValueChange={(value) => handleFilterChange('messageType', value || undefined)}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select message type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="document">Document</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="location">Location</SelectItem>
                <SelectItem value="contact">Contact</SelectItem>
                <SelectItem value="template">Template</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Response Status */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Customer Response</Label>
            <Select
              value={localFilters.hasResponse === undefined ? '' : localFilters.hasResponse.toString()}
              onValueChange={(value) => handleFilterChange('hasResponse', value === '' ? undefined : value === 'true')}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select response status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All conversations</SelectItem>
                <SelectItem value="true">Has customer response</SelectItem>
                <SelectItem value="false">No customer response</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Sort By</Label>
              <Select
                value={localFilters.sortBy || 'lastMessageAt'}
                onValueChange={(value) => handleFilterChange('sortBy', value as any)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lastMessageAt">Last Message</SelectItem>
                  <SelectItem value="startedAt">Start Date</SelectItem>
                  <SelectItem value="messageCount">Message Count</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Order</Label>
              <Select
                value={localFilters.sortOrder || 'desc'}
                onValueChange={(value) => handleFilterChange('sortOrder', value as any)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest First</SelectItem>
                  <SelectItem value="asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Compact version for smaller spaces
export function CompactConversationFiltersType({
  filters,
  onFiltersChange,
  onClearFilters,
  availableTags = [],
  availableTemplates = [],
  className
}: ConversationFiltersTypeProps) {
  const [localFilters, setLocalFilters] = useState<ConversationFiltersType>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof ConversationFiltersType, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters: ConversationFiltersType = {};
    setLocalFilters(clearedFilters);
    onClearFilters();
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.status && localFilters.status.length > 0) count++;
    if (localFilters.startDate) count++;
    if (localFilters.endDate) count++;
    if (localFilters.search) count++;
    if (localFilters.tags && localFilters.tags.length > 0) count++;
    if (localFilters.templateName) count++;
    if (localFilters.messageType) count++;
    if (localFilters.hasResponse !== undefined) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className={cn("space-y-2", className)}>
      {/* Quick Filters */}
      <div className="flex items-center space-x-2">
        <div className="flex-1">
          <Input
            placeholder="Search conversations..."
            value={localFilters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="text-xs h-8"
          />
        </div>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-xs h-8 px-2"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Status Quick Filter */}
      <div className="flex space-x-1">
        {['active', 'closed', 'archived'].map((status) => (
          <Button
            key={status}
            variant={localFilters.status?.includes(status as any) ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const currentStatus = localFilters.status || [];
              if (currentStatus.includes(status as any)) {
                handleFilterChange('status', currentStatus.filter(s => s !== status));
              } else {
                handleFilterChange('status', [...currentStatus, status]);
              }
            }}
            className="text-xs h-6 px-2"
          >
            {status}
          </Button>
        ))}
      </div>

      {/* Tags Quick Filter */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {availableTags.slice(0, 5).map((tag) => (
            <Badge
              key={tag}
              variant={localFilters.tags?.includes(tag) ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => {
                const currentTags = localFilters.tags || [];
                if (currentTags.includes(tag)) {
                  handleFilterChange('tags', currentTags.filter(t => t !== tag));
                } else {
                  handleFilterChange('tags', [...currentTags, tag]);
                }
              }}
            >
              {tag}
            </Badge>
          ))}
          {availableTags.length > 5 && (
            <Badge variant="outline" className="text-xs">
              +{availableTags.length - 5}
            </Badge>
          )}
        </div>
      )}

      {/* Sort */}
      <div className="flex items-center space-x-2">
        <Select
          value={localFilters.sortBy || 'lastMessageAt'}
          onValueChange={(value) => handleFilterChange('sortBy', value as any)}
        >
          <SelectTrigger className="text-xs h-6">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lastMessageAt">Last Message</SelectItem>
            <SelectItem value="startedAt">Start Date</SelectItem>
            <SelectItem value="messageCount">Message Count</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={localFilters.sortOrder || 'desc'}
          onValueChange={(value) => handleFilterChange('sortOrder', value as any)}
        >
          <SelectTrigger className="text-xs h-6">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">↓</SelectItem>
            <SelectItem value="asc">↑</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Filter chips for showing active filters
export function FilterChips({
  filters,
  onRemoveFilter,
  className
}: {
  filters: ConversationFiltersType;
  onRemoveFilter: (key: keyof ConversationFiltersType) => void;
  className?: string;
}) {
  const getFilterChips = () => {
    const chips: Array<{ key: keyof ConversationFiltersType; label: string; value: string }> = [];

    if (filters.status && filters.status.length > 0) {
      chips.push({
        key: 'status',
        label: 'Status',
        value: filters.status.join(', ')
      });
    }

    if (filters.startDate) {
      chips.push({
        key: 'startDate',
        label: 'From',
        value: new Date(filters.startDate).toLocaleDateString()
      });
    }

    if (filters.endDate) {
      chips.push({
        key: 'endDate',
        label: 'To',
        value: new Date(filters.endDate).toLocaleDateString()
      });
    }

    if (filters.search) {
      chips.push({
        key: 'search',
        label: 'Search',
        value: filters.search
      });
    }

    if (filters.tags && filters.tags.length > 0) {
      chips.push({
        key: 'tags',
        label: 'Tags',
        value: filters.tags.join(', ')
      });
    }

    if (filters.templateName) {
      chips.push({
        key: 'templateName',
        label: 'Template',
        value: filters.templateName
      });
    }

    if (filters.messageType) {
      chips.push({
        key: 'messageType',
        label: 'Type',
        value: filters.messageType
      });
    }

    if (filters.hasResponse !== undefined) {
      chips.push({
        key: 'hasResponse',
        label: 'Response',
        value: filters.hasResponse ? 'Has response' : 'No response'
      });
    }

    return chips;
  };

  const chips = getFilterChips();

  if (chips.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="secondary"
          className="text-xs cursor-pointer hover:bg-gray-200"
          onClick={() => onRemoveFilter(chip.key)}
        >
          {chip.label}: {chip.value}
          <X className="h-3 w-3 ml-1" />
        </Badge>
      ))}
    </div>
  );
}
