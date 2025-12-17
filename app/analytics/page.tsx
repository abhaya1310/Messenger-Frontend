"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart3,
  TrendingUp,
  MessageSquare,
  CheckCircle,
  Users,
  Star,
  Download,
  Filter,
  Loader2,
  RefreshCcw,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  exportAnalytics,
  fetchCampaignAnalytics,
  fetchSegmentCounts,
  fetchSyncStatus,
  fetchAnalyticsSummary,
  fetchTemplatesAnalytics,
} from "@/lib/api";
import type { CampaignAnalytics, CustomerAnalytics, Campaign, SegmentCounts } from "@/lib/types/campaign";
import type { SyncStatus } from "@/lib/types/pos";
import { Breadcrumb } from "@/components/breadcrumb";

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7d");

  // Analytics data
  const [campaignAnalytics, setCampaignAnalytics] = useState<CampaignAnalytics | null>(null);
  const [customerAnalytics, setCustomerAnalytics] = useState<CustomerAnalytics | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [messageSummary, setMessageSummary] = useState<{
    totalSent: number;
    totalDelivered: number;
    totalRead: number;
    deliveryRate: number;
    readRate: number;
  } | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const resolveRange = (r: string): { start: string; end: string } => {
    const end = new Date();
    const start = new Date(end);
    if (r === '1d') start.setDate(end.getDate() - 1);
    else if (r === '7d') start.setDate(end.getDate() - 7);
    else if (r === '30d') start.setDate(end.getDate() - 30);
    else if (r === '90d') start.setDate(end.getDate() - 90);
    return { start: start.toISOString(), end: end.toISOString() };
  };

  async function loadAnalytics() {
    setLoading(true);
    try {
      const { start, end } = resolveRange(dateRange);

      const [campaignData, customerData, summaryData, syncData] = await Promise.allSettled([
        fetchCampaignAnalytics(),
        fetchSegmentCounts(),
        fetchAnalyticsSummary({ start, end }),
        fetchSyncStatus(),
      ]);

      if (campaignData.status === 'fulfilled') {
        setCampaignAnalytics(campaignData.value);
      }

      if (customerData.status === 'fulfilled') {
        const segments = customerData.value as SegmentCounts;
        setCustomerAnalytics({
          summary: {
            totalCustomers: segments.total || 0,
            newCustomersThisMonth: segments.frequency?.new || 0,
            activeCustomers: segments.recency?.active || 0,
            lapsedCustomers: segments.recency?.lapsed || 0,
          },
          visitTrends: [],
          topCustomers: [],
        });
      }

      if (summaryData.status === 'fulfilled') {
        setMessageSummary(summaryData.value);
      }

      if (syncData.status === 'fulfilled') {
        setSyncStatus(syncData.value);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  }

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
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[var(--connectnow-accent-strong)]" />
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
              <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
              <p className="text-gray-600 mt-1">Track your campaign and customer performance</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={loadAnalytics}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
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
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1d">Last 24 hours</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="sync">POS Sync</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Messages Sent</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(messageSummary?.totalSent || campaignAnalytics?.summary.totalSent || 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                    All campaigns combined
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(messageSummary?.deliveryRate || campaignAnalytics?.summary.deliveryRate || 0).toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(messageSummary?.totalDelivered || campaignAnalytics?.summary.totalDelivered || 0).toLocaleString()} delivered
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Read Rate</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(messageSummary?.readRate || campaignAnalytics?.summary.readRate || 0).toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(messageSummary?.totalRead || campaignAnalytics?.summary.totalRead || 0).toLocaleString()} read
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(customerAnalytics?.summary.totalCustomers || 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                    {customerAnalytics?.summary.newCustomersThisMonth || 0} new this month
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Delivery Funnel */}
              <Card>
                <CardHeader>
                  <CardTitle>Message Delivery Funnel</CardTitle>
                  <CardDescription>Message progression through delivery stages</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: "Sent", value: campaignAnalytics?.summary.totalSent || 0, color: "bg-blue-500", percent: 100 },
                      { label: "Delivered", value: campaignAnalytics?.summary.totalDelivered || 0, color: "bg-green-500", percent: campaignAnalytics?.summary.deliveryRate || 0 },
                      { label: "Read", value: campaignAnalytics?.summary.totalRead || 0, color: "bg-purple-500", percent: campaignAnalytics?.summary.readRate || 0 },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-sm font-medium w-24">{item.label}</span>
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-full bg-gray-100 rounded-full h-3">
                            <div
                              className={`${item.color} h-3 rounded-full transition-all`}
                              style={{ width: `${item.percent}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-20 text-right">
                            {item.value.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Customer Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Status</CardTitle>
                  <CardDescription>Active vs lapsed customer distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-sm">Active Customers</span>
                      </div>
                      <span className="font-semibold">
                        {customerAnalytics?.summary.activeCustomers?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span className="text-sm">Lapsed Customers</span>
                      </div>
                      <span className="font-semibold">
                        {customerAnalytics?.summary.lapsedCustomers?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="text-sm">New This Month</span>
                      </div>
                      <span className="font-semibold">
                        {customerAnalytics?.summary.newCustomersThisMonth?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Total</span>
                        <span className="text-xl font-bold text-[var(--connectnow-accent-strong)]">
                          {customerAnalytics?.summary.totalCustomers?.toLocaleString() || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{campaignAnalytics?.summary.totalCampaigns || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {campaignAnalytics?.summary.activeCampaigns || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg Delivery Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {campaignAnalytics?.summary.deliveryRate?.toFixed(1) || 0}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Campaign Type Breakdown */}
            {campaignAnalytics?.byType && campaignAnalytics.byType.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Performance by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Sent</TableHead>
                        <TableHead className="text-right">Delivered</TableHead>
                        <TableHead className="text-right">Delivery %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaignAnalytics.byType.map((item) => (
                        <TableRow key={item.type}>
                          <TableCell className="font-medium capitalize">{item.type}</TableCell>
                          <TableCell className="text-right">{item.count}</TableCell>
                          <TableCell className="text-right">{item.sent.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{item.delivered.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            {item.sent > 0 ? ((item.delivered / item.sent) * 100).toFixed(1) : 0}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Recent Campaigns */}
            {campaignAnalytics?.recentCampaigns && campaignAnalytics.recentCampaigns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Campaigns</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Sent</TableHead>
                        <TableHead className="text-right">Delivered</TableHead>
                        <TableHead className="text-right">Read</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaignAnalytics.recentCampaigns.slice(0, 5).map((campaign) => (
                        <TableRow key={campaign._id}>
                          <TableCell className="font-medium">{campaign.name}</TableCell>
                          <TableCell>
                            <Badge variant={campaign.status === 'completed' ? 'secondary' : 'default'}>
                              {campaign.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{campaign.metrics.sentCount}</TableCell>
                          <TableCell className="text-right">{campaign.metrics.deliveredCount}</TableCell>
                          <TableCell className="text-right">{campaign.metrics.readCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {customerAnalytics?.summary.totalCustomers?.toLocaleString() || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {customerAnalytics?.summary.activeCustomers?.toLocaleString() || 0}
                  </div>
                  <p className="text-xs text-gray-500">Visited in last 30 days</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Lapsed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">
                    {customerAnalytics?.summary.lapsedCustomers?.toLocaleString() || 0}
                  </div>
                  <p className="text-xs text-gray-500">No visit in 30+ days</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">New This Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {customerAnalytics?.summary.newCustomersThisMonth?.toLocaleString() || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Customers */}
            {customerAnalytics?.topCustomers && customerAnalytics.topCustomers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Customers by Spend</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Total Visits</TableHead>
                        <TableHead className="text-right">Total Spend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerAnalytics.topCustomers.map((customer, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell className="text-right">{customer.visits}</TableCell>
                          <TableCell className="text-right font-semibold">
                            ₹{customer.totalSpend.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Visit Trends */}
            {customerAnalytics?.visitTrends && customerAnalytics.visitTrends.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Visit Trends</CardTitle>
                  <CardDescription>Daily visits and revenue</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] flex items-end justify-between gap-1">
                    {customerAnalytics.visitTrends.slice(-14).map((day, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-[var(--connectnow-accent)] rounded-t"
                          style={{
                            height: `${Math.max(20, (day.visits / Math.max(...customerAnalytics.visitTrends.map(d => d.visits))) * 150)}px`
                          }}
                        />
                        <span className="text-xs text-gray-500">
                          {new Date(day.date).toLocaleDateString('en-US', { day: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* POS Sync Tab */}
          <TabsContent value="sync" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>POS Sync Status</CardTitle>
                <CardDescription>Monitor the synchronization with your POS system</CardDescription>
              </CardHeader>
              <CardContent>
                {syncStatus?.lastSync ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Last Sync</p>
                        <p className="text-sm text-gray-500">
                          {new Date(syncStatus.lastSync.completedAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={syncStatus.lastSync.status === 'completed' ? 'default' : 'secondary'}>
                        {syncStatus.lastSync.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold">{syncStatus.lastSync.stats.recordsProcessed}</p>
                        <p className="text-sm text-gray-600">Processed</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold">{syncStatus.lastSync.stats.recordsCreated}</p>
                        <p className="text-sm text-gray-600">Created</p>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <p className="text-2xl font-bold">{syncStatus.lastSync.stats.recordsFailed}</p>
                        <p className="text-sm text-gray-600">Failed</p>
                      </div>
                    </div>

                    {syncStatus.syncHistory && syncStatus.syncHistory.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-medium mb-3">Sync History</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Type</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Records</TableHead>
                              <TableHead>Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {syncStatus.syncHistory.slice(0, 10).map((sync, index) => (
                              <TableRow key={index}>
                                <TableCell className="capitalize">{sync.type}</TableCell>
                                <TableCell>
                                  <Badge variant={sync.status === 'completed' ? 'default' : 'secondary'}>
                                    {sync.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>{sync.recordsProcessed}</TableCell>
                                <TableCell>
                                  {new Date(sync.completedAt).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <RefreshCcw className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No sync data available</p>
                    <p className="text-sm">POS sync status will appear here once configured</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
