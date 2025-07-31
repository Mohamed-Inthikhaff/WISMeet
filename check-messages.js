const { MongoClient } = require('mongodb');

async function checkMessages() {
  const uri = "mongodb://localhost:27017/wismeet";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    const db = client.db();
    
    // Check messages collection
    const messages = await db.collection('messages').find({}).toArray();
    console.log(`\n📨 Found ${messages.length} messages:`);
    messages.forEach((msg, index) => {
      console.log(`\n--- Message ${index + 1} ---`);
      console.log(`ID: ${msg._id}`);
      console.log(`Meeting ID: ${msg.meetingId}`);
      console.log(`Sender: ${msg.senderName} (${msg.senderId})`);
      console.log(`Message: ${msg.message}`);
      console.log(`Type: ${msg.messageType}`);
      console.log(`Timestamp: ${msg.timestamp}`);
      console.log(`Reactions: ${msg.reactions?.length || 0}`);
    });

    // Check meetings collection
    const meetings = await db.collection('meetings').find({}).toArray();
    console.log(`\n📅 Found ${meetings.length} meetings:`);
    meetings.forEach((meeting, index) => {
      console.log(`\n--- Meeting ${index + 1} ---`);
      console.log(`ID: ${meeting._id}`);
      console.log(`Meeting ID: ${meeting.meetingId}`);
      console.log(`Title: ${meeting.title}`);
      console.log(`Host: ${meeting.hostId}`);
      console.log(`Status: ${meeting.status}`);
      console.log(`Created: ${meeting.createdAt}`);
    });

    // Check chat_sessions collection
    const chatSessions = await db.collection('chat_sessions').find({}).toArray();
    console.log(`\n💬 Found ${chatSessions.length} chat sessions:`);
    chatSessions.forEach((session, index) => {
      console.log(`\n--- Session ${index + 1} ---`);
      console.log(`ID: ${session._id}`);
      console.log(`Meeting ID: ${session.meetingId}`);
      console.log(`User ID: ${session.userId}`);
      console.log(`Joined: ${session.joinedAt}`);
      console.log(`Left: ${session.leftAt || 'Still active'}`);
    });

  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  } finally {
    await client.close();
  }
}

checkMessages(); 