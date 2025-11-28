"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Search, Filter, MessageSquare, Calendar, ArrowLeft, X, Workflow } from "lucide-react";
import { fetchTemplates, Template } from "@/lib/api";
import { getTemplatesFromCache, setTemplatesCache, getCacheInfo, clearTemplatesCache } from "@/lib/template-cache";
import { Breadcrumb } from "@/components/breadcrumb";
import { hasFlowComponent, getFlowButtons } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessagePreview } from "@/components/message-preview";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load templates from API
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try global cache first
      let templates = getTemplatesFromCache();
      
      if (!templates || templates.length === 0) {
        console.log('Templates page: Cache miss - fetching from API');
        const data = await fetchTemplates(15);
        templates = data.data || [];
        
        // Only cache if we got valid data
        if (templates.length > 0) {
          setTemplatesCache(templates);
        } else {
          console.warn('Templates page: No templates received from API');
        }
      } else {
        const cacheInfo = getCacheInfo();
        console.log(`Templates page: Cache hit - using ${cacheInfo.count} cached templates (age: ${cacheInfo.age}s)`);
      }
      
      setTemplates(templates);
    } catch (error) {
      console.error('Failed to load templates:', error);
      // Extract error message for display
      let errorMessage = 'Unable to load templates. This might be due to missing WABA_ID configuration or API permissions.';
      if (error instanceof Error) {
        if (error.message.includes('WABA_ID')) {
          errorMessage = error.message;
        } else if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
          errorMessage = 'Cannot connect to backend. Please verify NEXT_PUBLIC_BACKEND_URL is set correctly in your environment variables.';
        } else {
          errorMessage = error.message;
        }
      }
      setError(errorMessage);
      // Show empty state on error - no mock data
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshCache = async () => {
    try {
      // Clear frontend cache
      clearTemplatesCache();
      
      // Clear backend cache
      await fetch('/api/templates/cache/clear', { 
        method: 'POST',
        headers: { 'X-ADMIN-TOKEN': process.env.NEXT_PUBLIC_ADMIN_TOKEN || '' }
      });
      
      // Reload templates
      await loadTemplates();
    } catch (error) {
      console.error('Failed to refresh cache:', error);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'PENDING': return 'warning';
      case 'REJECTED': return 'destructive';
      case 'DISABLED': return 'secondary';
      default: return 'outline';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'AUTHENTICATION': return 'text-blue-600';
      case 'MARKETING': return 'text-green-600';
      case 'UTILITY': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  // Count variables in template
  const countTemplateVariables = (template: Template) => {
    let variableCount = 0;
    for (const component of template.components) {
      if (component.text) {
        const matches = component.text.match(/\{\{\d+\}\}/g);
        if (matches) {
          variableCount += matches.length;
        }
      }
    }
    return variableCount;
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.components.some(c => c.text?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || template.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || template.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleRefresh = async () => {
    await loadTemplates();
  };

  const handlePreview = (template: Template) => {
    setPreviewTemplate(template);
    setShowPreview(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Templates</h1>
              <p className="text-gray-600 mt-1">
                Manage your WhatsApp message templates
                {templates.length > 0 && (
                  <span className="ml-2 text-sm font-medium text-blue-600">
                    ({templates.length} templates loaded)
                  </span>
                )}
              </p>
            </div>
            <Button onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Templates
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={[{ label: "Templates" }]} />
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="DISABLED">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                    <SelectItem value="UTILITY">Utility</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button onClick={handleRefreshCache} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Templates
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const variableCount = countTemplateVariables(template);
            const bodyText = template.components.find(c => c.type === 'BODY')?.text || 'No body text';
            
            return (
              <Card key={template.name} className="hover:shadow-lg transition-shadow flex flex-col h-full">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-2">{template.name}</CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                        <span className={`text-sm font-medium whitespace-nowrap ${getCategoryColor(template.category)}`}>
                          {template.category}
                        </span>
                        <span className="text-gray-400" aria-hidden="true">•</span>
                        <span className="text-sm text-gray-500 whitespace-nowrap">{template.language}</span>
                        <span className="text-gray-400" aria-hidden="true">•</span>
                        <span className="text-sm text-blue-600 font-medium whitespace-nowrap">
                          {variableCount} variable{variableCount !== 1 ? 's' : ''}
                        </span>
                        {hasFlowComponent(template) && (
                          <>
                            <span className="text-gray-400" aria-hidden="true">•</span>
                            <span className="text-sm text-purple-600 font-medium whitespace-nowrap inline-flex items-center">
                              <Workflow className="h-3 w-3 mr-1 flex-shrink-0" />
                              Flow
                            </span>
                          </>
                        )}
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusBadgeVariant(template.status)} className="flex-shrink-0">
                      {template.status}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="flex flex-col h-full">
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {bodyText}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 gap-2">
                      <div className="flex items-center min-w-0">
                        <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate">Modified: {new Date(template.modified_time).toLocaleDateString()}</span>
                      </div>
                      {variableCount > 0 && (
                        <div className="flex items-center text-blue-600 whitespace-nowrap flex-shrink-0">
                          <MessageSquare className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span>Dynamic</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-4 mt-auto">
                    <Button asChild size="sm" className="flex-1">
                      <Link href={`/templates/${template.name}/send`} className="flex items-center justify-center">
                        <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                        Send
                      </Link>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handlePreview(template)}
                      className="flex-shrink-0"
                    >
                      Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredTemplates.length === 0 && !loading && (
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== "all" || categoryFilter !== "all"
                  ? "Try adjusting your filters to see more templates."
                  : error || "Unable to load templates. This might be due to missing WABA_ID configuration or API permissions. Check the console for details."}
              </p>
              <div className="space-y-2">
                <Button onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Templates
                </Button>
                <div className="text-xs text-gray-500 space-y-1">
                  {error?.includes('WABA_ID') ? (
                    <p>Make sure WABA_ID is set in your <strong>backend</strong> environment variables if you have a WhatsApp Business Account.</p>
                  ) : error?.includes('NEXT_PUBLIC_BACKEND_URL') || error?.includes('Cannot connect') ? (
                    <div className="space-y-1">
                      <p>⚠️ <strong>Configuration Issue:</strong> NEXT_PUBLIC_BACKEND_URL is not set or incorrect.</p>
                      <p>In Vercel, set <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_BACKEND_URL</code> to your backend URL (e.g., https://your-backend.vercel.app)</p>
                      <p className="text-gray-400 mt-2">Note: BACKEND_URL is different - you need NEXT_PUBLIC_BACKEND_URL for the frontend.</p>
                    </div>
                  ) : (
                    <p>Check the browser console (F12) for detailed error information.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Template Preview: {previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Badge variant={getStatusBadgeVariant(previewTemplate.status)}>
                  {previewTemplate.status}
                </Badge>
                <span className="text-sm text-gray-600">{previewTemplate.category}</span>
                <span className="text-sm text-gray-500">{previewTemplate.language}</span>
                {hasFlowComponent(previewTemplate) && (
                  <span className="text-sm text-purple-600 font-medium flex items-center">
                    <Workflow className="h-3 w-3 mr-1" />
                    Flow
                  </span>
                )}
              </div>
              
              <MessagePreview
                templateName={previewTemplate.name}
                language={previewTemplate.language}
                preview={previewTemplate.components.find(c => c.type === 'BODY')?.text || 'No body text'}
                hasForm={false}
                flowButtons={getFlowButtons(previewTemplate).map(b => ({
                  text: b.text,
                  flow_name: b.flow_name,
                  flow_id: b.flow_id,
                  flow_action: b.flow_action,
                  navigate_screen: b.navigate_screen
                }))}
              />
              
              <div className="text-xs text-gray-500">
                <p>Created: {new Date(previewTemplate.created_time).toLocaleString()}</p>
                <p>Modified: {new Date(previewTemplate.modified_time).toLocaleString()}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
