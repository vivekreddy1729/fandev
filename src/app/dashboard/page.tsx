'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { getMatches, getMatchStatus } from '@/lib/matches';
import { IPLSchedule } from '@/types/supabase';
import { useUser } from '@clerk/nextjs';
import { MatchCard } from '@/components/MatchCard';

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [matches, setMatches] = useState<{ futureMatches: IPLSchedule[], pastMatches: IPLSchedule[] }>({ futureMatches: [], pastMatches: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        const matchData = await getMatches();
        setMatches(matchData);
      } catch (error) {
        console.error('Error fetching matches:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, []);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg text-gray-600">Please sign in to view the dashboard.</div>
      </div>
    );
  }

  const liveMatches = matches.futureMatches.filter(match => getMatchStatus(match) === 'live');
  const upcomingMatches = matches.futureMatches.filter(match => getMatchStatus(match) === 'upcoming');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg text-gray-600">Loading matches...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">IPL Fantasy League</h1>
        
        <Tabs defaultValue="live" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="live" className="font-semibold">
              Live Matches {liveMatches.length > 0 && `(${liveMatches.length})`}
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="font-semibold">
              Upcoming Matches {upcomingMatches.length > 0 && `(${upcomingMatches.length})`}
            </TabsTrigger>
            <TabsTrigger value="past" className="font-semibold">
              Past Matches {matches.pastMatches.length > 0 && `(${matches.pastMatches.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="mt-4">
            {liveMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveMatches.map((match) => (
                  <MatchCard 
                    key={match.match_id} 
                    match={match} 
                    status="live"
                    showCreateTeam
                  />
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">No live matches at the moment</div>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="mt-4">
            {upcomingMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingMatches.map((match) => (
                  <MatchCard 
                    key={match.match_id} 
                    match={match} 
                    status="upcoming"
                    showCreateTeam
                  />
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">No upcoming matches scheduled</div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-4">
            {matches.pastMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {matches.pastMatches.map((match) => (
                  <MatchCard key={match.match_id} match={match} status="completed" />
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">No past matches available</div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
