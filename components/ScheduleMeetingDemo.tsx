"use client";
import { useState } from "react";
import { Button } from "./ui/button";
import { Calendar } from "lucide-react";
import ScheduleMeetingModal from "./ScheduleMeetingModal";

interface MeetingData {
  title: string;
  guests: string[];
  date: Date;
  time: Date;
  timezone: string;
  notificationTime: number;
  description: string;
}

const ScheduleMeetingDemo = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleScheduleMeeting = (meetingData: MeetingData) => {
    console.log("Scheduled meeting:", meetingData);
    
    // Here you would typically:
    // 1. Send the meeting data to your backend
    // 2. Create the meeting in your database
    // 3. Send invitation emails to guests
    // 4. Set up calendar notifications
    
    // For demo purposes, we'll just log the data
    alert(`Meeting scheduled successfully!
    
Title: ${meetingData.title}
Guests: ${meetingData.guests.join(", ")}
Date: ${meetingData.date.toLocaleDateString()}
Time: ${meetingData.time.toLocaleTimeString()}
Timezone: ${meetingData.timezone}
Notification: ${meetingData.notificationTime} minutes before
Description: ${meetingData.description || "No description"}`);
  };

  return (
    <div className="p-6">
      <Button
        onClick={() => setIsModalOpen(true)}
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg flex items-center gap-2"
      >
        <Calendar className="h-5 w-5" />
        Schedule a Meeting
      </Button>

      <ScheduleMeetingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSchedule={handleScheduleMeeting}
      />
    </div>
  );
};

export default ScheduleMeetingDemo; 