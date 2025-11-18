"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";

interface CSVUploaderProps {
  onFileSelect: (file: File) => void;
  onDataParsed: (data: any[], file?: File) => void;
  disabled?: boolean;
  templateAnalysis?: {
    variableCount: number;
    variables: Array<{ index: number; label: string; type: string }>;
  } | null;
}

export function CSVUploader({ onFileSelect, onDataParsed, disabled, templateAnalysis }: CSVUploaderProps) {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadStatus('uploading');
    setError(null);
    setFileName(file.name);

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file');
      setUploadStatus('error');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      setUploadStatus('error');
      return;
    }

    try {
      onFileSelect(file);
      
      // Parse CSV
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            setError('CSV must have at least a header row and one data row');
            setUploadStatus('error');
            return;
          }

          // Parse header
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          
          // Dynamic validation based on template requirements
          if (templateAnalysis) {
            const csvColumnCount = headers.length;
            const templateVariableCount = templateAnalysis.variableCount;
            
            if (csvColumnCount < templateVariableCount) {
              setError(`Cannot proceed: CSV has ${csvColumnCount} columns but template requires ${templateVariableCount} variables. Please upload a CSV with at least ${templateVariableCount} columns.`);
              setUploadStatus('error');
              return;
            }
          }

          // Parse data rows
          const data = lines.slice(1).map((line, index) => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const row: any = { _rowIndex: index };
            
            headers.forEach((header, i) => {
              row[header] = values[i] || '';
            });
            
            return row;
          });

          onDataParsed(data, file);
          setUploadStatus('success');
        } catch (parseError) {
          setError('Failed to parse CSV file');
          setUploadStatus('error');
        }
      };
      
      reader.readAsText(file);
    } catch (err) {
      setError('Failed to process file');
      setUploadStatus('error');
    }
  }, [onFileSelect, onDataParsed]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false,
    disabled
  });

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
        return <Upload className="h-8 w-8 text-blue-500 animate-pulse" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-500" />;
      default:
        return <Upload className="h-8 w-8 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (uploadStatus) {
      case 'uploading':
        return 'Processing file...';
      case 'success':
        return 'File uploaded successfully';
      case 'error':
        return 'Upload failed';
      default:
        return 'Drop your CSV file here, or click to select';
    }
  };

  const getStatusBadge = () => {
    switch (uploadStatus) {
      case 'success':
        return <Badge variant="success">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'uploading':
        return <Badge variant="outline">Processing</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
            ${uploadStatus === 'success' ? 'border-green-500 bg-green-50' : ''}
            ${uploadStatus === 'error' ? 'border-red-500 bg-red-50' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400'}
          `}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center space-y-4">
            {getStatusIcon()}
            
            <div className="space-y-2">
              <p className={`text-lg font-medium ${
                uploadStatus === 'success' ? 'text-green-700' : 
                uploadStatus === 'error' ? 'text-red-700' : 
                'text-gray-700'
              }`}>
                {getStatusText()}
              </p>
              
              {fileName && (
                <div className="flex items-center justify-center space-x-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{fileName}</span>
                  {getStatusBadge()}
                </div>
              )}
              
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>
            
            {uploadStatus === 'idle' && (
              <Button variant="outline" disabled={disabled}>
                <Upload className="h-4 w-4 mr-2" />
                Select CSV File
              </Button>
            )}
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p className="font-medium mb-2">
            {templateAnalysis ? `Template requires ${templateAnalysis.variableCount} columns:` : 'CSV format:'}
          </p>
          <div className="bg-gray-50 p-3 rounded text-left">
            {templateAnalysis ? (
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  Your CSV must have at least {templateAnalysis.variableCount} columns to match the template variables.
                </p>
                <p className="text-xs text-gray-500">
                  Include columns for: {templateAnalysis.variables.map(v => v.label).join(', ')}
                </p>
              </div>
            ) : (
              <div>
                <p className="font-mono text-xs">
                  caller,company,number,date,agent
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  John Doe,Acme Corp,+1234567890,2024-01-15,Jane Smith
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
