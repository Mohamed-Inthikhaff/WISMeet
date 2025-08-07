'use client';

import { useEffect, useRef, useState } from 'react';
import { createTranscriptionService, TranscriptionService } from '@/lib/transcription-service';
import { transcriptContext } from '@/lib/transcript-context';

interface MeetingTranscriptionProps {
  meetingId: string;
  isActive: boolean;
  onTranscriptUpdate?: (transcript: string) => void;
}

const MeetingTranscription = ({ meetingId, isActive, onTranscriptUpdate }: MeetingTranscriptionProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const transcriptionServiceRef = useRef<TranscriptionService | null>(null);

  // Initialize transcription service
  useEffect(() => {
    if (!meetingId) return;

    console.log('🎤 Initializing MeetingTranscription for meeting:', meetingId);

    transcriptionServiceRef.current = createTranscriptionService({
      meetingId,
      onTranscriptUpdate: (newTranscript) => {
        console.log('📝 MeetingTranscription received transcript update:', newTranscript.length, 'characters');
        setTranscript(newTranscript);
        transcriptContext.setTranscript(meetingId, newTranscript);
        onTranscriptUpdate?.(newTranscript);
      },
      onError: (errorMessage) => {
        console.error('❌ MeetingTranscription error:', errorMessage);
        setError(errorMessage);
      }
    });

    console.log('✅ MeetingTranscription service initialized');

    return () => {
      if (transcriptionServiceRef.current) {
        console.log('🛑 Cleaning up MeetingTranscription service');
        transcriptionServiceRef.current.stopTranscription();
      }
    };
  }, [meetingId, onTranscriptUpdate]);

  // Start/stop transcription based on meeting state - Fixed to prevent infinite loop
  useEffect(() => {
    console.log('🔄 MeetingTranscription state changed:', { isActive, meetingId });
    
    const startTranscription = async () => {
      if (!transcriptionServiceRef.current || !isActive) return;

      try {
        console.log('🎤 Starting transcription...');
        setError(null);
        const success = await transcriptionServiceRef.current.startTranscription();
        setIsRecording(success);
        
        if (!success) {
          console.error('❌ Failed to start transcription');
          setError('Failed to start transcription');
        } else {
          console.log('✅ Transcription started successfully');
        }
      } catch (error) {
        console.error('❌ Error starting transcription:', error);
        setError('Failed to start transcription');
      }
    };

    const stopTranscription = async () => {
      if (!transcriptionServiceRef.current) return;

      try {
        console.log('🛑 Stopping transcription...');
        const finalTranscript = await transcriptionServiceRef.current.stopTranscription();
        setIsRecording(false);
        setTranscript(finalTranscript);
        console.log('✅ Transcription stopped, final length:', finalTranscript.length);
        onTranscriptUpdate?.(finalTranscript);
      } catch (error) {
        console.error('❌ Error stopping transcription:', error);
        setError('Failed to stop transcription');
      }
    };

    // Only start if active and not already recording
    if (isActive && !isRecording) {
      startTranscription();
    } 
    // Only stop if not active and currently recording
    else if (!isActive && isRecording) {
      stopTranscription();
    }
  }, [isActive, onTranscriptUpdate, meetingId]); // Removed isRecording from dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transcriptionServiceRef.current) {
        console.log('🛑 MeetingTranscription cleanup on unmount');
        transcriptionServiceRef.current.stopTranscription();
      }
    };
  }, []);

  // Don't render anything visible - this is a background service
  return null;
};

export default MeetingTranscription; 