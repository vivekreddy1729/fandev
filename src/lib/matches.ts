import { supabase } from './supabase';
import { IPLSchedule } from '@/types/supabase';

type SupabaseResponse<T> = { data: T | null; error: any };

async function fetchWithRetry<T>(operation: () => Promise<SupabaseResponse<T>> | SupabaseResponse<T>, retries = 3, delay = 1000): Promise<SupabaseResponse<T>> {
  for (let i = 0; i < retries; i++) {
    const result = await operation();
    if (!result.error) return result;
    
    console.warn(`Attempt ${i + 1} failed, retrying in ${delay}ms...`, result.error);
    await new Promise(resolve => setTimeout(resolve, delay));
    delay *= 2; // Exponential backoff
  }
  
  return await operation();
}

export async function getMatches() {
  try {
    // Get current date/time in IST
    const currentDateIST = convertLocalToIST(new Date());
    const dateString = currentDateIST.toISOString().split('T')[0];
    const timeString = currentDateIST.toTimeString().split(' ')[0];
    
    console.log('Fetching matches...', { dateString, timeString });
    
    // Test connection first
    const testResult = await fetchWithRetry<{ count: number }>(
      async () => await supabase.from('ipl_schedule').select('count').single()
    );
    
    if (testResult.error) {
      console.error('Failed to connect to Supabase:', testResult.error);
      return { futureMatches: [], pastMatches: [] };
    }
    
    // Get all matches
    const { data: allMatchesData, error: matchError } = await fetchWithRetry<IPLSchedule[]>(
      async () => await supabase
        .from('ipl_schedule')
        .select('*')
        .order('match_date', { ascending: true })
        .order('match_time', { ascending: true })
    );

    if (matchError) {
      console.error('Error fetching matches:', matchError);
      return { futureMatches: [], pastMatches: [] };
    }

    // Post-process matches based on their status
    const processedMatches = {
      future: [] as IPLSchedule[],
      past: [] as IPLSchedule[]
    };

    // Process all matches based on their status
    (allMatchesData || []).forEach(match => {
      const status = getMatchStatus(match);
      if (status === 'upcoming' || status === 'live') {
        processedMatches.future.push(match);
      } else {
        processedMatches.past.push(match);
      }
    });

    // Sort the matches
    processedMatches.future.sort((a, b) => {
      const dateA = convertISTtoLocal(a.match_date, a.match_time);
      const dateB = convertISTtoLocal(b.match_date, b.match_time);
      return dateA.getTime() - dateB.getTime();
    });

    processedMatches.past.sort((a, b) => {
      const dateA = convertISTtoLocal(a.match_date, a.match_time);
      const dateB = convertISTtoLocal(b.match_date, b.match_time);
      return dateB.getTime() - dateA.getTime();
    });

    console.log('Matches processed:', {
      future: processedMatches.future.length,
      past: processedMatches.past.length
    });

    return {
      futureMatches: processedMatches.future,
      pastMatches: processedMatches.past
    };
  } catch (error) {
    console.error('Error in getMatches:', error);
    return { futureMatches: [], pastMatches: [] };
  }
}

function convertISTtoLocal(date: string, time: string): Date {
  // Create a date object in IST
  const istDate = new Date(`${date}T${time}+05:30`); // +05:30 is IST offset
  return istDate;
}

function convertLocalToIST(date: Date): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
}

export function formatMatchDateTime(date: string, time: string) {
  const matchDate = convertISTtoLocal(date, time);
  
  // Get user's timezone
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const isUserInIST = userTimeZone === 'Asia/Kolkata';
  
  // Format the date in user's timezone
  const localTime = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
    timeZone: userTimeZone
  }).format(matchDate);

  // If user is not in IST, also show IST time
  if (!isUserInIST) {
    const istTime = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    }).format(matchDate);
    return `${localTime} (${istTime} IST)`;
  }

  return `${localTime} IST`;
}

export function getMatchStatus(match: IPLSchedule) {
  const currentDate = new Date();
  const matchDateTime = convertISTtoLocal(match.match_date, match.match_time);
  
  // If match has a winner or result, it's completed
  if (match.winner || match.result) {
    return 'completed';
  }
  
  // If match is in progress (status is 'In Progress' or similar)
  if (match.status.toLowerCase().includes('progress')) {
    return 'live';
  }
  
  // Calculate time difference in hours
  const timeDiffHours = (currentDate.getTime() - matchDateTime.getTime()) / (1000 * 60 * 60);
  
  // If match is more than 6 hours in the past
  if (timeDiffHours > 6) {
    return 'completed';
  }
  
  // If match is starting within the next hour
  if (timeDiffHours >= -1 && timeDiffHours <= 6) {
    return 'live';
  }
  
  // If match is in the future (more than 1 hour away)
  if (timeDiffHours < -1) {
    return 'upcoming';
  }
  
  // Default to completed for any other case
  return 'completed';
}
