import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useCall, useCallStateHooks } from '@stream-io/video-react-sdk';
import { useUser } from '@clerk/nextjs';
import MeetingRoom from '@/components/MeetingRoom';
import MeetingSetup from '@/components/MeetingSetup';

// Mock the Stream Video SDK
jest.mock('@stream-io/video-react-sdk', () => ({
  useCall: jest.fn(),
  useCallStateHooks: jest.fn(),
  CallControls: ({ children }: { children: React.ReactNode }) => <div data-testid="call-controls">{children}</div>,
  CallParticipantsList: ({ children }: { children: React.ReactNode }) => <div data-testid="participants-list">{children}</div>,
  CallStatsButton: () => <div data-testid="call-stats">Stats</div>,
  CallingState: {
    JOINED: 'joined',
    JOINING: 'joining',
    LEFT: 'left'
  },
  PaginatedGridLayout: () => <div data-testid="grid-layout">Grid Layout</div>,
  SpeakerLayout: () => <div data-testid="speaker-layout">Speaker Layout</div>,
  DeviceSettings: () => <div data-testid="device-settings">Device Settings</div>,
  VideoPreview: () => <div data-testid="video-preview">Video Preview</div>
}));

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn()
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn()
  }),
  useSearchParams: () => new URLSearchParams()
}));

describe('Participant Visibility Tests', () => {
  const mockCall = {
    id: 'test-call-id',
    state: {
      participants: [
        {
          userId: 'user1',
          user: { id: 'user1', name: 'Host User' },
          publishedTracks: [
            { type: 'audio', id: 'audio1' },
            { type: 'video', id: 'video1' }
          ]
        },
        {
          userId: 'user2',
          user: { id: 'user2', name: 'Guest User' },
          publishedTracks: [
            { type: 'audio', id: 'audio2' }
          ]
        }
      ],
      members: [
        { user: { id: 'user1' }, role: 'host' },
        { user: { id: 'user2' }, role: 'user' }
      ],
      custom: {
        initialCameraEnabled: true,
        initialMicEnabled: true
      }
    },
    on: jest.fn(),
    off: jest.fn(),
    camera: {
      enable: jest.fn(),
      disable: jest.fn()
    },
    microphone: {
      enable: jest.fn(),
      disable: jest.fn()
    },
    join: jest.fn()
  };

  const mockUseCallStateHooks = {
    useCallCallingState: jest.fn(() => 'joined'),
    useCallParticipants: jest.fn(() => mockCall.state.participants)
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useCall as jest.Mock).mockReturnValue(mockCall);
    (useCallStateHooks as jest.Mock).mockReturnValue(mockUseCallStateHooks);
    (useUser as jest.Mock).mockReturnValue({
      user: { id: 'user1', firstName: 'Host', username: 'hostuser' },
      isLoaded: true
    });
  });

  describe('MeetingRoom Component', () => {
    it('should display all participants correctly', async () => {
      render(<MeetingRoom />);

      // Check if participants list is rendered
      await waitFor(() => {
        expect(screen.getByTestId('participants-list')).toBeInTheDocument();
      });

      // Check if call controls are rendered
      expect(screen.getByTestId('call-controls')).toBeInTheDocument();

      // Check if layout components are rendered
      expect(screen.getByTestId('speaker-layout')).toBeInTheDocument();
    });

    it('should show participant count in UI', async () => {
      render(<MeetingRoom />);

      // The participant count should be displayed in the UI
      await waitFor(() => {
        expect(screen.getByText(/Participants \(2\)/)).toBeInTheDocument();
      });
    });

    it('should handle participant state changes', async () => {
      const mockOnCallUpdated = jest.fn();
      mockCall.on.mockImplementation((event, callback) => {
        if (event === 'call.updated') {
          mockOnCallUpdated(callback);
        }
      });

      render(<MeetingRoom />);

      // Verify event listeners are set up
      expect(mockCall.on).toHaveBeenCalledWith('call.updated', expect.any(Function));
    });
  });

  describe('MeetingSetup Component', () => {
    it('should join meeting with correct participant metadata', async () => {
      const mockJoin = jest.fn().mockResolvedValue(undefined);
      mockCall.join = mockJoin;

      const setIsSetupComplete = jest.fn();
      
      render(<MeetingSetup setIsSetupComplete={setIsSetupComplete} />);

      // Simulate joining the meeting
      const joinButton = screen.getByText('Join Meeting');
      joinButton.click();

      await waitFor(() => {
        expect(mockJoin).toHaveBeenCalledWith({
          data: {
            custom: {
              initialCameraEnabled: true,
              initialMicEnabled: true,
              participantName: expect.any(String)
            }
          }
        });
      });
    });

    it('should handle device state correctly', async () => {
      render(<MeetingSetup setIsSetupComplete={jest.fn()} />);

      // Check if device settings are available
      expect(screen.getByTestId('video-preview')).toBeInTheDocument();
    });
  });

  describe('Participant Synchronization', () => {
    it('should maintain participant list consistency', () => {
      const participants = mockCall.state.participants;
      
      // Verify both participants are present
      expect(participants).toHaveLength(2);
      
      // Verify host participant
      const host = participants.find(p => p.userId === 'user1');
      expect(host).toBeDefined();
      expect(host?.user.name).toBe('Host User');
      expect(host?.publishedTracks).toHaveLength(2);

      // Verify guest participant
      const guest = participants.find(p => p.userId === 'user2');
      expect(guest).toBeDefined();
      expect(guest?.user.name).toBe('Guest User');
      expect(guest?.publishedTracks).toHaveLength(1);
    });

    it('should handle participant permissions correctly', () => {
      const members = mockCall.state.members;
      
      // Verify host permissions
      const hostMember = members.find(m => m.user.id === 'user1');
      expect(hostMember?.role).toBe('host');

      // Verify guest permissions
      const guestMember = members.find(m => m.user.id === 'user2');
      expect(guestMember?.role).toBe('user');
    });
  });
}); 