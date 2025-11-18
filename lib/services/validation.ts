// Production-grade validation service for CSV-Template mapping

import { 
  TemplateVariable, 
  ColumnMapping, 
  MappingValidation, 
  MappingError, 
  MappingWarning,
  CsvAnalysis,
  TemplateAnalysis 
} from '../types/mapping';

export class ValidationService {
  /**
   * Validates the complete mapping between CSV columns and template variables
   */
  static validateMapping(
    columnMapping: ColumnMapping,
    templateVariables: TemplateVariable[],
    csvColumns: string[],
    csvAnalysis?: CsvAnalysis
  ): MappingValidation {
    const errors: MappingError[] = [];
    const warnings: MappingWarning[] = [];

    // Check for missing required mappings
    for (const variable of templateVariables) {
      if (variable.required && !columnMapping[variable.index]) {
        errors.push(new MappingError(
          'missing_mapping',
          variable.index,
          `Required variable "${variable.label}" is not mapped to any CSV column`,
          'error'
        ));
      }
    }

    // Check for invalid column references
    for (const [variableIndex, columnName] of Object.entries(columnMapping)) {
      if (columnName && !csvColumns.includes(columnName)) {
        errors.push(new MappingError(
          'invalid_column',
          parseInt(variableIndex),
          `Column "${columnName}" does not exist in CSV`,
          'error'
        ));
      }
    }

    // Check for duplicate mappings
    const usedColumns = new Set<string>();
    for (const [variableIndex, columnName] of Object.entries(columnMapping)) {
      if (columnName) {
        if (usedColumns.has(columnName)) {
          errors.push(new MappingError(
            'duplicate_mapping',
            parseInt(variableIndex),
            `Column "${columnName}" is mapped to multiple variables`,
            'error'
          ));
        }
        usedColumns.add(columnName);
      }
    }

    // Check for type mismatches
    if (csvAnalysis) {
      for (const [variableIndex, columnName] of Object.entries(columnMapping)) {
        if (columnName) {
          const variable = templateVariables.find(v => v.index === parseInt(variableIndex));
          if (variable) {
            const confidence = csvAnalysis.confidence[parseInt(variableIndex)] || 0;
            if (confidence < 50) {
              warnings.push({
                type: 'low_confidence',
                message: `Low confidence mapping for "${variable.label}" to "${columnName}" (${confidence}%)`,
                suggestion: 'Consider reviewing this mapping'
              });
            }
          }
        }
      }
    }

    // Check for unused columns
    const mappedColumns = new Set(Object.values(columnMapping).filter(Boolean));
    const unusedColumns = csvColumns.filter(col => !mappedColumns.has(col));
    if (unusedColumns.length > 0) {
      warnings.push({
        type: 'unused_column',
        message: `${unusedColumns.length} CSV column(s) are not mapped: ${unusedColumns.join(', ')}`,
        suggestion: 'These columns will be ignored during message generation'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates CSV structure against template requirements
   */
  static validateCsvStructure(
    csvAnalysis: CsvAnalysis,
    templateAnalysis: TemplateAnalysis
  ): { isValid: boolean; message: string } {
    const { columnCount, variableCount } = csvAnalysis.validation;
    const requiredVariables = templateAnalysis.variables.filter(v => v.required).length;

    if (columnCount < requiredVariables) {
      return {
        isValid: false,
        message: `CSV has ${columnCount} columns but template requires ${requiredVariables} variables. Please upload a CSV with at least ${requiredVariables} columns.`
      };
    }

    if (columnCount === variableCount) {
      return {
        isValid: true,
        message: `Perfect match: CSV has ${columnCount} columns matching the template's ${variableCount} variables.`
      };
    }

    if (columnCount > variableCount) {
      return {
        isValid: true,
        message: `CSV has ${columnCount} columns (${columnCount - variableCount} extra). You can map the required ${variableCount} variables and ignore the rest.`
      };
    }

    return {
      isValid: true,
      message: 'CSV structure is valid for this template.'
    };
  }

  /**
   * Validates phone column selection
   */
  static validatePhoneColumn(
    phoneColumn: string,
    csvColumns: string[],
    phoneSuggestions: Array<{column: string; confidence: number}>
  ): { isValid: boolean; message: string } {
    if (!phoneColumn) {
      return {
        isValid: false,
        message: 'Please select a phone number column'
      };
    }

    if (!csvColumns.includes(phoneColumn)) {
      return {
        isValid: false,
        message: 'Selected phone column does not exist in CSV'
      };
    }

    const suggestion = phoneSuggestions.find(s => s.column === phoneColumn);
    if (suggestion && suggestion.confidence < 70) {
      return {
        isValid: true,
        message: `Warning: Low confidence phone column selection (${suggestion.confidence}%)`
      };
    }

    return {
      isValid: true,
      message: 'Phone column selection is valid'
    };
  }

  /**
   * Validates preview data before sending
   */
  static validatePreviewData(
    previewData: Array<{ to: string; isValid: boolean; errors: string[] }>
  ): { isValid: boolean; invalidRows: number[]; errors: string[] } {
    const invalidRows: number[] = [];
    const errors: string[] = [];

    previewData.forEach((row, index) => {
      if (!row.isValid) {
        invalidRows.push(index);
        errors.push(`Row ${index + 1}: ${row.errors.join(', ')}`);
      }

      if (!row.to || !row.to.trim()) {
        invalidRows.push(index);
        errors.push(`Row ${index + 1}: Missing phone number`);
      }
    });

    return {
      isValid: invalidRows.length === 0,
      invalidRows,
      errors
    };
  }
}

// Custom error classes
export class MappingError extends Error {
  constructor(
    public type: 'missing_mapping' | 'invalid_column' | 'type_mismatch' | 'duplicate_mapping',
    public variableIndex: number,
    message: string,
    public severity: 'error' | 'warning' = 'error'
  ) {
    super(message);
    this.name = 'MappingError';
  }
}
