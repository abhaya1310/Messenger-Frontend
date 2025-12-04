"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  fetchCampaignAnalytics,
  fetchCustomerAnalytics,
  fetchCustomers,
} from "@/lib/api";
import type { CampaignAnalytics, CustomerAnalytics } from "@/lib/types/campaign";
import type { POSCustomer } from "@/lib/types/pos";

export default function DashboardPage() {
  const { orgName } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Analytics state
  const [campaignAnalytics, setCampaignAnalytics] = useState<CampaignAnalytics | null>(null);
  const [customerAnalytics, setCustomerAnalytics] = useState<CustomerAnalytics | null>(null);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<POSCustomer[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [campaignData, customerData, customersData] = await Promise.allSettled([
        fetchCampaignAnalytics(),
        fetchCustomerAnalytics(),
        fetchCustomers({ limit: 10, sortBy: 'lastVisitAt', sortOrder: 'desc' }),
      ]);

      if (campaignData.status === 'fulfilled') {
        setCampaignAnalytics(campaignData.value);
      }
      
      if (customerData.status === 'fulfilled') {
        setCustomerAnalytics(customerData.value);
      }

      if (customersData.status === 'fulfilled') {
        // Filter customers with birthdays in next 30 days
        const today = new Date();
        const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        const withUpcomingBirthdays = customersData.value.customers.filter(customer => {
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
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data. Using sample data.');
    } finally {
      setLoading(false);
    }
  }

  // Derived stats with fallbacks
  const frequencyStats = customerAnalytics ? [
    { label: "Active Customers", value: customerAnalytics.summary.activeCustomers, percent: customerAnalytics.summary.totalCustomers > 0 ? (customerAnalytics.summary.activeCustomers / customerAnalytics.summary.totalCustomers) * 100 : 0 },
    { label: "New This Month", value: customerAnalytics.summary.newCustomersThisMonth, percent: customerAnalytics.summary.totalCustomers > 0 ? (customerAnalytics.summary.newCustomersThisMonth / customerAnalytics.summary.totalCustomers) * 100 : 0 },
    { label: "Lapsed Customers", value: customerAnalytics.summary.lapsedCustomers, percent: customerAnalytics.summary.totalCustomers > 0 ? (customerAnalytics.summary.lapsedCustomers / customerAnalytics.summary.totalCustomers) * 100 : 0 },
    { label: "Total Customers", value: customerAnalytics.summary.totalCustomers, percent: 100 },
  ] : [
    { label: "Active Customers", value: 0, percent: 0 },
    { label: "New This Month", value: 0, percent: 0 },
    { label: "Lapsed Customers", value: 0, percent: 0 },
    { label: "Total Customers", value: 0, percent: 100 },
  ];

  const programCards = [
    {
      title: "Campaigns",
      tone: "bg-[#e8f4ff]",
      metrics: [
        { label: "Total Campaigns", value: campaignAnalytics?.summary.totalCampaigns?.toString() || "0" },
        { label: "Active Now", value: campaignAnalytics?.summary.activeCampaigns?.toString() || "0" },
        { label: "Total Sent", value: campaignAnalytics?.summary.totalSent?.toLocaleString() || "0" },
      ],
      href: "/campaigns",
    },
    {
      title: "Auto-campaigns",
      tone: "bg-[#f6f1ff]",
      metrics: [
        { label: "Delivery Rate", value: `${campaignAnalytics?.summary.deliveryRate?.toFixed(1) || 0}%` },
        { label: "Read Rate", value: `${campaignAnalytics?.summary.readRate?.toFixed(1) || 0}%` },
        { label: "Total Delivered", value: campaignAnalytics?.summary.totalDelivered?.toLocaleString() || "0" },
      ],
      href: "/auto-campaigns",
    },
    {
      title: "Customers",
      tone: "bg-[#e9f9ed]",
      metrics: [
        { label: "Total Customers", value: customerAnalytics?.summary.totalCustomers?.toLocaleString() || "0" },
        { label: "Active", value: customerAnalytics?.summary.activeCustomers?.toLocaleString() || "0" },
        { label: "Lapsed", value: customerAnalytics?.summary.lapsedCustomers?.toLocaleString() || "0" },
      ],
      href: "/analytics",
    },
    {
      title: "Feedback",
      tone: "bg-[#fff3e6]",
      metrics: [
        { label: "Total Responses", value: "—" },
        { label: "Avg. Rating", value: "—" },
        { label: "Positive %", value: "—" },
      ],
      href: "/feedback",
    },
  ];

  const highlightStats = [
    { label: "Total Sent", value: campaignAnalytics?.summary.totalSent?.toLocaleString() || "0" },
    { label: "Delivered", value: campaignAnalytics?.summary.totalDelivered?.toLocaleString() || "0" },
    { label: "Read", value: campaignAnalytics?.summary.totalRead?.toLocaleString() || "0" },
    { label: "Active Campaigns", value: campaignAnalytics?.summary.activeCampaigns?.toString() || "0" },
  ];

  const topCustomers = customerAnalytics?.topCustomers?.slice(0, 5) || [];

  const creditPackages = [
    {
      channel: "SMS",
      accent: "#ffeeda",
      options: [
        { label: "25K", price: "₹5000" },
        { label: "50K", price: "₹10000" },
        { label: "100K", price: "₹20000" },
      ],
      customPrice: "₹0.000",
    },
    {
      channel: "Email",
      accent: "#fff4e6",
      options: [
        { label: "25K", price: "₹3000" },
        { label: "50K", price: "₹6000" },
        { label: "100K", price: "₹12000" },
      ],
      customPrice: "₹0.000",
    },
    {
      channel: "Whatsapp Utility",
      accent: "#fff8ec",
      options: [
        { label: "25K", price: "₹5000" },
        { label: "50K", price: "₹10000" },
        { label: "100K", price: "₹20000" },
      ],
      customPrice: "₹0.000",
    },
    {
      channel: "Whatsapp Marketing",
      accent: "#fff0e6",
      options: [
        { label: "25K", price: "₹23500" },
        { label: "50K", price: "₹47000" },
        { label: "100K", price: "₹94000" },
      ],
      customPrice: "₹0.000",
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
        {error && (
          <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-md">
            {error}
          </p>
        )}
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
              {customerAnalytics?.summary.totalCustomers?.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              {customerAnalytics?.summary.newCustomersThisMonth || 0} new this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaignAnalytics?.summary.activeCampaigns || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {campaignAnalytics?.summary.totalCampaigns || 0} total campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaignAnalytics?.summary.totalSent?.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              {campaignAnalytics?.summary.deliveryRate?.toFixed(1) || 0}% delivery rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Read Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaignAnalytics?.summary.readRate?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {campaignAnalytics?.summary.totalRead?.toLocaleString() || 0} messages read
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Customer Overview</CardTitle>
              <CardDescription>
                Customer distribution and activity
              </CardDescription>
            </div>
            <Info className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent className="space-y-5">
            {frequencyStats.map((stat) => (
              <div key={stat.label}>
                <div className="flex justify-between text-sm font-medium text-gray-700">
                  <span>{stat.label}</span>
                  <span>{stat.value.toLocaleString()}</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-[var(--connectnow-accent)]"
                    style={{ width: `${Math.min(stat.percent, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

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
          <Button variant="ghost" size="sm" className="gap-1" onClick={loadDashboardData}>
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

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Message Highlights</CardTitle>
            <Info className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {highlightStats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-semibold">{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-6 text-sm font-medium">
              <div className="flex items-center gap-2 text-green-600">
                <span className="h-2 w-2 rounded-full bg-green-600" />
                Delivered
              </div>
              <div className="flex items-center gap-2 text-blue-500">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Read
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Top Customers</CardTitle>
            <Info className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            {topCustomers.length > 0 ? (
              <div className="space-y-3">
                {topCustomers.map((customer, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.visits} visits</p>
                    </div>
                    <p className="font-semibold text-[var(--connectnow-accent-strong)]">
                      ₹{customer.totalSpend.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No customer data available yet</p>
              </div>
            )}
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

      {/* Credit Refill */}
      <section className="space-y-6">
        <Card className="shadow-sm">
          <CardHeader className="border-b border-gray-100">
            <div className="flex flex-col gap-2">
              <CardTitle className="text-2xl font-semibold">
                Refill your credits to reach your customers.
              </CardTitle>
              <CardDescription>
                Choose a pack per channel or enter a custom quantity. These are static placeholders until billing APIs go live.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {creditPackages.map((pack) => (
                <div
                  key={pack.channel}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                  style={{ backgroundColor: pack.accent }}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Channel</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {pack.channel}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs uppercase text-gray-500">
                      On
                      <div className="relative inline-flex h-5 w-9 items-center rounded-full bg-[var(--connectnow-accent)]/30">
                        <span className="inline-block h-4 w-4 translate-x-4 rounded-full bg-white shadow" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {pack.options.map((option, idx) => (
                      <label
                        key={option.label}
                        className="flex items-center justify-between rounded-xl border border-white/70 bg-white px-3 py-2 text-sm font-medium shadow-sm"
                      >
                        <span className="flex items-center gap-2 text-gray-600">
                          <input
                            type="radio"
                            name={`pack-${pack.channel}`}
                            defaultChecked={idx === 0}
                            className="accent-[var(--connectnow-accent-strong)]"
                          />
                          {option.label}
                        </span>
                        <span className="text-[var(--connectnow-accent-strong)]">
                          {option.price}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm font-medium text-gray-600">
                      <span>Custom</span>
                      <span className="text-[var(--connectnow-accent-strong)]">
                        {pack.customPrice}
                      </span>
                    </div>
                    <Input
                      placeholder="Enter number of credits"
                      className="bg-white text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3 border-t border-dashed border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-semibold text-[var(--connectnow-accent-strong)]">
                  ₹0.000
                </p>
                <p className="text-xs text-gray-400">Price excludes GST</p>
              </div>
              <Button
                className="gap-2 bg-[var(--connectnow-accent-strong)] hover:bg-[var(--connectnow-accent)]"
                disabled
              >
                <MessageCircle className="h-4 w-4" />
                Proceed to checkout
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col gap-4 rounded-3xl border-dashed border-[var(--connectnow-accent-strong)]/40 bg-[var(--connectnow-accent-soft)] p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <Badge className="w-fit bg-white text-[var(--connectnow-accent-strong)]">
              NEW
            </Badge>
            <div>
              <h3 className="text-2xl font-semibold text-gray-900">
                Now automatically refill credits whenever it gets low.
              </h3>
              <p className="text-gray-600">
                Enable autopay once and we’ll top up every channel based on your preferred threshold.
              </p>
            </div>
            <Button variant="link" className="px-0 text-[var(--connectnow-accent-strong)]">
              Set-up Autopay
            </Button>
          </div>
          <div className="flex flex-1 justify-end">
            <div className="h-24 w-36 rounded-2xl border border-dotted border-[var(--connectnow-accent-strong)]/40 bg-white/80 text-center text-sm text-gray-500 flex flex-col items-center justify-center">
              <RefreshCcw className="mb-2 h-6 w-6 text-[var(--connectnow-accent-strong)]" />
              Auto top-ups preview
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
