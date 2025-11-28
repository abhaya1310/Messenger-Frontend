"use client";

import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, CheckCircle, AlertCircle, Target } from "lucide-react";
import type { Template } from "@/lib/api";
import type { TemplateAnalysis, ColumnMapping } from "@/lib/types/mapping";

interface LiveTemplatePreviewProps {
  template: Template | null;
  templateAnalysis: TemplateAnalysis | null;
  columnMapping: ColumnMapping;
  phoneColumn: string;
  csvData: Record<string, string>[];
  className?: string;
}

export function LiveTemplatePreview({
  template,
  templateAnalysis,
  columnMapping,
  phoneColumn,
  csvData,
  className
}: LiveTemplatePreviewProps) {
  const previewData = useMemo(() => {
    if (!templateAnalysis || !csvData[0] || !template) {
      return {
        preview: '',
        previewParts: [],
        to: '',
        isComplete: false,
        unmappedVariables: [],
        mappedCount: 0,
        totalVariables: templateAnalysis?.variables.length || 0
      };
    }

    const firstRow = csvData[0];
    const preview = template.components.find(c => c.type === 'BODY')?.text || '';
    const unmappedVariables: number[] = [];
    let mappedCount = 0;

    // Create highlighted preview with React elements
    const previewParts: React.ReactNode[] = [];
    const variableRegex = /\{\{(\d+)\}\}/g;
    let lastIndex = 0;
    let match;

    while ((match = variableRegex.exec(preview)) !== null) {
      const variableIndex = parseInt(match[1]);
      const mappedColumn = columnMapping[variableIndex];

      // Add text before variable
      if (match.index > lastIndex) {
        previewParts.push(preview.substring(lastIndex, match.index));
      }

      // Add highlighted variable
      if (mappedColumn && firstRow[mappedColumn]?.trim()) {
        const value = firstRow[mappedColumn].trim();
        previewParts.push(
          <span key={match.index} className="bg-green-200 text-green-900 px-1 rounded font-semibold">
            {value}
          </span>
        );
        mappedCount++;
      } else {
        // Unmapped variable - keep placeholder but highlight it
        previewParts.push(
          <span key={match.index} className="bg-yellow-200 text-yellow-900 px-1 rounded font-semibold">
            {match[0]}
          </span>
        );
        unmappedVariables.push(variableIndex);
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < preview.length) {
      previewParts.push(preview.substring(lastIndex));
    }

    const to = phoneColumn && firstRow[phoneColumn] ? firstRow[phoneColumn] : '';

    return {
      preview,
      previewParts,
      to,
      isComplete: unmappedVariables.length === 0 && !!to,
      unmappedVariables,
      mappedCount,
      totalVariables: templateAnalysis.variables.length
    };
  }, [template, templateAnalysis, columnMapping, phoneColumn, csvData]);

  const getStatusIcon = () => {
    if (previewData.isComplete) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (previewData.mappedCount > 0) {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    if (previewData.isComplete) {
      return "All variables mapped";
    } else if (previewData.mappedCount > 0) {
      return `${previewData.mappedCount}/${previewData.totalVariables} variables mapped`;
    } else {
      return "No variables mapped yet";
    }
  };

  const getStatusVariant = (): "success" | "warning" | "outline" => {
    if (previewData.isComplete) return "success";
    if (previewData.mappedCount > 0) return "warning";
    return "outline";
  };

  if (!template || !templateAnalysis) {
    return (
      <Card className={`border-gray-200 ${className}`}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Template preview will appear here</p>
            <p className="text-xs text-gray-400 mt-1">
              Upload a CSV file to see live preview
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!csvData.length) {
    return (
      <Card className={`border-gray-200 ${className}`}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Live Preview</p>
            <p className="text-xs text-gray-400 mt-1">
              Upload a CSV file to see live preview
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Live Preview
          </h3>
          <p className="text-sm text-gray-600">
            Real-time template preview with your data
          </p>
        </div>
        <Badge variant={getStatusVariant()}>
          {getStatusText()}
        </Badge>
      </div>

      {/* WhatsApp Message Bubble */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex justify-start">
            <div className="max-w-xs lg:max-w-md">
              <div className="flex items-start space-x-2">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {previewData.previewParts.length > 0 ? previewData.previewParts : (previewData.preview || template.components.find(c => c.type === 'BODY')?.text || 'No message content')}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>WhatsApp</span>
                    <span>now</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phone Number Display */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Target className="h-4 w-4 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Recipient</p>
              <p className="text-sm text-blue-700 font-mono">
                {previewData.to || 'No phone number selected'}
              </p>
            </div>
            {previewData.to && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Unmapped Variables Warning */}
      {previewData.unmappedVariables.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">
                  Unmapped Variables
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Variables {previewData.unmappedVariables.join(', ')} need to be mapped to CSV columns
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mapping Progress */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Mapping Progress</span>
              <span className="font-medium text-gray-900">
                {previewData.mappedCount}/{previewData.totalVariables}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${previewData.totalVariables > 0 ? (previewData.mappedCount / previewData.totalVariables) * 100 : 0}%`
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
