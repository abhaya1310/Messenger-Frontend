"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  BarChart3, 
  Users, 
  Megaphone, 
  Gift,
  ArrowRight 
} from "lucide-react";

export default function HomePage() {


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-12 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to WhatsApp Manager
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Manage your WhatsApp templates, campaigns, analytics, and customer conversations all in one place.
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <Link href="/templates">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">Templates</CardTitle>
                </div>
                <CardDescription>
                  View and manage your WhatsApp message templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-blue-600 font-medium group-hover:gap-2 transition-all">
                  <span>Manage Templates</span>
                  <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <Link href="/campaigns">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                    <Megaphone className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle className="text-xl">Campaigns</CardTitle>
                </div>
                <CardDescription>
                  Create and manage marketing campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-green-600 font-medium group-hover:gap-2 transition-all">
                  <span>View Campaigns</span>
                  <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <Link href="/loyalty-programs">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                    <Gift className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-xl">Loyalty Programs</CardTitle>
                </div>
                <CardDescription>
                  Manage customer loyalty and rewards programs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-purple-600 font-medium group-hover:gap-2 transition-all">
                  <span>View Programs</span>
                  <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <Link href="/analytics">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                    <BarChart3 className="h-6 w-6 text-orange-600" />
                  </div>
                  <CardTitle className="text-xl">Analytics</CardTitle>
                </div>
                <CardDescription>
                  View performance metrics and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-orange-600 font-medium group-hover:gap-2 transition-all">
                  <span>View Analytics</span>
                  <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <Link href="/monitor">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                    <Users className="h-6 w-6 text-indigo-600" />
                  </div>
                  <CardTitle className="text-xl">Monitor</CardTitle>
                </div>
                <CardDescription>
                  View and manage customer conversations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-indigo-600 font-medium group-hover:gap-2 transition-all">
                  <span>Open Monitor</span>
                  <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>
      </main>
    </div>
  );
}