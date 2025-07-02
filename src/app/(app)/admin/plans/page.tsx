
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getPlans, updatePlan, createDefaultPlans } from '@/services/subscriptionService';
import type { Plan, PlanFeatures } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Zap, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PlanEditorCardProps {
  plan: Plan;
  onPlanUpdate: () => void;
}

const PlanEditorCard: React.FC<PlanEditorCardProps> = ({ plan, onPlanUpdate }) => {
  const [features, setFeatures] = useState<PlanFeatures>(plan.features);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setFeatures(plan.features);
  }, [plan]);

  const handleFeatureChange = (key: keyof PlanFeatures, value: string | boolean) => {
    setFeatures(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePlan(plan.id, features);
      toast({
        title: 'Plan Updated',
        description: `The "${plan.name}" plan has been successfully updated.`,
      });
      onPlanUpdate();
    } catch (error) {
      console.error(`Error updating plan ${plan.id}:`, error);
      toast({
        title: 'Update Failed',
        description: `Could not update the "${plan.name}" plan.`,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">{plan.name} Plan</CardTitle>
        <CardDescription>
          Configure the features and limits for the {plan.name.toLowerCase()} tier. Use -1 for unlimited.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {Object.entries(features).map(([key, value]) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={`${plan.id}-${key}`} className="capitalize font-medium">
              {key.replace(/([A-Z])/g, ' $1')}
            </Label>
            {typeof value === 'boolean' ? (
              <div className="flex items-center space-x-2">
                <Switch
                  id={`${plan.id}-${key}`}
                  checked={value}
                  onCheckedChange={(checked) => handleFeatureChange(key as keyof PlanFeatures, checked)}
                />
                 <span className="text-sm text-muted-foreground">{value ? 'Enabled' : 'Disabled'}</span>
              </div>
            ) : (
              <Input
                id={`${plan.id}-${key}`}
                type="number"
                value={value}
                onChange={(e) => handleFeatureChange(key as keyof PlanFeatures, e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Enter value..."
              />
            )}
          </div>
        ))}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isSaving} className="ml-auto bg-primary hover:bg-primary/90 text-primary-foreground">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
};


export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingDefaults, setIsCreatingDefaults] = useState(false);
  const { toast } = useToast();

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedPlans = await getPlans();
      setPlans(fetchedPlans);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: 'Error',
        description: 'Could not fetch subscription plans.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleCreateDefaultPlans = async () => {
    setIsCreatingDefaults(true);
    try {
      await createDefaultPlans();
      toast({
        title: 'Default Plans Created',
        description: 'The "Free" and "Pro" plans have been added to Firestore.',
      });
      fetchPlans();
    } catch (error) {
       console.error('Error creating default plans:', error);
       toast({
        title: 'Creation Failed',
        description: 'Could not create default plans.',
        variant: 'destructive',
      });
    } finally {
        setIsCreatingDefaults(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] container mx-auto py-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading Plan Configuration...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Zap className="h-8 w-8 mr-3 text-primary" />
        <h1 className="text-3xl font-headline font-semibold text-foreground">
          Subscription Plan Management
        </h1>
      </div>
       <p className="text-muted-foreground mb-8 max-w-3xl">
        This page allows you to dynamically control the features and limits for each subscription tier. Changes saved here are reflected across the application without needing a new deployment.
      </p>

      {plans.length === 0 ? (
        <Card className="max-w-lg mx-auto text-center">
          <CardHeader>
             <div className="mx-auto bg-muted/50 rounded-full p-3 w-fit">
                <AlertTriangle className="h-10 w-10 text-amber-500" />
            </div>
            <CardTitle className="mt-4">No Plans Found</CardTitle>
            <CardDescription>
                Your Firestore database doesn't have any subscription plans defined yet. You can create the default "Free" and "Pro" plans to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCreateDefaultPlans} disabled={isCreatingDefaults}>
              {isCreatingDefaults ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Default Plans
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {plans.sort((a,b) => a.name === 'Free' ? -1 : 1).map(plan => (
            <PlanEditorCard key={plan.id} plan={plan} onPlanUpdate={fetchPlans} />
          ))}
        </div>
      )}
    </div>
  );
}
