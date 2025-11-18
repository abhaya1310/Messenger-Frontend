"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  BarChart3, 
  TrendingUp, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Star,
  Download,
  Calendar,
  Filter
} from "lucide-react";
import { 
  exportAnalytics, 
  AnalyticsData,
  fetchAnalyticsSummary,
  fetchTemplatesAnalytics,
  fetchTemplateVariables,
  fetchTopValues
} from "@/lib/api";
import { Breadcrumb } from "@/components/breadcrumb";

interface FormResponse {
  id: string;
  clientPhone: string;
  rating: number;
  feedback: string;
  submittedAt: string;
  templateName: string;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [formResponses, setFormResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7d");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [language, setLanguage] = useState<string | undefined>(undefined);
  const [orgId] = useState<string | undefined>(process.env.NEXT_PUBLIC_DEFAULT_ORG_ID);
  const [templatesList, setTemplatesList] = useState<Array<{ templateName: string; templateLanguage: string }>>([]);
  const [variablesList, setVariablesList] = useState<string[]>([]);
  const [selectedVariable, setSelectedVariable] = useState<string | undefined>(undefined);
  const [topValues, setTopValues] = useState<Array<{ value: string; count: number; delivered: number; read: number; responded: number; avgRating?: number }>>([]);

  // Load template list initially and when language/org changes
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchTemplatesAnalytics({ language, orgId });
        const data = (res?.data || []).map((r: any) => ({ templateName: r.templateName, templateLanguage: r.templateLanguage }));
        setTemplatesList(data);
      } catch (e) {
        console.error('Failed to load templates analytics', e);
      }
    })();
  }, [language, orgId]);

  // Load summary analytics + variables + top values
  useEffect(() => {
    loadAnalytics();
  }, [dateRange, templateFilter, language, orgId, selectedVariable]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const { start, end } = resolveRange(dateRange);
      const summary = await fetchAnalyticsSummary({ start, end, language, orgId });
      // Map to existing AnalyticsData shape for cards
      const mapped: AnalyticsData = {
        totalConversations: 0,
        activeConversations: 0,
        closedConversations: 0,
        archivedConversations: 0,
        totalMessages: 0,
        avgMessagesPerConversation: 0,
        totalSent: summary.totalSent || 0,
        deliveryRate: summary.deliveryRate || 0,
        totalDelivered: summary.totalDelivered || 0,
        responseRate: 0,
        readRate: summary.readRate || 0,
        totalRead: summary.totalRead || 0,
      };
      setAnalytics(mapped);

      // Variables for selected template
      const templateName = templateFilter !== 'all' ? templateFilter : (templatesList[0]?.templateName || undefined);
      if (templateName) {
        const vars = await fetchTemplateVariables(templateName, { start, end, language, orgId });
        const varNames: string[] = vars?.variables || [];
        setVariablesList(varNames);
        const useVar = selectedVariable || varNames[0];
        if (useVar) {
          const tops = await fetchTopValues(templateName, useVar, { start, end, language, limit: 50, orgId });
          setTopValues(tops?.data || []);
        } else {
          setTopValues([]);
        }
      } else {
        setVariablesList([]);
        setTopValues([]);
      }
      
      // For now, keep mock form responses since we don't have a form responses API yet
      const mockResponses: FormResponse[] = [
        {
          id: "1",
          clientPhone: "+1234567890",
          rating: 5,
          feedback: "Excellent service! Very satisfied with the support.",
          submittedAt: "2024-01-20T10:30:00Z",
          templateName: "feedback"
        },
        {
          id: "2",
          clientPhone: "+1234567891",
          rating: 4,
          feedback: "Good service overall, but could be faster.",
          submittedAt: "2024-01-20T09:15:00Z",
          templateName: "feedback"
        },
        {
          id: "3",
          clientPhone: "+1234567892",
          rating: 3,
          feedback: "Average experience. Room for improvement.",
          submittedAt: "2024-01-19T16:45:00Z",
          templateName: "feedback"
        }
      ];
      setFormResponses(mockResponses);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      // Fallback to empty data on error
      setAnalytics({
        totalConversations: 0,
        activeConversations: 0,
        closedConversations: 0,
        archivedConversations: 0,
        totalMessages: 0,
        avgMessagesPerConversation: 0,
        totalSent: 0,
        deliveryRate: 0,
        totalDelivered: 0,
        responseRate: 0,
        readRate: 0,
        totalRead: 0
      });
    } finally {
      setLoading(false);
    }
  };

  function resolveRange(r: string): { start: string; end: string } {
    const end = new Date();
    const start = new Date(end);
    if (r === '1d') start.setDate(end.getDate() - 1);
    else if (r === '7d') start.setDate(end.getDate() - 7);
    else if (r === '30d') start.setDate(end.getDate() - 30);
    else if (r === '90d') start.setDate(end.getDate() - 90);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-600";
    if (rating >= 3) return "text-yellow-600";
    return "text-red-600";
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "text-yellow-400 fill-current" : "text-gray-300"
        }`}
      />
    ));
  };

  const handleExport = async () => {
    try {
      await exportAnalytics();
    } catch (error) {
      console.error('Failed to export analytics:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">Track message performance and customer feedback</p>
            </div>
            <div className="flex space-x-4">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={[{ label: "Analytics" }]} />
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
                <Label htmlFor="dateRange">Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1d">Last 24 hours</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="template">Template</Label>
                <Select value={templateFilter} onValueChange={setTemplateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All templates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Templates</SelectItem>
                    {templatesList.map((t) => (
                      <SelectItem key={`${t.templateName}:${t.templateLanguage}`} value={t.templateName}>
                        {t.templateName} ({t.templateLanguage})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={language ?? "all"} onValueChange={(v) => setLanguage(v === 'all' ? undefined : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All languages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {Array.from(new Set(templatesList.map(t => t.templateLanguage))).map(lang => (
                      <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customRange">Custom Range</Label>
                <div className="flex space-x-2">
                  <Input type="date" placeholder="Start date" />
                  <Input type="date" placeholder="End date" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalConversations.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                All time conversations
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Conversations</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.activeConversations.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Currently ongoing
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalMessages.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                All messages sent/received
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Messages/Conversation</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.avgMessagesPerConversation.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                Average engagement
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Variable Top Values */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Top Values</CardTitle>
            <CardDescription>Variable-wise distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="variable">Variable</Label>
                <Select value={selectedVariable || ""} onValueChange={(v) => setSelectedVariable(v || undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select variable" />
                  </SelectTrigger>
                  <SelectContent>
                    {variablesList.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-2 pr-6">Value</th>
                    <th className="py-2 pr-6">Count</th>
                    <th className="py-2 pr-6">Delivered</th>
                    <th className="py-2 pr-6">Read</th>
                    <th className="py-2 pr-6">Responded</th>
                    <th className="py-2 pr-6">Avg Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {topValues.map((row) => (
                    <tr key={row.value} className="border-t">
                      <td className="py-2 pr-6 font-mono truncate max-w-xs" title={row.value}>{row.value || '—'}</td>
                      <td className="py-2 pr-6">{row.count}</td>
                      <td className="py-2 pr-6">{row.delivered}</td>
                      <td className="py-2 pr-6">{row.read}</td>
                      <td className="py-2 pr-6">{row.responded}</td>
                      <td className="py-2 pr-6">{row.avgRating ? row.avgRating.toFixed(2) : '—'}</td>
                    </tr>
                  ))}
                  {topValues.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-gray-500">No data</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Delivery Funnel */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Funnel</CardTitle>
              <CardDescription>Message delivery progression</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sent</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                    <span className="text-sm text-gray-600">{analytics?.totalSent}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Delivered</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${analytics?.deliveryRate}%` }}></div>
                    </div>
                    <span className="text-sm text-gray-600">{analytics?.totalDelivered}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Read</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${analytics?.readRate}%` }}></div>
                    </div>
                    <span className="text-sm text-gray-600">{analytics?.totalRead}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Responded</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${analytics?.responseRate}%` }}></div>
                    </div>
                    <span className="text-sm text-gray-600">{analytics?.totalRead}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rating Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Rating Distribution</CardTitle>
              <CardDescription>Customer satisfaction scores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = formResponses.filter(r => r.rating === rating).length;
                  const percentage = formResponses.length > 0 ? (count / formResponses.length) * 100 : 0;
                  
                  return (
                    <div key={rating} className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1 w-16">
                        <span className="text-sm font-medium">{rating}</span>
                        <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-500 h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Form Responses */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Form Responses</CardTitle>
            <CardDescription>Latest customer feedback and ratings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formResponses.map((response) => (
                <div key={response.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-mono text-sm text-gray-600">
                          {response.clientPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                        </span>
                        <Badge variant="outline">{response.templateName}</Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(response.submittedAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium">Rating:</span>
                        <div className="flex items-center space-x-1">
                          {getRatingStars(response.rating)}
                        </div>
                        <span className={`text-sm font-medium ${getRatingColor(response.rating)}`}>
                          {response.rating}/5
                        </span>
                      </div>
                      
                      {response.feedback && (
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                          "{response.feedback}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {formResponses.length === 0 && (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No responses yet</h3>
                  <p className="text-gray-600">
                    Customer responses will appear here once they start filling out feedback forms.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
