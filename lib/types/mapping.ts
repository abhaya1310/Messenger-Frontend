// Production-grade type definitions for CSV-Template mapping system

export interface TemplateVariable {
  index: number;
  type: 'text' | 'date' | 'currency' | 'url';
  context: string;
  label: string;
  required: boolean;
}

export interface TemplateAnalysis {
  variableCount: number;
  variables: TemplateVariable[];
  templateStructure: {
    header?: string;
    body?: string;
    footer?: string;
  };
}

export interface ColumnSuggestion {
  column: string;
  confidence: number;
  reason: string;
  type: 'exact' | 'partial' | 'inferred';
}

export interface PhoneColumnSuggestion {
  column: string;
  confidence: number;
  patterns: string[];
}

export interface CsvAnalysis {
  columns: string[];
  samples: Record<string, string[]>;
  suggestions: Record<number, string>;
  confidence: Record<number, number>;
  preview: string[];
  validation: {
    columnCount: number;
    variableCount: number;
    status: 'insufficient' | 'equal' | 'excess' | 'unknown';
    phoneColumnDetected: PhoneColumnSuggestion[];
    message: string;
  };
}

export interface ColumnMapping {
  [variableIndex: number]: string; // Maps template variable index to CSV column name
}

export interface MappingValidation {
  isValid: boolean;
  errors: MappingError[];
  warnings: MappingWarning[];
}

export interface MappingError {
  type: 'missing_mapping' | 'invalid_column' | 'type_mismatch' | 'duplicate_mapping';
  variableIndex: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface MappingWarning {
  type: 'low_confidence' | 'unused_column' | 'potential_issue';
  message: string;
  suggestion?: string;
}

export interface PreviewRow {
  index: number;
  to: string;
  preview: string;
  generated: {
    name: string;
    language: string;
    components: Array<{ type: 'body'; parameters: Array<{ type: 'text'; text: string }> }>;
  };
  isValid: boolean;
  errors: string[];
}

export interface SendResult {
  rowHash: string;
  to: string;
  messageId?: string;
  error?: { code: string; message: string };
  status: 'queued' | 'sent' | 'failed';
  timestamp?: Date;
  preview?: string;  // Add preview text for reference
  rowIndex?: number; // Add row index for retry
}

export interface MappingState {
  columnMapping: ColumnMapping;
  phoneColumn: string;
  validation: MappingValidation;
  isDirty: boolean;
  lastSaved?: Date;
}

export interface CSVUploadState {
  file: File | null;
  data: Record<string, string>[];
  analysis: CsvAnalysis | null;
  error: string | null;
  isUploading: boolean;
  isAnalyzing: boolean;
}

export interface TemplateState {
  template: any | null;
  analysis: TemplateAnalysis | null;
  isLoading: boolean;
  error: string | null;
}

// Utility types
export type MappingStep = 'upload' | 'mapping' | 'preview' | 'results';
export type ValidationStatus = 'valid' | 'invalid' | 'warning' | 'pending';
export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';
export type SendStatus = 'idle' | 'sending' | 'completed' | 'failed';

// API Response types
export interface AnalyzeTemplateResponse {
  templateName: string;
  analysis: TemplateAnalysis;
}

export interface AnalyzeCsvResponse {
  analysis: CsvAnalysis;
}

export interface SendTemplateResponse {
  messageId: string;
  payload: any;
}

// Live Preview types
export interface LivePreviewState {
  preview: string;
  to: string;
  isComplete: boolean;
  unmappedVariables: number[];
  mappedCount: number;
  totalVariables: number;
}

export interface PreviewMetadata {
  totalRows: number;
  sampleSize: number;
  showingAll: boolean;
}

// Error types
export class MappingError extends Error {
  constructor(
    public type: MappingError['type'],
    public variableIndex: number,
    message: string,
    public severity: MappingError['severity'] = 'error'
  ) {
    super(message);
    this.name = 'MappingError';
  }
}

export class ValidationError extends Error {
  constructor(
    public field: string,
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
