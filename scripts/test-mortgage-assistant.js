#!/usr/bin/env node

/**
 * Test script for Mortgage Meeting Assistant Bot
 * Tests all integrations: Gemini AI, Google Calendar, Email
 */

require('dotenv').config({ path: '.env.local' });

console.log('🚀 Starting Mortgage Meeting Assistant Bot Integration Tests...\n');

// Test environment variables
console.log('🔧 Checking Environment Variables...');
const requiredEnvVars = [
  'GEMINI_API_KEY',
  'GEMINI_API_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'EMAIL_HOST',
  'EMAIL_USER',
  'EMAIL_PASS'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.log('❌ Missing environment variables:');
  missingVars.forEach(varName => console.log(`   - ${varName}`));
  console.log('\nPlease configure these variables in your .env.local file');
  process.exit(1);
} else {
  console.log('✅ All required environment variables are set');
}

// Test Gemini AI Integration
async function testGeminiAI() {
  console.log('\n🧠 Testing Gemini AI Integration...');
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/mortgage-assistant/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript: `Advisor: Good morning, Mr. Johnson. Thank you for coming in today to discuss your mortgage options.
        
        Client: Good morning. I'm looking to buy a house for around $350,000 and I have about $70,000 for a down payment.
        
        Advisor: That's great. With a $70,000 down payment on a $350,000 home, you'd be putting down about 20%, which is excellent. This will help you avoid PMI. What's your current credit score?
        
        Client: My credit score is 720. I've been working on improving it over the past year.
        
        Advisor: That's a good score. Based on your situation, I can offer you a 30-year fixed-rate mortgage at 6.5% APR. With your 20% down payment, your monthly payment would be approximately $1,770 for principal and interest.
        
        Client: That sounds reasonable. What documents will I need to provide?
        
        Advisor: You'll need your W-2s from the past two years, recent pay stubs, bank statements for the last three months, and any additional income documentation. We'll also need to verify your employment and run a credit check.
        
        Client: I can provide all of those. How long does the approval process typically take?
        
        Advisor: With all documents in order, we can typically close within 30-45 days. I'll need you to complete the loan application today, and then we can start processing everything.`,
        meetingType: 'mortgage_consultation',
        clientName: 'Mr. Johnson',
        advisorName: 'Mortgage Advisor'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Gemini AI Integration Test PASSED');
      console.log('📝 Summary:', result.summary);
      console.log('🔑 Key Points:', result.keyPoints?.length || 0, 'items');
      console.log('✅ Action Items:', result.actionItems?.length || 0, 'items');
      console.log('🚀 Next Steps:', result.nextSteps?.length || 0, 'items');
      return true;
    } else {
      console.log('❌ Gemini AI Integration Test FAILED');
      console.log('Error:', result.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Gemini AI Integration Test FAILED');
    console.log('Error:', error.message);
    return false;
  }
}

// Test Google Calendar Integration
async function testGoogleCalendar() {
  console.log('\n📅 Testing Google Calendar Integration...');
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/mortgage-assistant/calendar?action=auth`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Google Calendar Integration Test PASSED');
      console.log('🔗 Auth URL generated successfully');
      return true;
    } else {
      console.log('❌ Google Calendar Integration Test FAILED');
      console.log('Error:', result.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Google Calendar Integration Test FAILED');
    console.log('Error:', error.message);
    return false;
  }
}

// Test Email Integration
async function testEmail() {
  console.log('\n📧 Testing Email Integration...');
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/mortgage-assistant/email?action=test`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Email Integration Test PASSED');
      console.log('📨 Test email sent successfully');
      return true;
    } else {
      console.log('❌ Email Integration Test FAILED');
      console.log('Error:', result.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Email Integration Test FAILED');
    console.log('Error:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const results = {
    gemini: await testGeminiAI(),
    calendar: await testGoogleCalendar(),
    email: await testEmail()
  };

  console.log('\n📊 Test Results Summary:');
  console.log('🧠 Gemini AI:', results.gemini ? '✅ PASSED' : '❌ FAILED');
  console.log('📅 Google Calendar:', results.calendar ? '✅ PASSED' : '❌ FAILED');
  console.log('📧 Email:', results.email ? '✅ PASSED' : '❌ FAILED');

  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 All tests PASSED! Mortgage Assistant Bot is ready for use.');
  } else {
    console.log('\n⚠️ Some tests FAILED. Please check the configuration and try again.');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { testGeminiAI, testGoogleCalendar, testEmail, runAllTests }; 