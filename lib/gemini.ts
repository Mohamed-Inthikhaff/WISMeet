/**
 * Gemini AI Integration for Mortgage Meeting Assistant Bot
 * Handles mortgage-specific transcript summarization
 */

export interface GeminiSummaryRequest {
  transcript: string;
  meetingType?: 'mortgage_consultation' | 'loan_application' | 'refinance' | 'general';
  clientName?: string;
  advisorName?: string;
}

export interface GeminiSummaryResponse {
  success: boolean;
  summary?: string;
  keyPoints?: string[];
  actionItems?: string[];
  nextSteps?: string[];
  error?: string;
}

/**
 * Sends transcript to Gemini AI for mortgage-specific summarization
 */
export const summarizeTranscript = async (
  request: GeminiSummaryRequest
): Promise<GeminiSummaryResponse> => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Create mortgage-specific prompt
    const prompt = createMortgagePrompt(request);

    const response = await fetch(`${apiUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response format from Gemini API');
    }

    const summaryText = data.candidates[0].content.parts[0].text;
    
    // Parse the structured response
    const parsedSummary = parseGeminiResponse(summaryText);

    return {
      success: true,
      ...parsedSummary
    };

  } catch (error) {
    console.error('Error summarizing transcript with Gemini:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Creates a mortgage-specific prompt for Gemini AI
 */
const createMortgagePrompt = (request: GeminiSummaryRequest): string => {
  const { transcript, meetingType = 'mortgage_consultation', clientName, advisorName } = request;
  
  const meetingContext = getMeetingTypeContext(meetingType);
  
  return `You are a professional mortgage advisor assistant. Please analyze the following mortgage meeting transcript and provide a comprehensive summary focused on mortgage-specific details.

Meeting Context: ${meetingContext}
${clientName ? `Client: ${clientName}` : ''}
${advisorName ? `Advisor: ${advisorName}` : ''}

Transcript:
${transcript}

Please provide a structured response in the following JSON format:

{
  "summary": "A concise 2-3 sentence summary of the meeting",
  "keyPoints": [
    "Key mortgage details discussed",
    "Loan terms mentioned",
    "Financial figures discussed",
    "Important decisions made"
  ],
  "actionItems": [
    "Specific tasks that need to be completed",
    "Documents required",
    "Follow-up actions needed"
  ],
  "nextSteps": [
    "Immediate next steps for the client",
    "Timeline for follow-up",
    "Important deadlines"
  ]
}

Focus on:
- Mortgage rates and terms discussed
- Loan amounts and types
- Financial qualifications and requirements
- Documentation needed
- Timeline and deadlines
- Any concerns or questions raised
- Decisions made during the meeting

Ensure all financial information is accurately captured and any specific mortgage products or rates mentioned are clearly noted.`;
};

/**
 * Gets context based on meeting type
 */
const getMeetingTypeContext = (meetingType: string): string => {
  switch (meetingType) {
    case 'mortgage_consultation':
      return 'Initial mortgage consultation meeting to discuss loan options and requirements';
    case 'loan_application':
      return 'Loan application meeting to process mortgage application and collect documentation';
    case 'refinance':
      return 'Mortgage refinance consultation to discuss refinancing options and benefits';
    default:
      return 'General mortgage-related meeting';
  }
};

/**
 * Parses the structured response from Gemini AI
 */
const parseGeminiResponse = (responseText: string): {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  nextSteps: string[];
} => {
  try {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || 'Summary not available',
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
        nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : []
      };
    }
  } catch (error) {
    console.warn('Failed to parse structured response, using fallback parsing');
  }

  // Fallback parsing if JSON parsing fails
  const lines = responseText.split('\n').filter(line => line.trim());
  
  return {
    summary: lines[0] || 'Summary not available',
    keyPoints: extractListItems(responseText, 'keyPoints', 'Key Points'),
    actionItems: extractListItems(responseText, 'actionItems', 'Action Items'),
    nextSteps: extractListItems(responseText, 'nextSteps', 'Next Steps')
  };
};

/**
 * Extracts list items from text based on section headers
 */
const extractListItems = (text: string, sectionKey: string, sectionHeader: string): string[] => {
  const items: string[] = [];
  
  // Look for the section header
  const sectionIndex = text.toLowerCase().indexOf(sectionHeader.toLowerCase());
  if (sectionIndex === -1) return items;

  // Extract text after the header
  const sectionText = text.substring(sectionIndex + sectionHeader.length);
  
  // Split by lines and look for bullet points or numbered items
  const lines = sectionText.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*') || /^\d+\./.test(trimmed))) {
      items.push(trimmed.replace(/^[-•*\d\.\s]+/, '').trim());
    }
  }

  return items;
};

/**
 * Test function to verify Gemini AI integration
 */
export const testGeminiIntegration = async (): Promise<GeminiSummaryResponse> => {
  const testTranscript = `
  Advisor: Good morning, Mr. Johnson. Thank you for coming in today to discuss your mortgage options.
  
  Client: Good morning. I'm looking to buy a house for around $350,000 and I have about $70,000 for a down payment.
  
  Advisor: That's great. With a $70,000 down payment on a $350,000 home, you'd be putting down about 20%, which is excellent. This will help you avoid PMI. What's your current credit score?
  
  Client: My credit score is 720. I've been working on improving it over the past year.
  
  Advisor: That's a good score. Based on your situation, I can offer you a 30-year fixed-rate mortgage at 6.5% APR. With your 20% down payment, your monthly payment would be approximately $1,770 for principal and interest.
  
  Client: That sounds reasonable. What documents will I need to provide?
  
  Advisor: You'll need your W-2s from the past two years, recent pay stubs, bank statements for the last three months, and any additional income documentation. We'll also need to verify your employment and run a credit check.
  
  Client: I can provide all of those. How long does the approval process typically take?
  
  Advisor: With all documents in order, we can typically close within 30-45 days. I'll need you to complete the loan application today, and then we can start processing everything.
  `;

  return await summarizeTranscript({
    transcript: testTranscript,
    meetingType: 'mortgage_consultation',
    clientName: 'Mr. Johnson',
    advisorName: 'Mortgage Advisor'
  });
}; 