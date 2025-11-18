"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Star, MessageCircle, X, ExternalLink } from "lucide-react";

interface MessagePreviewProps {
  templateName: string;
  language: string;
  preview: string;
  hasForm?: boolean;
  formType?: 'rating' | 'feedback' | 'both';
  flowButtons?: Array<{
    text: string;
    flow_name?: string;
    flow_id?: string;
    flow_action?: string;
    navigate_screen?: string;
  }>;
  className?: string;
}

export function MessagePreview({ 
  templateName, 
  language, 
  preview, 
  hasForm = false,
  formType = 'both',
  flowButtons,
  className 
}: MessagePreviewProps) {
  const [showFlowPreview, setShowFlowPreview] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<any>(null);
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Template Info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900">{templateName}</h3>
          <p className="text-sm text-gray-500">{language}</p>
        </div>
        <Badge variant="outline">Template</Badge>
      </div>

      {/* WhatsApp Message Bubble */}
      <div className="flex justify-start">
        <div className="max-w-xs lg:max-w-md">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-2">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {preview}
                    </p>
                  </div>
                  
                  {/* Flow buttons display */}
                  {flowButtons && flowButtons.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">Interactive Flow:</p>
                      {flowButtons.map((button, idx) => (
                        <div key={idx} className="mb-3">
                          <button
                            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium border border-blue-500 hover:bg-blue-600 transition-colors cursor-pointer flex items-center justify-center"
                            onClick={() => {
                              setSelectedFlow(button);
                              setShowFlowPreview(true);
                            }}
                          >
                            {button.text}
                            {button.flow_name && (
                              <span className="ml-2 text-xs text-blue-100">
                                ({button.flow_name})
                              </span>
                            )}
                          </button>
                          
                          {/* Flow Details - Collapsible */}
                          <details className="mt-2">
                            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                              View Flow Details
                            </summary>
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                              <div className="space-y-1">
                                {button.flow_id && (
                                  <div><span className="font-medium">Flow ID:</span> {button.flow_id}</div>
                                )}
                                {button.flow_action && (
                                  <div><span className="font-medium">Action:</span> {button.flow_action}</div>
                                )}
                                {button.navigate_screen && (
                                  <div><span className="font-medium">Screen:</span> {button.navigate_screen}</div>
                                )}
                                {!button.flow_id && !button.flow_action && !button.navigate_screen && (
                                  <div className="text-gray-500 italic">Flow details not available</div>
                                )}
                              </div>
                            </div>
                          </details>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Form Preview */}
                  {hasForm && (
                    <div className="mt-3 bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <MessageCircle className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">Feedback Form</span>
                        </div>
                        
                        {(formType === 'rating' || formType === 'both') && (
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600">Rate your experience:</p>
                            <div className="flex space-x-1">
                              {[2, 3, 4, 5].map((rating) => (
                                <button
                                  key={rating}
                                  className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center text-sm hover:bg-gray-50"
                                  disabled
                                >
                                  {rating}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {(formType === 'feedback' || formType === 'both') && (
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600">How could we do better?</p>
                            <div className="border border-gray-300 rounded-lg p-2 bg-gray-50">
                              <p className="text-xs text-gray-500">Leave a comment (optional)</p>
                              <p className="text-xs text-gray-400 mt-1">0/600</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex justify-end">
                          <button 
                            className="px-4 py-1 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50"
                            disabled
                          >
                            Continue
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>WhatsApp</span>
                    <span>now</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Form Features Info */}
      {hasForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <Star className="h-4 w-4 text-blue-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">Interactive Form</p>
              <p className="text-blue-700">
                This template includes a WhatsApp Flow form that customers can fill out directly in their chat.
                Responses will be automatically collected and stored.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Flow Preview Modal */}
      {showFlowPreview && selectedFlow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Flow Preview: {selectedFlow.text}</h3>
              <button
                onClick={() => setShowFlowPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Flow Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Flow Details</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Flow Name:</span> {selectedFlow.text}</div>
                  {selectedFlow.flow_name && (
                    <div><span className="font-medium">Flow Display Name:</span> {selectedFlow.flow_name}</div>
                  )}
                  {selectedFlow.flow_id && (
                    <div><span className="font-medium">Flow ID:</span> {selectedFlow.flow_id}</div>
                  )}
                  {selectedFlow.flow_action && (
                    <div><span className="font-medium">Action:</span> {selectedFlow.flow_action}</div>
                  )}
                  {selectedFlow.navigate_screen && (
                    <div><span className="font-medium">Target Screen:</span> {selectedFlow.navigate_screen}</div>
                  )}
                </div>
              </div>

              {/* Flow Preview Simulation */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Flow Preview</h4>
                <div className="space-y-3">
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <MessageSquare className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-sm font-medium">WhatsApp Flow</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      This flow would open an interactive experience where users can:
                    </p>
                    <ul className="text-sm text-gray-600 mt-2 space-y-1">
                      <li>• Navigate through multiple screens</li>
                      <li>• Fill out forms and provide feedback</li>
                      <li>• Complete surveys or questionnaires</li>
                      <li>• Submit data that gets sent back to your system</li>
                    </ul>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <ExternalLink className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-700">Interactive Experience</span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      Users will see a full-screen interactive flow when they tap this button
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowFlowPreview(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close Preview
                </button>
                <button
                  onClick={() => {
                    alert('In a real implementation, this would open the flow editor or flow management interface.');
                  }}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Manage Flow
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
