
'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CreditCard, Activity, FileText } from "lucide-react";
import React from "react";

const StatCard = ({ title, value, icon: Icon, isLoading }: { title: string; value: string; icon: React.ElementType; isLoading?: boolean }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <div className="text-2xl font-bold">{value}</div>
      )}
    </CardContent>
  </Card>
);

const ActivityItemSkeleton = () => (
    <div className="flex items-center space-x-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-1/4" />
        </div>
    </div>
)

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Users" value="1,234" icon={Users} isLoading={true} />
            <StatCard title="Active Subscriptions" value="152" icon={CreditCard} isLoading={true} />
            <StatCard title="Content Items" value="10,598" icon={FileText} isLoading={true} />
            <StatCard title="New Users (7d)" value="45" icon={Activity} isLoading={true} />
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <ActivityItemSkeleton />
                <ActivityItemSkeleton />
                <ActivityItemSkeleton />
                <ActivityItemSkeleton />
            </CardContent>
        </Card>
    </div>
  );
}
