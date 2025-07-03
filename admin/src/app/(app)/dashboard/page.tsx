
'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CreditCard, Activity, FileText } from "lucide-react";
import React, { useState, useEffect } from "react";
import {
  subscribeToUserCount,
  subscribeToContentCount,
  subscribeToNewUserCount,
  subscribeToProUserCount,
  subscribeToRecentUsers,
  type DashboardRecentUser,
} from '@/services/adminService';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const StatCard = ({ title, value, icon: Icon }: { title: string; value: string | number | null; icon: React.ElementType; }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {value === null ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      )}
    </CardContent>
  </Card>
);

const getInitials = (name?: string | null) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length > 1 && names[1]) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const ActivityItem = ({ user }: { user: DashboardRecentUser }) => (
    <div className="flex items-center space-x-4">
        <Avatar className="h-10 w-10">
            <AvatarImage src={user.photoURL || undefined} alt="User avatar" data-ai-hint="person face"/>
            <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
            <p className="text-sm font-medium">New user: {user.displayName || user.email}</p>
            <p className="text-xs text-muted-foreground">
                Joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
            </p>
        </div>
    </div>
)

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
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [activeSubscriptions, setActiveSubscriptions] = useState<number | null>(null);
  const [contentItems, setContentItems] = useState<number | null>(null);
  const [newUsers, setNewUsers] = useState<number | null>(null);
  const [recentUsers, setRecentUsers] = useState<DashboardRecentUser[]>([]);
  const [isRecentUsersLoading, setIsRecentUsersLoading] = useState(true);

  useEffect(() => {
    const unsubscribers = [
      subscribeToUserCount(setTotalUsers),
      subscribeToContentCount(setContentItems),
      subscribeToNewUserCount(setNewUsers),
      subscribeToRecentUsers((users) => {
          setRecentUsers(users);
          setIsRecentUsersLoading(false);
      }),
    ];

    let proUnsub: (() => void) | undefined;
    const setupProCount = async () => {
        proUnsub = await subscribeToProUserCount(setActiveSubscriptions);
    };
    setupProCount();
    
    return () => {
        unsubscribers.forEach(unsub => unsub());
        if (proUnsub) {
            proUnsub();
        }
    };
  }, []);

  return (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Users" value={totalUsers} icon={Users} />
            <StatCard title="Active Subscriptions" value={activeSubscriptions} icon={CreditCard} />
            <StatCard title="Content Items" value={contentItems} icon={FileText} />
            <StatCard title="New Users (7d)" value={newUsers} icon={Activity} />
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Recent Sign-ups</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {isRecentUsersLoading ? (
                    <>
                        <ActivityItemSkeleton />
                        <ActivityItemSkeleton />
                        <ActivityItemSkeleton />
                        <ActivityItemSkeleton />
                    </>
                ) : recentUsers.length > 0 ? (
                    recentUsers.map(user => <ActivityItem key={user.id} user={user} />)
                ) : (
                    <p className="text-center text-sm text-muted-foreground py-4">No recent sign-ups.</p>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
