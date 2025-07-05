
'use client';

import type React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Mic, Square, Save, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { uploadFile } from '@/services/contentService';
import type { ContentItem } from '@/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface RecordVoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecordingSave: (newContentData: Omit<ContentItem, 'id' | 'createdAt'>) => Promise<void>;
}

const RecordVoiceDialog: React.FC<RecordVoiceDialogProps> = ({ open, onOpenChange, onRecordingSave }) => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRecognitionSupported, setIsRecognitionSupported] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const resetState = useCallback(() => {
    setIsRecording(false);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setTranscript('');
    setFinalTranscript('');
    setIsSaving(false);
    audioChunksRef.current = [];
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  }, []);

  useEffect(() => {
    if (!open) {
      if (isRecording) {
        stopRecording();
      }
      resetState();
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => setHasPermission(true))
      .catch((error) => {
        console.error('Error accessing microphone:', error);
        setHasPermission(false);
        toast({
          variant: 'destructive',
          title: 'Microphone Access Denied',
          description: 'Please enable microphone permissions in your browser settings.',
        });
      });

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsRecognitionSupported(false);
      toast({
        variant: 'destructive',
        title: 'Browser Not Supported',
        description: 'Web Speech API for transcription is not supported in your browser.',
      });
    } else if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
    }

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop();
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, toast]);


  const startRecording = async () => {
    if (!hasPermission || !isRecognitionSupported) {
        toast({
          variant: 'destructive',
          title: 'Cannot Start Recording',
          description: !hasPermission 
            ? 'Cannot record without microphone permission.'
            : 'Transcription is not supported.',
        });
        return;
    }
    
    resetState();

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        
        mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            setAudioBlob(blob);
            setAudioUrl(URL.createObjectURL(blob));
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorderRef.current.start();
        
        if (recognitionRef.current) {
            const recognition = recognitionRef.current;
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            let accumulatedFinalTranscript = '';

            recognition.onresult = (event) => {
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        accumulatedFinalTranscript += event.results[i][0].transcript + ' ';
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                setFinalTranscript(accumulatedFinalTranscript);
                setTranscript(accumulatedFinalTranscript + interimTranscript);
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                toast({ variant: 'destructive', title: 'Transcription Error', description: `Error: ${event.error}` });
            };
            
            recognition.start();
        }

        setIsRecording(true);
        timerIntervalRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);

    } catch (error) {
        console.error('Failed to start recording:', error);
        toast({ title: 'Error', description: 'Could not start recording.', variant: 'destructive'});
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const handleSave = async () => {
    if (!audioBlob || !user) return;
    setIsSaving(true);
    
    const currentToast = toast({ title: 'Uploading Recording...', description: 'Please wait.' });

    try {
      const fileName = `voice-note-${Date.now()}.webm`;
      const filePath = `voiceRecordings/${user.uid}/${fileName}`;
      const downloadUrl = await uploadFile(new File([audioBlob], fileName), filePath);

      const newContentData: Omit<ContentItem, 'id' | 'createdAt'> = {
        type: 'voice',
        title: format(new Date(), 'MMM d, yyyy h:mm a'),
        description: finalTranscript.trim(),
        audioUrl: downloadUrl,
        tags: [{ id: 'voice-note', name: 'voice note' }],
        contentType: 'Voice Recording',
        status: 'pending-analysis'
      };

      await onRecordingSave(newContentData);
      
      currentToast.update({
        id: currentToast.id,
        title: 'Recording Saved!',
        description: 'Your voice note has been added to your memories.',
        variant: 'default',
      });
      
      onOpenChange(false);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl font-headline">
            <Mic className="h-6 w-6 mr-3 text-primary" />
            Record a Voice Note
          </DialogTitle>
          <CardDescription>
            Capture your thoughts on the fly. We'll even transcribe it for you.
          </CardDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center space-y-6 min-h-[250px] py-4">
          {hasPermission === false && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Microphone Access Denied</AlertTitle>
              <AlertDescription>
                Mäti needs access to your microphone. Please enable it in your browser settings.
              </AlertDescription>
            </Alert>
          )}

          {!isRecognitionSupported && hasPermission && (
             <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Browser Not Supported</AlertTitle>
              <AlertDescription>
                Live transcription is not available. You can still record audio.
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
                  {isRecording ? 'Click to Stop' : 'Click to Start'}
                </p>
              </div>
               {isRecording && (
                    <div className="w-full mt-2 p-3 bg-muted/50 rounded-lg min-h-[60px] text-muted-foreground text-center">
                        <p className="whitespace-pre-wrap">{transcript || 'Listening...'}</p>
                    </div>
                )}
            </>
          )}

          {audioUrl && (
            <div className="w-full flex flex-col items-center space-y-4">
              <p className="font-medium text-foreground">Recording Complete!</p>
              <audio controls src={audioUrl} className="w-full rounded-lg" />
              {finalTranscript && (
                  <ScrollArea className="w-full max-h-40 p-3 border rounded-lg bg-muted/30">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{finalTranscript.trim()}</p>
                  </ScrollArea>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="pt-4 border-t">
            {audioUrl && !isSaving ? (
                <>
                <Button onClick={resetState} variant="outline">
                    Discard
                </Button>
                <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Save className="mr-2 h-4 w-4" /> Save
                </Button>
                </>
            ) : isSaving ? (
                <div className="flex w-full justify-end items-center text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                    Saving your note...
                </div>
            ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RecordVoiceDialog;
