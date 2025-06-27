
'use client';

import type React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Mic, Square, Save, Trash2, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { uploadFile, addContentItem } from '@/services/contentService';
import type { ContentItem } from '@/types';
import { cn } from '@/lib/utils';

export default function RecordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const getMicPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // We don't need to do anything with the stream here, just confirm we have access.
        // The browser will keep the permission granted for this session.
        setHasPermission(true);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        setHasPermission(false);
        toast({
          variant: 'destructive',
          title: 'Microphone Access Denied',
          description: 'Please enable microphone permissions in your browser settings to use this feature.',
        });
      }
    };
    getMicPermission();

    return () => {
      // Cleanup timer on unmount
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [toast]);

  const startRecording = async () => {
    if (!hasPermission) {
        toast({
          variant: 'destructive',
          title: 'No Microphone Access',
          description: 'Cannot start recording without microphone permission.',
        });
        return;
    }
    
    setAudioBlob(null);
    setAudioUrl(null);
    audioChunksRef.current = [];

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        
        mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }
        };

        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            setAudioBlob(blob);
            setAudioUrl(URL.createObjectURL(blob));
            // Stop the stream tracks to turn off the microphone indicator
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        
        setRecordingTime(0);
        timerIntervalRef.current = setInterval(() => {
            setRecordingTime(prevTime => prevTime + 1);
        }, 1000);

    } catch (error) {
        console.error('Failed to start recording:', error);
        toast({ title: 'Error', description: 'Could not start recording.', variant: 'destructive'});
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  const handleSaveRecording = async () => {
    if (!audioBlob || !user) return;
    setIsSaving(true);
    
    const currentToast = toast({ title: 'Saving Recording...', description: 'Please wait while we upload your voice note.' });

    try {
      const fileName = `voice-note-${Date.now()}.webm`;
      const filePath = `voiceRecordings/${user.uid}/${fileName}`;
      const downloadURL = await uploadFile(new File([audioBlob], fileName), filePath);

      const newContentData: Omit<ContentItem, 'id' | 'createdAt'> = {
        type: 'voice',
        title: `Voice Note - ${new Date().toLocaleString()}`,
        description: 'A recorded voice note.',
        audioUrl: downloadURL,
        tags: [{ id: 'voice-note', name: 'voice note' }],
        userId: user.uid,
        contentType: 'Voice Recording',
      };

      await addContentItem(newContentData);

      currentToast.update({
        id: currentToast.id,
        title: 'Recording Saved!',
        description: 'Your voice note has been added to your memories.',
        variant: 'default',
      });

      router.push('/dashboard');

    } catch (error) {
      console.error('Error saving recording:', error);
      currentToast.update({
        id: currentToast.id,
        title: 'Save Failed',
        description: 'Could not save your recording. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDiscard = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <Button onClick={() => router.back()} variant="outline" className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card className="shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline">
            <Mic className="h-6 w-6 mr-3 text-primary" />
            Record a Voice Note
          </CardTitle>
          <CardDescription>
            Capture your thoughts, ideas, or reminders on the fly.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-6 min-h-[250px]">
          {hasPermission === false && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Microphone Access Denied</AlertTitle>
              <AlertDescription>
                Mati needs access to your microphone to record audio. Please enable it in your browser settings.
              </AlertDescription>
            </Alert>
          )}

          {hasPermission && !audioUrl && (
            <>
              <Button
                size="lg"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isSaving}
                className={cn(
                  "rounded-full h-24 w-24 shadow-lg text-white transition-all duration-300",
                  isRecording ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-primary hover:bg-primary/90"
                )}
              >
                {isRecording ? <Square className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
              </Button>
              <div className="text-center">
                <p className="text-2xl font-mono font-semibold text-foreground">
                  {formatTime(recordingTime)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isRecording ? 'Click to Stop Recording' : 'Click to Start Recording'}
                </p>
              </div>
            </>
          )}

          {audioUrl && (
            <div className="w-full flex flex-col items-center space-y-4">
              <p className="font-medium text-foreground">Recording Complete! Preview below.</p>
              <audio controls src={audioUrl} className="w-full max-w-md rounded-lg" />
            </div>
          )}

        </CardContent>
        {audioUrl && !isSaving && (
          <CardFooter className="flex justify-center gap-4">
            <Button onClick={handleSaveRecording} size="lg" className="bg-green-600 hover:bg-green-700 text-white">
              <Save className="mr-2 h-5 w-5" /> Save
            </Button>
            <Button onClick={handleDiscard} size="lg" variant="destructive">
              <Trash2 className="mr-2 h-5 w-5" /> Discard
            </Button>
          </CardFooter>
        )}
        {isSaving && (
            <CardFooter className="flex justify-center">
                <div className="flex items-center text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin"/>
                    Saving your note...
                </div>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
