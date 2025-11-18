// Production-grade mapping service for intelligent CSV column to template variable matching

import { 
  TemplateVariable, 
  ColumnMapping, 
  CsvAnalysis, 
  ColumnSuggestion,
  PhoneColumnSuggestion 
} from '../types/mapping';

export class MappingService {
  /**
   * Generates intelligent suggestions for mapping CSV columns to template variables
   */
  static generateSuggestions(
    templateVariables: TemplateVariable[],
    csvAnalysis: CsvAnalysis
  ): Record<number, ColumnSuggestion[]> {
    const suggestions: Record<number, ColumnSuggestion[]> = {};

    for (const variable of templateVariables) {
      const columnSuggestions: ColumnSuggestion[] = [];

      for (const column of csvAnalysis.columns) {
        const confidence = this.calculateMappingConfidence(
          variable,
          column,
          csvAnalysis.samples[column] || [],
          csvAnalysis.confidence[variable.index] || 0
        );

        if (confidence > 0) {
          columnSuggestions.push({
            column,
            confidence,
            reason: this.getConfidenceReason(variable, column, confidence),
            type: this.getSuggestionType(confidence)
          });
        }
      }

      // Sort by confidence (highest first)
      suggestions[variable.index] = columnSuggestions.sort((a, b) => b.confidence - a.confidence);
    }

    return suggestions;
  }

  /**
   * Auto-applies high-confidence mappings
   */
  static autoApplyMappings(
    templateVariables: TemplateVariable[],
    suggestions: Record<number, ColumnSuggestion[]>,
    threshold: number = 80
  ): ColumnMapping {
    const mapping: ColumnMapping = {};

    for (const variable of templateVariables) {
      const variableSuggestions = suggestions[variable.index] || [];
      const bestSuggestion = variableSuggestions[0];

      if (bestSuggestion && bestSuggestion.confidence >= threshold) {
        mapping[variable.index] = bestSuggestion.column;
      }
    }

    return mapping;
  }

  /**
   * Detects phone number columns with high accuracy
   */
  static detectPhoneColumns(
    csvColumns: string[],
    csvAnalysis: CsvAnalysis
  ): PhoneColumnSuggestion[] {
    const suggestions: PhoneColumnSuggestion[] = [];

    for (const column of csvColumns) {
      const confidence = this.calculatePhoneConfidence(
        column,
        csvAnalysis.samples[column] || []
      );

      if (confidence > 0) {
        suggestions.push({
          column,
          confidence,
          patterns: this.getPhonePatterns(column, csvAnalysis.samples[column] || [])
        });
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculates mapping confidence between a template variable and CSV column
   */
  private static calculateMappingConfidence(
    variable: TemplateVariable,
    column: string,
    samples: string[],
    baseConfidence: number
  ): number {
    let confidence = baseConfidence;

    // Header name matching
    const headerScore = this.getHeaderMatchScore(variable, column);
    confidence += headerScore * 30; // 30% weight for header matching

    // Sample data analysis
    const sampleScore = this.getSampleDataScore(variable, samples);
    confidence += sampleScore * 40; // 40% weight for sample data

    // Context matching
    const contextScore = this.getContextMatchScore(variable, column);
    confidence += contextScore * 20; // 20% weight for context

    // Type-specific validation
    const typeScore = this.getTypeValidationScore(variable, samples);
    confidence += typeScore * 10; // 10% weight for type validation

    return Math.min(100, Math.max(0, confidence));
  }

  /**
   * Calculates phone number detection confidence
   */
  private static calculatePhoneConfidence(
    column: string,
    samples: string[]
  ): number {
    let confidence = 0;

    // Header name patterns
    const phoneKeywords = ['phone', 'number', 'mobile', 'contact', 'tel', 'cell', 'whatsapp'];
    const headerLower = column.toLowerCase();
    
    for (const keyword of phoneKeywords) {
      if (headerLower.includes(keyword)) {
        confidence += 30;
      }
    }

    // Sample data patterns
    const phonePatterns = [
      /^\+?[1-9]\d{1,14}$/, // E.164 format
      /^\d{10,15}$/, // 10-15 digits
      /^\+91\d{10}$/, // Indian format
      /^\+1\d{10}$/, // US format
    ];

    let phoneMatches = 0;
    for (const value of samples) {
      if (value && value.trim()) {
        for (const pattern of phonePatterns) {
          if (pattern.test(value.trim())) {
            phoneMatches++;
            break;
          }
        }
      }
    }

    if (phoneMatches > 0) {
      const matchRate = phoneMatches / samples.length;
      confidence += matchRate * 50;
    }

    // Additional patterns
    const sampleText = samples.join(' ').toLowerCase();
    if (sampleText.includes('+') || sampleText.match(/\d{10,}/)) {
      confidence += 20;
    }

    return Math.min(100, confidence);
  }

  /**
   * Gets header matching score
   */
  private static getHeaderMatchScore(variable: TemplateVariable, column: string): number {
    const columnLower = column.toLowerCase();
    const labelLower = variable.label.toLowerCase();
    
    // Exact match
    if (columnLower === labelLower) return 1.0;
    
    // Partial match
    if (columnLower.includes(labelLower) || labelLower.includes(columnLower)) return 0.7;
    
    // Keyword matching
    const keywords = this.getKeywordsForVariable(variable);
    for (const keyword of keywords) {
      if (columnLower.includes(keyword)) return 0.5;
    }
    
    return 0;
  }

  /**
   * Gets sample data analysis score
   */
  private static getSampleDataScore(variable: TemplateVariable, samples: string[]): number {
    if (samples.length === 0) return 0;
    
    const sampleText = samples.join(' ').toLowerCase();
    
    // Type-specific validation
    switch (variable.type) {
      case 'date':
        return this.validateDateSamples(samples);
      case 'currency':
        return this.validateCurrencySamples(samples);
      case 'url':
        return this.validateUrlSamples(samples);
      default:
        return this.validateTextSamples(samples);
    }
  }

  /**
   * Gets context matching score
   */
  private static getContextMatchScore(variable: TemplateVariable, column: string): number {
    const contextLower = variable.context.toLowerCase();
    const columnLower = column.toLowerCase();
    
    // Check if column name appears in context
    if (contextLower.includes(columnLower)) return 0.8;
    
    // Check for related keywords
    const relatedKeywords = this.getRelatedKeywords(variable);
    for (const keyword of relatedKeywords) {
      if (columnLower.includes(keyword)) return 0.6;
    }
    
    return 0;
  }

  /**
   * Gets type validation score
   */
  private static getTypeValidationScore(variable: TemplateVariable, samples: string[]): number {
    switch (variable.type) {
      case 'date':
        return this.validateDateSamples(samples);
      case 'currency':
        return this.validateCurrencySamples(samples);
      case 'url':
        return this.validateUrlSamples(samples);
      default:
        return 0.5; // Default score for text
    }
  }

  // Helper methods for validation
  private static validateDateSamples(samples: string[]): number {
    const datePatterns = [
      /\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
      /\d{2}\/\d{2}\/\d{4}/, // MM/DD/YYYY
      /\d{2}-\d{2}-\d{4}/, // MM-DD-YYYY
    ];
    
    let matches = 0;
    for (const sample of samples) {
      for (const pattern of datePatterns) {
        if (pattern.test(sample)) {
          matches++;
          break;
        }
      }
    }
    
    return matches / samples.length;
  }

  private static validateCurrencySamples(samples: string[]): number {
    const currencyPatterns = [
      /\$[\d,]+\.?\d*/, // $123.45
      /[\d,]+\.?\d*\s*(USD|EUR|GBP)/i, // 123.45 USD
    ];
    
    let matches = 0;
    for (const sample of samples) {
      for (const pattern of currencyPatterns) {
        if (pattern.test(sample)) {
          matches++;
          break;
        }
      }
    }
    
    return matches / samples.length;
  }

  private static validateUrlSamples(samples: string[]): number {
    const urlPatterns = [
      /^https?:\/\/.+/,
      /^www\..+/,
    ];
    
    let matches = 0;
    for (const sample of samples) {
      for (const pattern of urlPatterns) {
        if (pattern.test(sample)) {
          matches++;
          break;
        }
      }
    }
    
    return matches / samples.length;
  }

  private static validateTextSamples(samples: string[]): number {
    // For text, we just check if it's not empty and not purely numeric
    const nonEmptySamples = samples.filter(s => s && s.trim().length > 0);
    const nonNumericSamples = nonEmptySamples.filter(s => !/^\d+$/.test(s.trim()));
    
    return nonNumericSamples.length / samples.length;
  }

  // Helper methods for keywords and patterns
  private static getKeywordsForVariable(variable: TemplateVariable): string[] {
    const keywordMap: Record<string, string[]> = {
      'Customer Name': ['name', 'customer', 'client', 'user', 'person', 'caller'],
      'Company': ['company', 'organization', 'business', 'firm', 'corp'],
      'Phone Number': ['phone', 'number', 'mobile', 'contact', 'tel', 'cell'],
      'Date': ['date', 'time', 'created', 'closed', 'completed'],
      'Agent': ['agent', 'support', 'rep', 'representative', 'staff'],
      'Ticket ID': ['ticket', 'id', 'number', 'reference', 'ref', 'case'],
    };
    
    return keywordMap[variable.label] || [];
  }

  private static getRelatedKeywords(variable: TemplateVariable): string[] {
    const contextLower = variable.context.toLowerCase();
    const keywords: string[] = [];
    
    if (contextLower.includes('name')) keywords.push('name', 'customer', 'client');
    if (contextLower.includes('company')) keywords.push('company', 'organization', 'business');
    if (contextLower.includes('phone')) keywords.push('phone', 'number', 'mobile');
    if (contextLower.includes('date')) keywords.push('date', 'time', 'created');
    if (contextLower.includes('agent')) keywords.push('agent', 'support', 'rep');
    
    return keywords;
  }

  private static getConfidenceReason(variable: TemplateVariable, column: string, confidence: number): string {
    if (confidence >= 90) return 'Excellent match';
    if (confidence >= 70) return 'Good match';
    if (confidence >= 50) return 'Possible match';
    return 'Low confidence match';
  }

  private static getSuggestionType(confidence: number): 'exact' | 'partial' | 'inferred' {
    if (confidence >= 90) return 'exact';
    if (confidence >= 70) return 'partial';
    return 'inferred';
  }

  private static getPhonePatterns(column: string, samples: string[]): string[] {
    const patterns: string[] = [];
    
    if (samples.some(s => /^\+/.test(s))) patterns.push('E.164 format');
    if (samples.some(s => /^\d{10}$/.test(s))) patterns.push('10-digit format');
    if (samples.some(s => /^\d{11}$/.test(s))) patterns.push('11-digit format');
    if (samples.some(s => /^\+91/.test(s))) patterns.push('Indian format');
    if (samples.some(s => /^\+1/.test(s))) patterns.push('US format');
    
    return patterns;
  }
}
