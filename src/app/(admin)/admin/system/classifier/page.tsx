
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getClassificationRules, saveClassificationRules, type ClassificationRule } from '@/services/classifierService';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, PlusCircle, Trash2, Filter, AlertTriangle, GripVertical } from 'lucide-react';
import { nanoid } from 'nanoid';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const ruleSchema = z.object({
  id: z.string(),
  contentType: z.string().min(1, 'Content type is required'),
  regex: z.string().min(1, 'Regex pattern is required'),
  priority: z.number(),
});

const formSchema = z.object({
  rules: z.array(ruleSchema),
});


export default function ClassifierPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { rules: [] },
  });

  const { control, handleSubmit } = form;
  const { fields, append, remove, move } = useFieldArray({ control, name: 'rules' });

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
    const rulesWithUpdatedPriority = data.rules.map((rule, index) => ({
      ...rule,
      priority: (data.rules.length - index) * 10 // Re-calculate priority based on order
    }));
    
    try {
      await saveClassificationRules(rulesWithUpdatedPriority);
      toast({ title: 'Success', description: 'Classification rules saved successfully.' });
      form.reset({ rules: rulesWithUpdatedPriority }); // Re-sync form with new priorities
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to save rules.', variant: 'destructive' });
    }
  };

  const addNewRule = () => {
    append({
      id: nanoid(),
      contentType: '',
      regex: '',
      priority: 0, // Priority will be recalculated on save
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = fields.findIndex((item) => item.id === active.id);
      const newIndex = fields.findIndex((item) => item.id === over.id);
      move(oldIndex, newIndex);
    }
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
          <p className="text-muted-foreground">Define regex rules to automatically assign a content type. Rules are checked from top to bottom.</p>
        </div>
        <Button onClick={addNewRule}><PlusCircle className="mr-2 h-4 w-4"/> Add New Rule</Button>
      </div>

      <Alert variant="default" className="bg-muted/50">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          The first rule (from top to bottom) whose regex pattern matches the URL will determine the content type. If no rules match, the default is 'Article'.
        </AlertDescription>
      </Alert>
      
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
              {fields.map((rule, ruleIndex) => (
                <SortableRuleCard key={rule.id} ruleIndex={ruleIndex} form={form} removeRule={remove} />
              ))}
            </SortableContext>
          </DndContext>

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

const SortableRuleCard = ({ ruleIndex, form, removeRule }: { ruleIndex: number, form: any, removeRule: (index: number) => void }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: form.getValues(`rules.${ruleIndex}.id`) });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
        <Card ref={setNodeRef} style={style} className="shadow-md bg-card">
            <CardHeader className="flex flex-row items-center justify-between p-3 bg-muted/30">
                 <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" {...attributes} {...listeners} className="cursor-grab p-1">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                    </Button>
                    <CardTitle className="text-lg">Rule #{ruleIndex + 1}</CardTitle>
                 </div>
                <Button variant="ghost" size="icon" onClick={() => removeRule(ruleIndex)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name={`rules.${ruleIndex}.regex`}
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Regex Pattern</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g., instagram\.com\/reel\/"/></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
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
            </CardContent>
        </Card>
    );
};
