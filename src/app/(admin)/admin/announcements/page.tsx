'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone, Plus } from "lucide-react";
import React from "react";

export default function AdminAnnouncementsPage() {
    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Plus /> Create Announcement</CardTitle>
                    <CardDescription>
                        This will display a banner to all logged-in users.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="ann-title">Title</Label>
                        <Input id="ann-title" placeholder="e.g., Scheduled Maintenance" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="ann-message">Message</Label>
                        <Textarea id="ann-message" placeholder="The app will be offline for..." />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="ann-type">Type</Label>
                        <Select>
                            <SelectTrigger id="ann-type">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="info">Info (Blue)</SelectItem>
                                <SelectItem value="success">Success (Green)</SelectItem>
                                <SelectItem value="warning">Warning (Yellow)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button disabled>Post Announcement</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Published Announcements</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            </TableRow>
                             <TableRow>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </Table>
            </CardContent>
        </Card>
    </div>
    )
}
