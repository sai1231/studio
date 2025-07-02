
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleRight } from "lucide-react";
import React from "react";

const FeatureFlagItem = ({ name, description, enabled }: { name: string; description: string, enabled?: boolean }) => (
    <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
        <div className="space-y-0.5">
            <Label htmlFor={`flag-${name.toLowerCase().replace(' ', '-')}`} className="text-base font-medium">
                {name}
            </Label>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Switch id={`flag-${name.toLowerCase().replace(' ', '-')}`} defaultChecked={enabled}/>
    </div>
);

export default function AdminFeatureFlagsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><ToggleRight /> Feature Flags</CardTitle>
                <CardDescription>
                    Enable or disable application features globally without deploying new code.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <FeatureFlagItem 
                    name="AI Sentiment Analysis" 
                    description="Analyze the sentiment of notes and articles."
                />
                <FeatureFlagItem 
                    name="PDF Uploads" 
                    description="Allow users to upload and store PDF files."
                    enabled={true}
                />
                <FeatureFlagItem 
                    name="Public API Access" 
                    description="Enable API access for Pro tier users."
                />
                <FeatureFlagItem 
                    name="Quarterly Usage Reports" 
                    description="Email users a summary of their activity."
                />
            </CardContent>
        </Card>
    )
}
