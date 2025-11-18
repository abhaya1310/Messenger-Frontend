"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Download,
  ArrowLeft,
  CheckCircle,
  XCircle
} from "lucide-react";
import { SendResult } from "@/lib/types/mapping";

interface SendStatusProps {
  results: SendResult[];
  onRetryFailed: () => void;
  onStartOver: () => void;
  onBackToTemplates: () => void;
}

export function SendStatus({
  results,
  onRetryFailed,
  onStartOver,
  onBackToTemplates
}: SendStatusProps) {
  const successCount = results.filter(r => r.status === 'sent').length;
  const failedCount = results.filter(r => r.status === 'failed').length;
  const totalCount = results.length;
  const successRate = ((successCount / totalCount) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Successful
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">{successCount}</div>
            <p className="text-xs text-green-600 mt-1">{successRate}% success rate</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-700 flex items-center">
              <XCircle className="h-4 w-4 mr-2" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">{failedCount}</div>
            <p className="text-xs text-red-600 mt-1">{((failedCount / totalCount) * 100).toFixed(1)}% failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>What's Next?</CardTitle>
          <CardDescription>Choose an action based on your results</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {failedCount > 0 && (
            <Button onClick={onRetryFailed} className="w-full" size="lg">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry {failedCount} Failed Messages
            </Button>
          )}
          <Button onClick={onStartOver} variant="outline" className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Start Over with Same Template
          </Button>
          <Button onClick={onBackToTemplates} variant="outline" className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Template List
          </Button>
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Results</CardTitle>
          <CardDescription>View individual message statuses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div
                key={index}
                className={`flex items-start justify-between p-3 rounded-lg border ${
                  result.status === 'sent' 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start space-x-3 flex-1">
                  {result.status === 'sent' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium font-mono">{result.to}</p>
                      <Badge variant={result.status === 'sent' ? 'default' : 'destructive'}>
                        {result.status}
                      </Badge>
                    </div>
                    {result.preview && (
                      <p className="text-xs text-gray-600 line-clamp-2 mb-1">{result.preview}</p>
                    )}
                    {result.messageId && (
                      <p className="text-xs text-gray-500">Message ID: {result.messageId}</p>
                    )}
                    {result.error && (
                      <div className="mt-2 p-2 bg-red-100 rounded">
                        <p className="text-xs font-medium text-red-800">{result.error.code}</p>
                        <p className="text-xs text-red-700">{result.error.message}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Download Results Option */}
      <Card>
        <CardHeader>
          <CardTitle>Export Results</CardTitle>
          <CardDescription>Download send results for your records</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Download Results as CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
