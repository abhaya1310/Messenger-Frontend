"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowRight, 
  CheckCircle, 
  AlertCircle, 
  Wand2, 
  Info,
  Target,
  Database
} from "lucide-react";
import React from "react";

// Helper component to extract and highlight variables in contextual sentences
function ContextualSnippet({ 
  fullContext, 
  variableIndex, 
  mappedValue,
  csvData 
}: {
  fullContext: string;
  variableIndex: number;
  mappedValue?: string;
  csvData?: Record<string, string>[];
}) {
  // Extract sentence containing variable
  const extractSentence = (text: string, placeholder: string) => {
    const sentences = text.split(/[.!?]+/);
    const targetSentence = sentences.find(s => s.includes(placeholder));
    return targetSentence?.trim() || text;
  };
  
  const placeholder = `{{${variableIndex}}}`;
  const sentence = extractSentence(fullContext, placeholder);
  
  // Get actual value from CSV if mapped
  const displayValue = mappedValue && csvData?.[0]?.[mappedValue] 
    ? csvData[0][mappedValue]
    : placeholder;
  
  // Split and highlight
  const parts = sentence.split(placeholder);
  
  return (
    <>
      {parts.map((part, idx) => (
        <React.Fragment key={idx}>
          {part}
          {idx < parts.length - 1 && (
            <span className={`font-bold px-1 rounded ${
              mappedValue 
                ? 'bg-green-200 text-green-900' 
                : 'bg-yellow-200 text-yellow-900'
            }`}>
              {displayValue}
            </span>
          )}
        </React.Fragment>
      ))}
    </>
  );
}

export interface TemplateVariable {
  index: number;
  type: 'text' | 'date' | 'currency' | 'url';
  context: string;
  label: string;
}

export interface ColumnSuggestion {
  column: string;
  confidence: number;
  reason: string;
}

interface ColumnMapperProps {
  templateVariables: TemplateVariable[];
  csvColumns: string[];
  suggestions: Record<number, ColumnSuggestion[]>;
  columnMapping: Record<number, string>;
  onChange: (mapping: Record<number, string>) => void;
  phoneColumn?: string;
  onPhoneColumnChange?: (column: string) => void;
  phoneSuggestions?: Array<{column: string; confidence: number}>;
  csvData?: Record<string, string>[];
  className?: string;
}

export function ColumnMapper({
  templateVariables,
  csvColumns,
  suggestions,
  columnMapping,
  onChange,
  phoneColumn,
  onPhoneColumnChange,
  phoneSuggestions = [],
  csvData = [],
  className
}: ColumnMapperProps) {
  const [localMapping, setLocalMapping] = useState<Record<number, string>>(columnMapping);

  useEffect(() => {
    setLocalMapping(columnMapping);
  }, [columnMapping]);

  // Effect to match heights between template variables and CSV columns with debouncing
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const matchHeights = () => {
      templateVariables.forEach((variable) => {
        const templateCard = document.querySelector(`[data-template-variable="${variable.index}"]`);
        const csvCard = document.querySelector(`[data-csv-mapping="${variable.index}"]`);
        
        if (templateCard && csvCard) {
          const templateHeight = templateCard.getBoundingClientRect().height;
          // Use min-height instead of height to allow natural growth
          (csvCard as HTMLElement).style.minHeight = `${templateHeight}px`;
        }
      });
    };

    const debouncedMatchHeights = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(matchHeights, 150); // Debounce with 150ms delay
    };

    // Match heights after component mounts and when content changes
    debouncedMatchHeights();
    
    // Also match heights when window resizes
    window.addEventListener('resize', debouncedMatchHeights);
    
    // Use ResizeObserver to watch for content changes (with fallback)
    let resizeObserver: ResizeObserver | null = null;
    
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(debouncedMatchHeights);
      
      // Observe template cards for size changes
      templateVariables.forEach((variable) => {
        const templateCard = document.querySelector(`[data-template-variable="${variable.index}"]`);
        if (templateCard) {
          resizeObserver!.observe(templateCard);
        }
      });
    }
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', debouncedMatchHeights);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [templateVariables, localMapping]);

  const handleVariableMapping = (variableIndex: number, columnName: string) => {
    const newMapping = { ...localMapping, [variableIndex]: columnName };
    setLocalMapping(newMapping);
    onChange(newMapping);
  };

  const applyAutoSuggestions = () => {
    const autoMapping: Record<number, string> = {};
    
    // Sequential mapping: Variable 1 → Column 1, Variable 2 → Column 2, etc.
    templateVariables.forEach((variable, index) => {
      if (index < csvColumns.length) {
        autoMapping[variable.index] = csvColumns[index];
      }
    });
    
    setLocalMapping(autoMapping);
    onChange(autoMapping);
  };

  const getMappingStatus = (variableIndex: number) => {
    const isMapped = localMapping[variableIndex];
    const suggestion = suggestions[variableIndex]?.[0];
    
    if (isMapped) {
      const confidence = suggestion?.confidence || 0;
      if (confidence >= 80) return 'excellent';
      if (confidence >= 60) return 'good';
      return 'manual';
    }
    return 'unmapped';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'good':
        return <CheckCircle className="h-4 w-4 text-yellow-500" />;
      case 'manual':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-yellow-600';
      case 'manual': return 'text-blue-600';
      default: return 'text-gray-500';
    }
  };

  const mappedCount = Object.keys(localMapping).length;
  const totalVariables = templateVariables.length;
  const isComplete = mappedCount === totalVariables;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Column Mapping</h3>
          <p className="text-sm text-gray-600">
            Map template variables to your CSV columns
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={applyAutoSuggestions}
            className="flex items-center"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Sequential Map
          </Button>
          <Badge variant={isComplete ? "success" : "outline"}>
            {mappedCount}/{totalVariables} mapped
          </Badge>
        </div>
      </div>

      {/* Phone Column Selector */}
      {onPhoneColumnChange && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <Target className="h-4 w-4 mr-2" />
                  Select Phone Number Column
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Choose which column contains the phone numbers for sending messages
                </p>
              </div>
              
              <Select
                value={phoneColumn || ""}
                onValueChange={onPhoneColumnChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select phone number column..." />
                </SelectTrigger>
                <SelectContent>
                  {csvColumns.map((column) => {
                    const suggestion = phoneSuggestions.find(s => s.column === column);
                    return (
                      <SelectItem key={column} value={column}>
                        <div className="flex items-center justify-between w-full">
                          <span>{column}</span>
                          {suggestion && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {suggestion.confidence}%
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              
              {phoneSuggestions.length > 0 && (
                <div className="text-xs text-gray-500">
                  <div className="flex items-center mb-1">
                    <Info className="h-3 w-3 mr-1" />
                    <span>Phone column suggestions:</span>
                  </div>
                  <div className="space-y-1">
                    {phoneSuggestions.slice(0, 3).map((suggestion, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span>{suggestion.column}</span>
                        <span className="text-gray-400">
                          {suggestion.confidence}% confidence
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mapping Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Variables */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center">
            <Target className="h-4 w-4 mr-2" />
            Template Variables
          </h4>
          <div className="space-y-3">
            {templateVariables.map((variable) => {
              const status = getMappingStatus(variable.index);
              const mappedColumn = localMapping[variable.index];
              const suggestion = suggestions[variable.index]?.[0];
              
              return (
                <Card 
                  key={variable.index} 
                  data-template-variable={variable.index}
                  className={`transition-all ${
                    status === 'unmapped' ? 'border-gray-200' : 'border-green-200 bg-green-50'
                  }`}
                >
                  <CardContent className="p-4 flex flex-col">
                    {/* Variable identifier with status */}
                    <div className="flex items-center gap-2 mb-3">
                      {getStatusIcon(status)}
                      <Badge variant="outline" className="text-xs">Variable {variable.index}</Badge>
                      <Badge variant="secondary" className="text-xs">{variable.type}</Badge>
                    </div>
                    
                    {/* Context snippet - Standardized styling */}
                    <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3 flex-grow min-h-[120px]">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        <ContextualSnippet 
                          fullContext={variable.context}
                          variableIndex={variable.index}
                          mappedValue={mappedColumn}
                          csvData={csvData}
                        />
                      </p>
                    </div>
                    
                    {/* Mapping status */}
                    <div className="min-h-[24px]">
                      {mappedColumn ? (
                        <div className="flex items-center space-x-2 text-sm">
                          <ArrowRight className="h-3 w-3 text-green-500" />
                          <span className="text-green-700 font-medium">{mappedColumn}</span>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 italic">Not mapped</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* CSV Columns - Match heights */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center">
            <Database className="h-4 w-4 mr-2" />
            CSV Columns
          </h4>
          <div className="space-y-3">
            {templateVariables.map((variable, index) => {
              const mappedColumn = localMapping[variable.index];
              const status = getMappingStatus(variable.index);
              
              return (
                <Card 
                  key={`mapping-${variable.index}`} 
                  data-csv-mapping={variable.index}
                  className={`transition-all ${
                    status === 'unmapped' ? 'border-gray-200' : 'border-green-200 bg-green-50'
                  }`}
                >
                  <CardContent className="p-4 flex flex-col h-full">
                    {/* Header - Match template variable header height */}
                    <div className="flex items-center flex-wrap gap-2 mb-3 min-h-[32px]">
                      {getStatusIcon(status)}
                      <span className="font-medium text-gray-900">Map to {variable.label}</span>
                    </div>
                    
                    {/* Content area - Standardized styling */}
                    <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3 flex-grow min-h-[120px]">
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700 block">
                            Select CSV Column
                          </label>
                          <p className="text-sm text-gray-500">
                            Choose which column maps to this variable
                          </p>
                        </div>
                        
                        <Select
                          value={mappedColumn || ""}
                          onValueChange={(value) => handleVariableMapping(variable.index, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select CSV column..." />
                          </SelectTrigger>
                          <SelectContent>
                            {csvColumns.map((column) => (
                              <SelectItem key={column} value={column}>
                                {column}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Unmapped Columns */}
      {csvColumns.length > templateVariables.length && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-900">Unmapped Columns</p>
                  <p className="text-sm text-yellow-700">
                    You have {csvColumns.length - templateVariables.length} extra columns that won't be used
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {csvColumns
                  .filter(col => !Object.values(localMapping).includes(col))
                  .map((column) => (
                    <Badge key={column} variant="outline" className="text-yellow-700 border-yellow-300">
                      {column}
                    </Badge>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {isComplete && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Mapping Complete</p>
                <p className="text-sm text-green-700">
                  All template variables have been mapped to CSV columns. You can now proceed to send messages.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
