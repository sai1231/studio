
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getClassificationRules, saveClassificationRules, type ClassificationRule, type Condition } from '@/services/classifierService';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, PlusCircle, Trash2, GripVertical, Filter, AlertTriangle } from 'lucide-react';
import { nanoid } from 'nanoid';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const conditionSchema = z.object({
  id: z.string(),
  fact: z.enum(['domain', 'path', 'full_url', 'meta_tag_value']),
  operator: z.enum(['equals', 'contains', 'startsWith', 'endsWith', 'matchesRegex']),
  value: z.string().min(1, 'Value cannot be empty'),
  metaProperty: z.string().optional(),
});

const ruleSchema = z.object({
  id: z.string(),
  contentType: z.string().min(1, 'Content type is required'),
  priority: z.number(),
  conditions: z.array(conditionSchema),
});

const formSchema = z.object({
  rules: z.array(ruleSchema),
});

const operatorOptions = {
  domain: ['equals', 'contains', 'endsWith'],
  path: ['startsWith', 'contains', 'matchesRegex'],
  full_url: ['contains', 'matchesRegex'],
  meta_tag_value: ['equals', 'contains'],
};

const factOptions: { value: Condition['fact']; label: string }[] = [
  { value: 'domain', label: 'Domain' },
  { value: 'path', label: 'URL Path' },
  { value: 'full_url', label: 'Full URL' },
  { value: 'meta_tag_value', label: 'Meta Tag' },
];

export default function ClassifierPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { rules: [] },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'rules',
  });

  const fetchRules = useCallback(async () => {
    setIsLoading(true);
    try {
      const rules = await getClassificationRules();
      form.reset({ rules });
    } catch (e) {
      toast({ title: 'Error', description: 'Could not fetch classification rules.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [form, toast]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);
  
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      await saveClassificationRules(data.rules);
      toast({ title: 'Success', description: 'Classification rules saved successfully.' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to save rules.', variant: 'destructive' });
    }
  };

  const addNewRule = () => {
    append({
      id: nanoid(),
      contentType: '',
      priority: fields.length > 0 ? Math.max(...fields.map(f => f.priority)) + 10 : 10,
      conditions: [{ id: nanoid(), fact: 'domain', operator: 'equals', value: '' }],
    });
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-headline font-semibold text-foreground flex items-center">
            <Filter className="mr-3 h-6 w-6 text-primary" />
            Content Classification Rules
          </h1>
          <p className="text-muted-foreground">Define rules to automatically assign a content type to new links. Rules are checked by priority (highest first).</p>
        </div>
        <Button onClick={addNewRule}><PlusCircle className="mr-2 h-4 w-4"/> Add New Rule</Button>
      </div>

      <Alert variant="default" className="bg-muted/50">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          A rule only matches if ALL of its conditions are true. The first rule that matches (by priority) will determine the content type. If no rules match, the default is 'Article'.
        </AlertDescription>
      </Alert>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {fields.map((rule, ruleIndex) => (
            <RuleCard key={rule.id} ruleIndex={ruleIndex} form={form} removeRule={remove} />
          ))}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={fetchRules} disabled={form.formState.isSubmitting}>Reset</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Save All Rules
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// --- Sub-components for the page ---

const RuleCard = ({ ruleIndex, form, removeRule }: { ruleIndex: number, form: any, removeRule: (index: number) => void }) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `rules.${ruleIndex}.conditions`,
  });

  const addNewCondition = () => {
    append({ id: nanoid(), fact: 'path', operator: 'startsWith', value: '' });
  };
  
  const watchedFact = form.watch(`rules.${ruleIndex}.conditions`)?.map((c: Condition) => c.fact) || [];

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row justify-between items-start bg-muted/30">
        <div>
          <CardTitle>Rule #{ruleIndex + 1}</CardTitle>
          <CardDescription>If all conditions match, assign the content type below.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={() => removeRule(ruleIndex)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
      </CardHeader>
      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-[1fr_200px] gap-4">
        <div className="space-y-4 p-4 border rounded-lg">
          <h4 className="font-semibold text-sm">Conditions</h4>
          {fields.map((condition, conditionIndex) => (
            <div key={condition.id} className="flex gap-2 items-start p-2 border-b">
              <div className="flex-grow grid grid-cols-2 md:grid-cols-3 gap-2">
                <FormField
                  control={form.control}
                  name={`rules.${ruleIndex}.conditions.${conditionIndex}.fact`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fact</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>{factOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name={`rules.${ruleIndex}.conditions.${conditionIndex}.operator`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Operator</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                            {operatorOptions[watchedFact[conditionIndex] || 'domain'].map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name={`rules.${ruleIndex}.conditions.${conditionIndex}.value`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. instagram.com or /reel/"/></FormControl>
                    </FormItem>
                  )}
                />
                {watchedFact[conditionIndex] === 'meta_tag_value' && (
                   <FormField
                    control={form.control}
                    name={`rules.${ruleIndex}.conditions.${conditionIndex}.metaProperty`}
                    render={({ field }) => (
                      <FormItem className="col-span-2 md:col-span-3">
                        <FormLabel>Meta Property</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. og:type"/></FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </div>
              <Button variant="ghost" size="icon" className="mt-6 text-muted-foreground" onClick={() => remove(conditionIndex)}><Trash2 className="h-4 w-4"/></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addNewCondition}><PlusCircle className="mr-2 h-4 w-4"/>Add Condition</Button>
        </div>

        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <FormField
            control={form.control}
            name={`rules.${ruleIndex}.contentType`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Content Type to Assign</FormLabel>
                <FormControl><Input {...field} placeholder="e.g. Video, Post"/></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name={`rules.${ruleIndex}.priority`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))}/></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};
