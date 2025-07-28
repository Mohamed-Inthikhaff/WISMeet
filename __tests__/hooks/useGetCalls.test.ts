import { renderHook, waitFor } from '@testing-library/react';
import { useGetCalls } from '@/hooks/useGetCalls';

// Mock the Stream Video client
const mockClient = {
  queryCalls: jest.fn(),
  call: jest.fn(),
};

jest.mock('@stream-io/video-react-sdk', () => ({
  useStreamVideoClient: () => mockClient,
}));

describe('useGetCalls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useGetCalls());
    
    expect(result.current.isLoading).toBe(true);
    expect(result.current.upcomingCalls).toEqual([]);
    expect(result.current.endedCalls).toEqual([]);
    expect(result.current.callRecordings).toEqual([]);
  });

  it('should fetch upcoming calls successfully', async () => {
    const mockUpcomingCalls = [
      {
        id: 'call-1',
        starts_at: '2024-01-01T10:00:00Z',
        custom: { description: 'Test Meeting 1' },
      },
      {
        id: 'call-2',
        starts_at: '2024-01-02T10:00:00Z',
        custom: { description: 'Test Meeting 2' },
      },
    ];

    mockClient.queryCalls.mockResolvedValue({
      calls: mockUpcomingCalls,
    });

    const mockCallObject = {
      id: 'call-1',
      state: { custom: { description: 'Test Meeting 1' } },
      get: jest.fn().mockResolvedValue(undefined),
    };

    mockClient.call.mockReturnValue(mockCallObject);

    const { result } = renderHook(() => useGetCalls());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockClient.queryCalls).toHaveBeenCalledWith({
      filter_conditions: {
        starts_at: { $gt: expect.any(String) },
        $or: [
          { created_by_user_id: 'test-user-id' },
          { members: { $in: ['test-user-id'] } },
        ],
      },
      sort: [{ field: 'starts_at', direction: 1 }],
      limit: 10,
    });
  });

  it('should fetch ended calls successfully', async () => {
    const mockEndedCalls = [
      {
        id: 'ended-call-1',
        ended_at: '2024-01-01T11:00:00Z',
        custom: { description: 'Ended Meeting 1' },
      },
    ];

    mockClient.queryCalls.mockResolvedValue({
      calls: mockEndedCalls,
    });

    const mockCallObject = {
      id: 'ended-call-1',
      state: { custom: { description: 'Ended Meeting 1' } },
      get: jest.fn().mockResolvedValue(undefined),
    };

    mockClient.call.mockReturnValue(mockCallObject);

    const { result } = renderHook(() => useGetCalls());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockClient.queryCalls).toHaveBeenCalledWith({
      filter_conditions: {
        ended_at: { $exists: true },
        $or: [
          { created_by_user_id: 'test-user-id' },
          { members: { $in: ['test-user-id'] } },
        ],
      },
      sort: [{ field: 'ended_at', direction: -1 }],
      limit: 10,
    });
  });

  it('should fetch recordings successfully', async () => {
    const mockRecordings = [
      {
        id: 'recording-call-1',
        ended_at: '2024-01-01T11:00:00Z',
        recording_status: 'ready',
        custom: { description: 'Recorded Meeting 1' },
      },
    ];

    mockClient.queryCalls.mockResolvedValue({
      calls: mockRecordings,
    });

    const mockCallObject = {
      id: 'recording-call-1',
      state: { 
        custom: { description: 'Recorded Meeting 1' },
        recording: { url: 'https://example.com/recording.mp4' },
      },
      get: jest.fn().mockResolvedValue(undefined),
    };

    mockClient.call.mockReturnValue(mockCallObject);

    const { result } = renderHook(() => useGetCalls());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockClient.queryCalls).toHaveBeenCalledWith({
      filter_conditions: {
        ended_at: { $exists: true },
        recording_status: 'ready',
        $or: [
          { created_by_user_id: 'test-user-id' },
          { members: { $in: ['test-user-id'] } },
        ],
      },
      sort: [{ field: 'ended_at', direction: -1 }],
      limit: 10,
    });
  });

  it('should handle errors gracefully', async () => {
    mockClient.queryCalls.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useGetCalls());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.upcomingCalls).toEqual([]);
    expect(result.current.endedCalls).toEqual([]);
    expect(result.current.callRecordings).toEqual([]);
  });

  it('should attach custom properties to call objects', async () => {
    const mockCalls = [
      {
        id: 'call-1',
        starts_at: '2024-01-01T10:00:00Z',
        custom: { description: 'Test Meeting' },
      },
    ];

    mockClient.queryCalls.mockResolvedValue({
      calls: mockCalls,
    });

    const mockCallObject = {
      id: 'call-1',
      state: { custom: { description: 'Test Meeting' } },
      get: jest.fn().mockResolvedValue(undefined),
    };

    mockClient.call.mockReturnValue(mockCallObject);

    const { result } = renderHook(() => useGetCalls());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.upcomingCalls[0]).toHaveProperty('_startsAt');
    expect(result.current.upcomingCalls[0]).toHaveProperty('_description');
  });
}); 