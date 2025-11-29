"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CSVUploader } from "@/components/csv-uploader";
import { ColumnMapper } from "@/components/column-mapper";
import { MessagePreview } from "@/components/message-preview";
import { LiveTemplatePreview } from "@/components/live-template-preview";
import { SendStatus } from "@/components/send-status";
import { ImageUploader } from "@/components/image-uploader";
import { 
  ArrowLeft, 
  Upload, 
  CheckSquare, 
  Square, 
  Send, 
  Play, 
  Pause, 
  Square as Stop,
  Download,
  AlertCircle,
  CheckCircle2,
  Wand2,
  FileText,
  Target,
  Database,
  Workflow
} from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import Link from "next/link";
import { 
  fetchTemplates, 
  analyzeTemplate, 
  analyzeCsv,
  sendTemplateDynamic,
  Template,
  TemplateAnalysis,
  CsvAnalysis,
  TemplateVariable,
  ColumnSuggestion
} from "@/lib/api";
import { getTemplatesFromCache, setTemplatesCache } from "@/lib/template-cache";
import { 
  MappingState, 
  CSVUploadState, 
  TemplateState, 
  MappingStep,
  ColumnMapping,
  PreviewRow,
  SendResult,
  PreviewMetadata
} from "@/lib/types/mapping";
import { ValidationService } from "@/lib/services/validation";
import { MappingService } from "@/lib/services/mapping";
import { ErrorBoundary } from "@/components/error-boundary";

// Types are now imported from @/lib/types/mapping

export default function DynamicSendPage() {
  const params = useParams();
  const router = useRouter();
  const templateName = params.templateName as string;

  // Template state
  const [template, setTemplate] = useState<Template | null>(null);
  const [templateAnalysis, setTemplateAnalysis] = useState<TemplateAnalysis | null>(null);
  const [requiresImageHeader, setRequiresImageHeader] = useState(false);
  
  // CSV upload state
  const [csvUploadState, setCsvUploadState] = useState<CSVUploadState>({
    file: null,
    data: [],
    analysis: null,
    error: null,
    isUploading: false,
    isAnalyzing: false
  });
  
  // Mapping state
  const [mappingState, setMappingState] = useState<MappingState>({
    columnMapping: {},
    phoneColumn: '',
    validation: { isValid: false, errors: [], warnings: [] },
    isDirty: false
  });
  
  // Image upload state
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null);
  
  // Preview and send state
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [previewMetadata, setPreviewMetadata] = useState<PreviewMetadata | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState<SendResult[]>([]);
  const [batchSize, setBatchSize] = useState(10);
  const [batchDelay, setBatchDelay] = useState(2);
  const [dryRun, setDryRun] = useState(true);
  const [currentStep, setCurrentStep] = useState<MappingStep>('upload');
  const [loading, setLoading] = useState(true);

  // Preview sample size configuration
  const PREVIEW_SAMPLE_SIZE = 10;

  // Compatibility accessors - extract values from structured state
  const csvAnalysis = csvUploadState.analysis;
  const csvData = csvUploadState.data;
  const csvError = csvUploadState.error;
  const uploadedFile = csvUploadState.file;
  const columnMapping = mappingState.columnMapping;
  const phoneColumn = mappingState.phoneColumn;

  // Template cache is now handled by global cache utility

  // Load template data on mount
  useEffect(() => {
    loadTemplateData();
  }, [templateName]);

  const loadTemplateData = async () => {
    setLoading(true);
    try {
      // Try global cache first
      let templates = getTemplatesFromCache();
      
      if (!templates) {
        console.log('Template cache miss - fetching from API');
        const templatesResponse = await fetchTemplates(15);
        templates = templatesResponse.data;
        setTemplatesCache(templates);
      }
      
      const templateData = templates.find(t => t.name === templateName);
      
      if (!templateData) {
        console.error('Template not found:', templateName);
        // Show error message instead of redirecting
        setLoading(false);
        return;
      }
      
      setTemplate(templateData);
      
      // Check if template requires image header
      const hasImageHeader = templateData.components.some(
        (c: any) => c.type === 'HEADER' && c.format === 'IMAGE'
      );
      setRequiresImageHeader(hasImageHeader);
      
      // Analyze template for variables
      try {
        const analysisResponse = await analyzeTemplate(templateName);
        console.log('Template analysis response:', analysisResponse);
        
        if (analysisResponse?.analysis) {
          setTemplateAnalysis(analysisResponse.analysis);
        } else {
          console.warn('Invalid analysis response structure:', analysisResponse);
          setTemplateAnalysis(null);
        }
      } catch (error) {
        console.error('Failed to analyze template:', error);
        // Continue without analysis - user can still proceed
        setTemplateAnalysis(null);
      }
      
    } catch (error) {
      console.error('Failed to load template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = useCallback((file: File) => {
    setCsvUploadState(prev => ({
      ...prev,
      file
    }));
  }, []);

  const handleDataParsed = useCallback(async (data: any[], file?: File) => {
    setCsvUploadState(prev => ({
      ...prev,
      data,
      error: null,
      isAnalyzing: true
    }));
    
    try {
      // Use the file passed as parameter or fall back to uploadedFile state
      const fileToUse = file || csvUploadState.file;
      if (!fileToUse) {
        throw new Error('No file uploaded. Please upload a CSV file.');
      }
      
      // Analyze CSV for intelligent suggestions with template name
      const analysis = await analyzeCsv(fileToUse, templateName);
      
      setCsvUploadState(prev => ({
        ...prev,
        analysis,
        isAnalyzing: false
      }));
      
      // Generate intelligent suggestions
      if (templateAnalysis) {
        const suggestions = MappingService.generateSuggestions(templateAnalysis.variables, analysis);
        
        // Auto-apply high-confidence mappings
        const autoMapping = MappingService.autoApplyMappings(
          templateAnalysis.variables, 
          suggestions, 
          80 // 80% confidence threshold
        );
        
        // Auto-select phone column
        const phoneSuggestions = MappingService.detectPhoneColumns(analysis.columns, analysis);
        const bestPhoneColumn = phoneSuggestions[0]?.column || '';
        
        // Update mapping state with validation
        const newMappingState: MappingState = {
          columnMapping: autoMapping,
          phoneColumn: bestPhoneColumn,
          validation: ValidationService.validateMapping(
            autoMapping,
            templateAnalysis.variables,
            analysis.columns,
            analysis
          ),
          isDirty: false
        };
        
        setMappingState(newMappingState);
      }
      
      setCurrentStep('mapping');
    } catch (error: any) {
      console.error('Failed to analyze CSV:', error);
      
      // Fallback: derive columns locally and allow manual mapping
      const columns = data && data.length > 0 ? Object.keys(data[0] || {}) : [];
      const fallbackAnalysis: CsvAnalysis = {
        columns,
        samples: {},
        suggestions: {},
        confidence: {},
        preview: [],
        validation: {
          columnCount: columns.length,
          variableCount: templateAnalysis?.variableCount || 0,
          status: 'unknown',
          phoneColumnDetected: [],
          message: 'Local-only analysis fallback'
        }
      };
      
      setCsvUploadState(prev => ({
        ...prev,
        analysis: fallbackAnalysis,
        error: error?.message || 'CSV analysis failed',
        isAnalyzing: false
      }));
      
      setCurrentStep('mapping');
    }
  }, [templateAnalysis, templateName, csvUploadState.file]);

  const generatePreviewData = (data: any[], mapping: Record<number, string>, phoneCol?: string) => {
    if (!templateAnalysis) return;

    const phoneColumnToUse = phoneCol || mappingState.phoneColumn;

    // Limit to sample size for preview
    const sampleData = data.slice(0, PREVIEW_SAMPLE_SIZE);
    
    // Set preview metadata
    setPreviewMetadata({
      totalRows: data.length,
      sampleSize: sampleData.length,
      showingAll: data.length <= PREVIEW_SAMPLE_SIZE
    });

    const previewRows: PreviewRow[] = sampleData.map((row, index) => {
      const errors: string[] = [];
      
      // Validate required mappings
      for (const variable of templateAnalysis.variables) {
        const mappedColumn = mapping[variable.index];
        if (!mappedColumn || !row[mappedColumn]?.trim()) {
          errors.push(`Missing data for ${variable.label}`);
        }
      }

      // Validate phone column
      if (!phoneColumnToUse || !row[phoneColumnToUse]?.trim()) {
        errors.push('Phone number column not selected or missing data');
      }

      // Generate preview text by replacing template variables
      let preview = template?.components.find(c => c.type === 'BODY')?.text || '';
      for (const variable of templateAnalysis.variables) {
        const mappedColumn = mapping[variable.index];
        const value = row[mappedColumn] || `{{${variable.index}}}`;
        preview = preview.replace(new RegExp(`\\{\\{${variable.index}\\}\\}`, 'g'), value);
      }

      return {
        index,
        to: phoneColumnToUse ? row[phoneColumnToUse] : (row.phone || row.number || row.contact || ''),
        preview,
        generated: {
          name: templateName,
          language: template?.language || 'en_US',
          components: [{
            type: 'body',
            parameters: templateAnalysis.variables.map(variable => ({
              type: 'text',
              text: row[mapping[variable.index]] || ''
            }))
          }]
        },
        isValid: errors.length === 0,
        errors
      };
    });

    setPreviewData(previewRows);
    setSelectedRows(new Set(previewRows.filter(row => row.isValid).map(row => row.index)));
    // Note: setCurrentStep('preview') moved to button click handler
  };

  const handleMappingChange = (mapping: Record<number, string>) => {
    setMappingState(prev => ({
      ...prev,
      columnMapping: mapping,
      isDirty: true
    }));
    // Don't auto-generate preview data - let user control when to preview
  };

  const handlePhoneColumnChange = (column: string) => {
    setMappingState(prev => ({
      ...prev,
      phoneColumn: column,
      isDirty: true
    }));
    // Don't auto-generate preview data - let user control when to preview
  };

  const handleSelectAll = () => {
    const validRows = previewData.filter(row => row.isValid).map(row => row.index);
    setSelectedRows(new Set(validRows));
  };

  const handleDeselectAll = () => {
    setSelectedRows(new Set());
  };

  const handleRowToggle = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const handleSend = async () => {
    if (selectedRows.size === 0 || !templateAnalysis || !phoneColumn) return;

    setSending(true);
    setSendResults([]);

    try {
      const selectedData = Array.from(selectedRows).map(index => previewData[index]);
      
      // Validate all required mappings are present
      const missingMappings: number[] = [];
      for (const variable of templateAnalysis.variables) {
        if (!columnMapping[variable.index]) {
          missingMappings.push(variable.index);
        }
      }

      if (missingMappings.length > 0) {
        throw new Error(`Missing mappings for variables: ${missingMappings.join(', ')}. Please map all required template variables.`);
      }

      const campaignId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `campaign-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Send in batches
      for (let i = 0; i < selectedData.length; i += batchSize) {
        const batch = selectedData.slice(i, i + batchSize);
        
        for (const row of batch) {
          try {
            // Get the original CSV row data
            const csvRow = csvData[row.index];
            if (!csvRow) {
              throw new Error('Original CSV data not found');
            }

            // Send via dynamic template API
            const result = await sendTemplateDynamic(
              row.to,
              templateName,
              columnMapping,
              csvRow,
              'en_US',
              mediaId || undefined, // Pass mediaId if available
              campaignId
            );
            
            const sendResult: SendResult = {
              rowHash: `row_${row.index}`,
              to: row.to,
              status: 'sent',
              messageId: result.messageId,
              preview: row.preview,  // Add preview
              rowIndex: row.index    // Add row index
            };
            
            setSendResults(prev => [...prev, sendResult]);
          } catch (error: any) {
            console.error(`Failed to send to ${row.to}:`, error);
            
            const sendResult: SendResult = {
              rowHash: `row_${row.index}`,
              to: row.to,
              status: 'failed',
              error: { 
                code: 'SEND_ERROR', 
                message: error.message || 'Unknown error' 
              },
              preview: row.preview,  // Add preview
              rowIndex: row.index    // Add row index
            };
            
            setSendResults(prev => [...prev, sendResult]);
          }
        }
        
        // Delay between batches
        if (i + batchSize < selectedData.length) {
          await new Promise(resolve => setTimeout(resolve, batchDelay * 1000));
        }
      }
    } catch (error: any) {
      console.error('Send failed:', error);
      alert(`Send failed: ${error.message}`);
    } finally {
      setSending(false);
      // Transition to results screen after sending completes
      setCurrentStep('results');
    }
  };

  const handleRetryFailed = () => {
    // Get failed rows
    const failedResults = sendResults.filter(r => r.status === 'failed');
    const failedRowIndices = new Set(
      failedResults
        .map(r => r.rowIndex)
        .filter((idx): idx is number => idx !== undefined)
    );
    
    // Reset to mapping step with failed rows pre-selected
    setSelectedRows(failedRowIndices);
    setSendResults([]);
    setCurrentStep('mapping');
  };

  const handleStartOver = () => {
    // Reset everything except template
    setCsvUploadState({
      file: null,
      data: [],
      analysis: null,
      error: null,
      isUploading: false,
      isAnalyzing: false
    });
    setMappingState({
      columnMapping: {},
      phoneColumn: '',
      validation: { isValid: false, errors: [], warnings: [] },
      isDirty: false
    });
    setPreviewData([]);
    setSelectedRows(new Set());
    setSendResults([]);
    setCurrentStep('upload');
  };

  const handleBackToTemplates = () => {
    router.push('/templates');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  // Proceed if template exists even when analysis failed (e.g., unauthorized)
  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Template Not Found</h3>
          <p className="text-gray-600 mb-4">The template "{templateName}" could not be found.</p>
          <Button asChild>
            <Link href="/templates">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Templates
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const validRows = previewData.filter(row => row.isValid);
  const invalidRows = previewData.filter(row => !row.isValid);
  const selectedValidRows = validRows.filter(row => selectedRows.has(row.index));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Button variant="ghost" size="sm" className="mr-4" asChild>
              <Link href="/templates">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Templates
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Send {template.name}</h1>
              <p className="text-gray-600 mt-1">
                {templateAnalysis?.variableCount || 0} variable template • {template.category} • {template.language}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={[
          { label: "Templates", href: "/templates" },
          { label: `Send ${template.name}` }
        ]} />

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            {[
              { key: 'upload', label: 'Upload CSV', icon: Upload },
              { key: 'mapping', label: 'Map Columns', icon: Target },
              { key: 'preview', label: 'Preview', icon: FileText },
              { key: 'send', label: 'Send', icon: Send }
            ].map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.key;
              const isCompleted = ['upload', 'mapping', 'preview'].indexOf(currentStep) > ['upload', 'mapping', 'preview'].indexOf(step.key);
              
              return (
                <div key={step.key} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    isActive ? 'bg-blue-600 text-white' : 
                    isCompleted ? 'bg-green-600 text-white' : 
                    'bg-gray-200 text-gray-600'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    isActive ? 'text-blue-600' : 
                    isCompleted ? 'text-green-600' : 
                    'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                  {index < 3 && (
                    <div className={`w-8 h-0.5 mx-4 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Template Info & Upload */}
          <div className="space-y-6">
            {/* Template Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Template: {template.name}
                </CardTitle>
                <CardDescription>
                  {templateAnalysis?.variableCount || 0} variables • {template.category} • {template.language}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MessagePreview
                  templateName={template.name}
                  language={template.language}
                  preview={template.components.find(c => c.type === 'BODY')?.text || 'No body text'}
                  hasForm={false}
                  flowButtons={template.components
                    .find(c => c.type === 'BUTTONS')
                    ?.buttons
                    ?.filter(b => b.type === 'FLOW')
                    .map(b => ({
                      text: b.text,
                      flow_name: b.flow_name,
                      flow_id: b.flow_id,
                      flow_action: b.flow_action,
                      navigate_screen: b.navigate_screen
                    }))}
                />
                
                {/* Flow information display */}
                {template.components.find(c => c.type === 'BUTTONS')?.buttons?.some(b => b.type === 'FLOW') && (
                  <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center text-purple-700 font-medium text-sm mb-2">
                      <Workflow className="h-4 w-4 mr-2" />
                      Interactive Flow Template
                    </div>
                    <div className="space-y-1">
                      {template.components
                        .find(c => c.type === 'BUTTONS')
                        ?.buttons
                        ?.filter(b => b.type === 'FLOW')
                        .map((flowBtn, idx) => (
                          <div key={idx} className="text-xs text-purple-600">
                            • {flowBtn.text}
                            {flowBtn.flow_name && ` - ${flowBtn.flow_name}`}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Image Upload (if required) */}
            {currentStep === 'upload' && requiresImageHeader && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Template Image
                  </CardTitle>
                  <CardDescription>
                    This template requires an image header. Upload an image that will be used for all messages in this batch.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ImageUploader
                    onUploadComplete={(id) => setMediaId(id)}
                    onRemove={() => setMediaId(null)}
                  />
                </CardContent>
              </Card>
            )}

            {/* CSV Upload */}
            {currentStep === 'upload' && (
              <CSVUploader
                onFileSelect={handleFileSelect}
                onDataParsed={handleDataParsed}
                disabled={sending}
                templateAnalysis={templateAnalysis}
              />
            )}

            {/* Column Mapping */}
            {currentStep === 'mapping' && templateAnalysis && (csvAnalysis || csvData.length > 0) && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Map CSV Columns to Template Variables</CardTitle>
                    <CardDescription>
                      Connect your CSV data to the template variables
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {csvError && (
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center text-yellow-800">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          <p className="text-sm">CSV analysis incomplete: {csvError}. You can still map columns manually.</p>
                        </div>
                      </div>
                    )}
                    <ColumnMapper
                      templateVariables={templateAnalysis.variables}
                      csvColumns={csvAnalysis?.columns || (csvData.length > 0 ? Object.keys(csvData[0]) : [])}
                      suggestions={{}}
                      columnMapping={columnMapping}
                      onChange={handleMappingChange}
                      phoneColumn={phoneColumn}
                      onPhoneColumnChange={handlePhoneColumnChange}
                      phoneSuggestions={csvAnalysis?.validation.phoneColumnDetected || []}
                      csvData={csvData}
                    />
                    <div className="mt-4 flex justify-end">
                      <Button 
                        onClick={() => {
                          if (csvData.length > 0) {
                            generatePreviewData(csvData, columnMapping, phoneColumn);
                            setCurrentStep('preview'); // Move step change here
                          } else {
                            setCurrentStep('preview');
                          }
                        }}
                        disabled={!phoneColumn || !templateAnalysis || templateAnalysis.variables.some(v => !columnMapping[v.index])}
                      >
                        Continue to Preview
                      </Button>
                    </div>
                    {!phoneColumn && (
                      <p className="text-sm text-red-600 mt-2">
                        Please select a phone number column before continuing.
                      </p>
                    )}
                    {phoneColumn && templateAnalysis && templateAnalysis.variables.some(v => !columnMapping[v.index]) && (
                      <p className="text-sm text-red-600 mt-2">
                        Please map all template variables before continuing.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Right Column - Preview and Controls */}
          <div className="space-y-6">
            {/* Live Template Preview - shown during mapping step */}
            {currentStep === 'mapping' && templateAnalysis && csvData.length > 0 && (
              <div className="lg:sticky lg:top-4 lg:self-start">
                <LiveTemplatePreview
                  template={template}
                  templateAnalysis={templateAnalysis}
                  columnMapping={columnMapping}
                  phoneColumn={phoneColumn}
                  csvData={csvData}
                />
              </div>
            )}

            {/* Selection Controls */}
            {currentStep === 'preview' && previewData.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      Preview Messages
                      {previewMetadata && (
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          {previewMetadata.showingAll 
                            ? `(All ${previewMetadata.totalRows} rows)` 
                            : `(Sample: ${previewMetadata.sampleSize} of ${previewMetadata.totalRows} rows)`
                          }
                        </span>
                      )}
                    </CardTitle>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={handleSelectAll}>
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Select All Valid
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                        <Square className="h-4 w-4 mr-2" />
                        Deselect All
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    {selectedValidRows.length} of {validRows.length} valid rows selected
                    {previewMetadata && !previewMetadata.showingAll && (
                      <span className="block text-xs text-blue-600 mt-1">
                        ℹ️ Showing first {previewMetadata.sampleSize} rows for validation. All {previewMetadata.totalRows} rows will be sent when you click Send.
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {previewData.map((row) => (
                      <div
                        key={row.index}
                        className={`flex items-start space-x-3 p-3 rounded-lg border ${
                          row.isValid ? 'border-gray-200' : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <Checkbox
                          checked={selectedRows.has(row.index)}
                          onCheckedChange={() => handleRowToggle(row.index)}
                          disabled={!row.isValid || sending}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {row.to}
                            </p>
                            <Badge variant={row.isValid ? 'success' : 'destructive'}>
                              {row.isValid ? 'Valid' : 'Invalid'}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {row.preview}
                          </p>
                          {row.errors.length > 0 && (
                            <div className="mt-2">
                              {row.errors.map((error, i) => (
                                <p key={i} className="text-xs text-red-600 flex items-center">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  {error}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Send Controls */}
            {currentStep === 'preview' && previewData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Send Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="batchSize">Batch Size</Label>
                      <Input
                        id="batchSize"
                        type="number"
                        value={batchSize}
                        onChange={(e) => setBatchSize(Number(e.target.value))}
                        min="1"
                        max="50"
                        disabled={sending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="batchDelay">Delay (seconds)</Label>
                      <Input
                        id="batchDelay"
                        type="number"
                        value={batchDelay}
                        onChange={(e) => setBatchDelay(Number(e.target.value))}
                        min="0"
                        max="60"
                        disabled={sending}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="dryRun"
                      checked={dryRun}
                      onCheckedChange={(checked) => setDryRun(checked as boolean)}
                      disabled={sending}
                    />
                    <Label htmlFor="dryRun">Dry run (test mode)</Label>
                  </div>

                  <Button
                    onClick={handleSend}
                    disabled={selectedRows.size === 0 || sending}
                    className="w-full"
                    size="lg"
                  >
                    {sending ? (
                      <>
                        <Pause className="h-4 w-4 mr-2 animate-pulse" />
                        Sending... ({sendResults.length}/{selectedRows.size})
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send {previewMetadata ? previewMetadata.totalRows : selectedRows.size} Messages
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Results Step */}
            {currentStep === 'results' && sendResults.length > 0 && (
              <SendStatus
                results={sendResults}
                onRetryFailed={handleRetryFailed}
                onStartOver={handleStartOver}
                onBackToTemplates={handleBackToTemplates}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
