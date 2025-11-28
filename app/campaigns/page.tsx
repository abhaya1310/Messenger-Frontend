"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb } from "@/components/breadcrumb";
import { Megaphone, Clock } from "lucide-react";

export default function CampaignsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
              <p className="text-gray-600 mt-1">Manage and track your marketing campaigns</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={[{ label: "Campaigns" }]} />

        {/* Coming Soon Card */}
        <Card className="max-w-2xl mx-auto mt-12">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Megaphone className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-2xl">Campaigns</CardTitle>
                <CardDescription>Coming soon</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">
                The Campaigns feature is currently under development. This page will allow you to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                <li>Create and manage marketing campaigns</li>
                <li>Schedule bulk message sends</li>
                <li>Track campaign performance</li>
                <li>Analyze engagement metrics</li>
              </ul>
              <div className="flex items-center gap-2 text-sm text-gray-500 pt-4 border-t">
                <Clock className="h-4 w-4" />
                <span>This feature will be available in a future update.</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

