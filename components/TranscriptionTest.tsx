'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { transcriptContext } from '@/lib/transcript-context';

const TranscriptionTest = () => {
  const [testTranscript, setTestTranscript] = useState('');
  const [meetingId] = useState('test-meeting-123');

  const testTranscription = () => {
    const sampleTranscript = `
Advisor: Hello, welcome to our mortgage consultation today. How can I help you?

Client: Hi, I'm looking to buy my first home. I have about $50,000 saved for a down payment.

Advisor: That's great! What's your target home price range?

Client: I'm looking at homes around $300,000 to $350,000.

Advisor: Perfect. With a $50,000 down payment on a $325,000 home, you'd be putting down about 15%. What's your credit score?

Client: My credit score is 750.

Advisor: Excellent! With that credit score and down payment, I can offer you a 30-year fixed-rate mortgage at 6.2% APR. Your monthly payment would be approximately $1,990.

Client: That sounds good. What documents do I need?

Advisor: You'll need W-2s, pay stubs, bank statements, and employment verification. We can start the application process today.
    `;

    transcriptContext.setTranscript(meetingId, sampleTranscript);
    setTestTranscript(sampleTranscript);
    console.log('✅ Test transcript set:', sampleTranscript.length, 'characters');
  };

  const getTranscript = () => {
    const transcript = transcriptContext.getTranscript(meetingId);
    console.log('📝 Retrieved transcript:', transcript);
    alert(`Transcript (${transcript.length} characters):\n\n${transcript}`);
  };

  const clearTranscript = () => {
    transcriptContext.clearTranscript(meetingId);
    setTestTranscript('');
    console.log('🗑️ Transcript cleared');
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">Transcription Test</h3>
      <div className="space-y-2">
        <Button onClick={testTranscription} className="mr-2">
          Set Test Transcript
        </Button>
        <Button onClick={getTranscript} className="mr-2">
          Get Transcript
        </Button>
        <Button onClick={clearTranscript} variant="outline">
          Clear Transcript
        </Button>
      </div>
      {testTranscript && (
        <div className="mt-4 p-3 bg-white border rounded">
          <p className="text-sm text-gray-600">Test transcript set ({testTranscript.length} characters)</p>
        </div>
      )}
    </div>
  );
};

export default TranscriptionTest; 