"use client";

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
  MessageCircle,
  ThumbsDown,
  ThumbsUp,
  Info,
  Star,
  AlertCircle,
} from "lucide-react";

const kpis = [
  { label: "Total Feedback", value: "1" },
  { label: "Avg. Rating", value: "2.00" },
  { label: "Channel", value: "Whatsapp Utility" },
];

const sentiment = [
  { label: "Positive Feedback", value: "0%", icon: ThumbsUp, tone: "text-green-600" },
  { label: "Negative Feedback", value: "100%", icon: ThumbsDown, tone: "text-red-500" },
  { label: "Neutral Feedback", value: "0%", icon: MessageCircle, tone: "text-yellow-500" },
];

const suggestionTiles = [
  {
    title: "Boost your online reputation",
    description:
      "Ask your happy customers to share a review on Google, Facebook etc.",
    action: "Create request",
  },
  {
    title: "Automate apologies on bad experiences",
    description:
      "Send a make-good coupon via WhatsApp whenever you get a low score.",
    action: "Design apology flow",
  },
];

export default function FeedbackPage() {
  return (
    <div className="space-y-8 p-6">
      <section className="rounded-3xl bg-gradient-to-r from-[#c9e7ff] via-[#a7c1ff] to-[#8ac7ff] p-8 text-white shadow-sm">
        <div className="space-y-4 max-w-3xl">
          <Badge className="w-fit bg-white/20 text-white">What&apos;s New</Badge>
          <h1 className="text-4xl font-semibold leading-tight">
            Turn Negative Feedback into Positive Relationships!
          </h1>
          <p className="text-lg">
            With the new feedback feature, you can easily send rewards or
            apologies to your customers in just a few clicks.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" className="bg-white text-[var(--connectnow-accent-strong)]">
              See how it works
            </Button>
            <Button variant="outline" className="bg-white/20 text-white border-white/40">
              Explore
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Feedback Insights</CardTitle>
              <CardDescription>
                Track your customer feedback with real-time analytics.
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              Last 12 months
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="rounded-2xl border border-dashed border-gray-200 p-4">
                <p className="text-sm text-gray-500">{kpi.label}</p>
                <p className="text-3xl font-semibold text-gray-900">
                  {kpi.value}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>How was your experience?</CardTitle>
            <CardDescription>Created on 27 Oct 2025</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
              <div>
                <p className="text-sm text-gray-500">Channel</p>
                <p className="font-medium">Whatsapp Utility</p>
              </div>
              <Button size="sm" variant="ghost">
                Edit
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4">
              <span>Inactive</span>
              <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300">
                <span className="inline-block h-5 w-5 rounded-full bg-white translate-x-1" />
              </div>
            </div>
            <Button className="w-full">Edit Feedback Settings</Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Feedback Report</CardTitle>
            <Info className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            {sentiment.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-dashed border-gray-200 p-4 space-y-2"
              >
                <item.icon className={`h-6 w-6 ${item.tone}`} />
                <p className="text-3xl font-semibold">{item.value}</p>
                <p className="text-sm text-gray-500">{item.label}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Boost your online reputation</CardTitle>
            <CardDescription>
              Ask your happy customers to share reviews on Google, Facebook,
              etc.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-gray-200 p-4">
              <p className="text-sm text-gray-600">
                Trigger auto-messages when ratings drop below 3 stars and attach
                a thank-you coupon when ratings are higher than 4.
              </p>
            </div>
            <Button variant="secondary" className="w-full">
              Build automation
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {suggestionTiles.map((tile) => (
          <Card key={tile.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                {tile.title}
              </CardTitle>
              <CardDescription>{tile.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline">{tile.action}</Button>
            </CardContent>
          </Card>
        ))}
        <Card className="md:col-span-2 border-dashed">
          <CardHeader className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-[var(--connectnow-accent-strong)]" />
            <div>
              <CardTitle>Need more insights?</CardTitle>
              <CardDescription>
                Connect to your POS or CRM to unlock live restaurant feedback
                streams.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button>Connect Data Source</Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}


