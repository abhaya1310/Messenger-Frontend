"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Info,
  TrendingUp,
  ArrowUpRight,
  Gift,
  RefreshCcw,
  Users,
  Megaphone,
  MessageCircle,
  Calendar,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import {
  fetchDashboardOverview,
  fetchAutoCampaignStats,
  fetchCreditsMe,
  fetchSegmentCounts,
  fetchCustomers,
} from "@/lib/api";
import type { DashboardOverview, SegmentCounts, AutoCampaignStats } from "@/lib/types/campaign";
import type { POSCustomer } from "@/lib/types/pos";
import type { CreditsState } from "@/lib/types/credits";

export default function DashboardPage() {
  const { orgName } = useAuth();
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<CreditsState | null>(null);
  const [creditsError, setCreditsError] = useState<string | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [segmentsError, setSegmentsError] = useState<string | null>(null);
  const [autoCampaignsError, setAutoCampaignsError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const autoRefreshRef = useRef<number | null>(null);

  // Analytics state - using new API types
  const [dashboardOverview, setDashboardOverview] = useState<DashboardOverview | null>(null);
  const [segmentCounts, setSegmentCounts] = useState<SegmentCounts | null>(null);
  const [autoCampaignStats, setAutoCampaignStats] = useState<AutoCampaignStats | null>(null);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<POSCustomer[]>([]);

  useEffect(() => {
    loadDashboardData();

    autoRefreshRef.current = window.setInterval(() => {
      loadDashboardData({ silent: true });
    }, 60000);

    return () => {
      if (autoRefreshRef.current) {
        window.clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    };
  }, []);

  async function loadDashboardData(opts?: { silent?: boolean }) {
    if (loadingRef.current) return;
    loadingRef.current = true;

    if (!opts?.silent) {
      setLoading(true);
    }

    setOverviewError(null);
    setSegmentsError(null);
    setAutoCampaignsError(null);
    setCreditsError(null);

    const [overviewData, segmentsData, autoCampaignsData, customersData, creditsData] = await Promise.allSettled([
      fetchDashboardOverview(),
      fetchSegmentCounts(),
      fetchAutoCampaignStats(),
      fetchCustomers({ limit: 10, sortBy: "lastVisitAt", sortOrder: "desc" }),
      fetchCreditsMe(),
    ]);

    if (overviewData.status === "fulfilled") {
      setDashboardOverview(overviewData.value);
    } else {
      setOverviewError(overviewData.reason instanceof Error ? overviewData.reason.message : "Failed to refresh");
    }

    if (segmentsData.status === "fulfilled") {
      setSegmentCounts(segmentsData.value);
    } else {
      setSegmentsError(segmentsData.reason instanceof Error ? segmentsData.reason.message : "Failed to refresh");
    }

    if (autoCampaignsData.status === "fulfilled") {
      setAutoCampaignStats(autoCampaignsData.value);
    } else {
      setAutoCampaignsError(
        autoCampaignsData.reason instanceof Error ? autoCampaignsData.reason.message : "Failed to refresh"
      );
    }

    if (customersData.status === "fulfilled") {
      // Keep as stub for now (no dedicated dashboard endpoint exists per backend note)
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      const withUpcomingBirthdays = customersData.value.customers.filter((customer) => {
        if (!customer.dateOfBirth) return false;
        const bday = new Date(customer.dateOfBirth);
        const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
        if (thisYearBday < today) {
          thisYearBday.setFullYear(today.getFullYear() + 1);
        }
        return thisYearBday >= today && thisYearBday <= thirtyDaysFromNow;
      });

      setUpcomingBirthdays(withUpcomingBirthdays.slice(0, 5));
    }

    if (creditsData.status === "fulfilled") {
      setCredits(creditsData.value);
    } else {
      setCreditsError(creditsData.reason instanceof Error ? creditsData.reason.message : "Failed to refresh");
    }

    setLoading(false);
    loadingRef.current = false;
  }

  const totalAutoCampaignSent = autoCampaignStats
    ? (autoCampaignStats.birthday.sent || 0) +
    (autoCampaignStats.anniversary.sent || 0) +
    (autoCampaignStats.winback.sent || 0) +
    (autoCampaignStats.festival.sent || 0) +
    (autoCampaignStats.firstVisit.sent || 0) +
    (autoCampaignStats.feedback.sent || 0)
    : 0;

  const programCards = [
    {
      title: "Campaigns",
      tone: "bg-[#e8f4ff]",
      metrics: [
        { label: "Sent (30d)", value: dashboardOverview?.campaigns.sent30d?.toLocaleString() || "0" },
        { label: "Sent (7d)", value: dashboardOverview?.campaigns.sent7d?.toLocaleString() || "0" },
        { label: "Sent (24h)", value: dashboardOverview?.campaigns.sent24h?.toLocaleString() || "0" },
      ],
      href: "/campaigns",
    },
    {
      title: "Auto-campaigns",
      tone: "bg-[#f6f1ff]",
      metrics: [
        { label: "Total Sent", value: totalAutoCampaignSent.toLocaleString() },
        { label: "Birthday", value: (autoCampaignStats?.birthday.sent || 0).toLocaleString() },
        { label: "Winback", value: (autoCampaignStats?.winback.sent || 0).toLocaleString() },
      ],
      href: "/auto-campaigns",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[var(--connectnow-accent-strong)]" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <header className="flex flex-col gap-2">
        <Badge className="w-fit bg-[var(--connectnow-accent-soft)] text-[var(--connectnow-accent-strong)]">
          {orgName || "ConnectNow"} Dashboard
        </Badge>
        <h1 className="text-3xl font-semibold text-gray-900">
          Your business at a glance ✨
        </h1>
        <p className="text-gray-600 max-w-2xl">
          Monitor your campaigns, customer engagement, and messaging performance in real-time.
        </p>
      </header>

      {/* Key Metrics */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(dashboardOverview?.customers.total || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardOverview?.customers.new || 0} new this period
            </p>
            {overviewError && (
              <p className="mt-2 text-xs text-amber-600" role="alert">
                Failed to refresh
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent (30d)</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardOverview?.campaigns.sent30d?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardOverview?.campaigns.totalSent?.toLocaleString() || 0} total sent
            </p>
            {overviewError && (
              <p className="mt-2 text-xs text-amber-600" role="alert">
                Failed to refresh
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-[#ffece3]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Celebrations</CardTitle>
              <CardDescription>
                Birthdays in the next 30 days
              </CardDescription>
            </div>
            <Calendar className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            {upcomingBirthdays.length > 0 ? (
              <div className="space-y-3">
                {upcomingBirthdays.map((customer) => (
                  <div key={customer._id} className="flex items-center justify-between bg-white/80 rounded-lg p-3">
                    <div>
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[var(--connectnow-accent-strong)]">
                        {customer.dateOfBirth ? new Date(customer.dateOfBirth).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center text-center space-y-3 py-4">
                <Gift className="h-12 w-12 text-[#f28c52]" />
                <p className="text-lg font-semibold text-gray-900">
                  No upcoming birthdays
                </p>
                <p className="text-sm text-gray-600 max-w-sm">
                  Customers with birthdays will appear here when you add birthday data.
                </p>
                <Button variant="outline" className="gap-2">
                  Activate birthday campaign
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Program Performance
          </h2>
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => loadDashboardData()}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {programCards.map((program) => (
            <Card
              key={program.title}
              className={`${program.tone} border-none shadow-none`}
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{program.title}</CardTitle>
                <Button variant="link" className="text-[var(--connectnow-accent-strong)]" asChild>
                  <a href={program.href}>View More</a>
                </Button>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {program.metrics.map((metric) => (
                  <div key={metric.label}>
                    <p className="text-sm text-gray-500">{metric.label}</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {metric.value}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Customer Segments</h2>
            <p className="text-sm text-gray-600">Frequency and recency distribution</p>
          </div>
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => loadDashboardData()}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Segments</CardTitle>
            <Info className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            {segmentsError && (
              <p className="mb-4 text-xs text-amber-600" role="alert">
                Failed to refresh
              </p>
            )}

            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-3">By Visit Frequency</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm">New</span>
                    <span className="font-semibold">{(segmentCounts?.frequency.new || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm">Returning</span>
                    <span className="font-semibold">{(segmentCounts?.frequency.returning || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm">Loyal</span>
                    <span className="font-semibold">{(segmentCounts?.frequency.loyal || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm">VIP</span>
                    <span className="font-semibold">{(segmentCounts?.frequency.vip || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-3">By Recency</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-lg font-semibold">{(segmentCounts?.recency.active || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Active</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-lg font-semibold">{(segmentCounts?.recency.at_risk || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">At Risk</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-lg font-semibold">{(segmentCounts?.recency.lapsed || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Lapsed</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Quick Actions */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/campaigns'}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Megaphone className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Create Campaign</h3>
                <p className="text-sm text-gray-500">Send messages to customers</p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/auto-campaigns'}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-purple-100 rounded-lg">
                <RefreshCcw className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Setup Auto-Campaign</h3>
                <p className="text-sm text-gray-500">Automate birthday & more</p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/analytics'}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">View Analytics</h3>
                <p className="text-sm text-gray-500">Track your performance</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* WhatsApp Credits */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">WhatsApp Credits</h2>
            <p className="text-sm text-gray-600">Live available credits used for campaign sending.</p>
          </div>
          <Button variant="outline" onClick={() => loadDashboardData()}>
            Refresh
          </Button>
        </div>

        {creditsError && (
          <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-md" role="alert">
            {creditsError}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utility (available)</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(credits?.available.utility ?? 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Balance {(credits?.balances.utility ?? 0).toLocaleString()} • Reserved {(credits?.reserved.utility ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Marketing (available)</CardTitle>
              <Megaphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(credits?.available.marketing ?? 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Balance {(credits?.balances.marketing ?? 0).toLocaleString()} • Reserved {(credits?.reserved.marketing ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {autoCampaignsError && (
          <p className="text-xs text-amber-600" role="alert">
            Some widgets failed to refresh
          </p>
        )}
      </section>
    </div>
  );
}
