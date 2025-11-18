"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, BarChart3, Send, RefreshCw, Target, Database, TrendingUp, Users } from "lucide-react";
import { fetchTemplates, fetchAnalytics, Template, AnalyticsData } from "@/lib/api";
import { getTemplatesFromCache, setTemplatesCache } from "@/lib/template-cache";

export default function Dashboard() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Try global cache first for templates
      let templates = getTemplatesFromCache();
      
      if (!templates) {
        console.log('Dashboard: Cache miss - fetching templates from API');
        const templatesResponse = await fetchTemplates(15);
        templates = templatesResponse.data || [];
        setTemplatesCache(templates);
      } else {
        console.log('Dashboard: Cache hit - using cached templates');
      }
      
      setTemplates(templates);
      
      // Fetch analytics (no caching needed for this)
      try {
        const analyticsResponse = await fetchAnalytics();
        setAnalytics(analyticsResponse);
      } catch (error) {
        console.error('Failed to load analytics:', error);
        // Set default analytics data if fetch fails
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
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshTemplates = () => {
    router.push('/templates');
  };

  const handleSendMessages = () => {
    router.push('/templates');
  };

  const approvedTemplates = templates.filter(t => t.status === 'APPROVED');
  const dynamicTemplates = templates.filter(t => {
    const bodyText = t.components.find(c => c.type === 'BODY')?.text || '';
    return bodyText.includes('{{') && bodyText.includes('}}');
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">WhatsApp Template Manager</h1>
              <p className="text-gray-600 mt-1">Manage templates and send feedback messages</p>
            </div>
            <div className="flex space-x-4">
              <Button variant="outline" size="sm" onClick={handleRefreshTemplates}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Templates
              </Button>
              <Button size="sm" onClick={handleSendMessages}>
                <Send className="h-4 w-4 mr-2" />
                Send Messages
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{templates.length}</div>
              <p className="text-xs text-muted-foreground">
                {approvedTemplates.length} approved, {dynamicTemplates.length} dynamic
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalSent || 0}</div>
              <p className="text-xs text-muted-foreground">
                {analytics?.deliveryRate ? `${analytics.deliveryRate.toFixed(1)}%` : '0%'} delivery rate
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Conversations</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.activeConversations || 0}</div>
              <p className="text-xs text-muted-foreground">
                {analytics?.totalConversations || 0} total conversations
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics?.responseRate ? `${analytics.responseRate.toFixed(1)}%` : '0%'}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics?.avgMessagesPerConversation ? analytics.avgMessagesPerConversation.toFixed(1) : '0'} avg messages/conversation
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow flex flex-col h-full">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2 text-blue-600" />
                Template Management
              </CardTitle>
              <CardDescription>
                View and manage your WhatsApp message templates
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 pb-6">
              <div className="space-y-4 flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Available Templates</p>
                    <p className="text-sm text-muted-foreground">
                      {approvedTemplates.length} approved, {dynamicTemplates.length} dynamic
                    </p>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              </div>
              <Button asChild className="w-full mt-8">
                <Link href="/templates">
                  <Target className="h-4 w-4 mr-2" />
                  Manage Templates
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow flex flex-col h-full">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-green-600" />
                Monitor Conversations
              </CardTitle>
              <CardDescription>
                View/manage all WhatsApp conversations in real-time
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 pb-6">
              <div className="space-y-4 flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Active Conversations</p>
                    <p className="text-sm text-muted-foreground">
                      {analytics?.activeConversations || 0} ongoing chats
                    </p>
                  </div>
                  <Badge variant="outline">Live</Badge>
                </div>
              </div>
              <Button asChild className="w-full mt-8">
                <Link href="/monitor">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Open Monitor
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow flex flex-col h-full">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
                Analytics
              </CardTitle>
              <CardDescription>
                View performance metrics and conversation analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 pb-6">
              <div className="space-y-4 flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Performance Metrics</p>
                    <p className="text-sm text-muted-foreground">
                      Delivery rates, response rates, and more
                    </p>
                  </div>
                  <Badge variant="outline">Live</Badge>
                </div>
              </div>
              <Button asChild className="w-full mt-8">
                <Link href="/analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest template sends and responses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Feedback template sent to 50 customers</p>
                  <p className="text-xs text-muted-foreground">2 minutes ago</p>
                </div>
                <Badge variant="success">Completed</Badge>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">New template "welcome_message" approved</p>
                  <p className="text-xs text-muted-foreground">1 hour ago</p>
                </div>
                <Badge variant="default">Approved</Badge>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Template "promo_offer" pending review</p>
                  <p className="text-xs text-muted-foreground">3 hours ago</p>
                </div>
                <Badge variant="warning">Pending</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}