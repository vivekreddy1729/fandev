import { IPLSchedule } from '@/types/supabase';
import { IPL_TEAMS } from '@/lib/teams';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatMatchDateTime } from '@/lib/matches';
import { getMatchParticipants } from '@/lib/userTeams';
import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MatchParticipant } from '@/types/types';

interface MatchCardProps {
  match: IPLSchedule;
  status: 'live' | 'upcoming' | 'completed';
  showCreateTeam?: boolean;
}

export function MatchCard({ match, status, showCreateTeam = false }: MatchCardProps) {
  const router = useRouter();
  const { user } = useUser();
  const [participants, setParticipants] = useState<MatchParticipant[]>([]);
  const [hasTeam, setHasTeam] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<MatchParticipant | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const team1Info = IPL_TEAMS[match.team1];
  const team2Info = IPL_TEAMS[match.team2];

  useEffect(() => {
    const loadData = async () => {
      // Get participants
      const matchParticipants = await getMatchParticipants(match.match_id);
      setParticipants(matchParticipants);

      // Check if user has team
      if (user?.emailAddresses[0]?.emailAddress) {
        const hasExistingTeam = matchParticipants.some(
          (p) => p.userEmail === user.emailAddresses[0].emailAddress
        );
        setHasTeam(hasExistingTeam);
      }
    };
    loadData();
  }, [match.match_id, user?.emailAddresses]);

  // Fallback for teams not found in mapping
  const team1 = team1Info || {
    name: match.team1,
    shortName: match.team1.split(' ').map(word => word[0]).join(''),
    logo: '/inverse-crest.svg',
    primaryColor: '#666',
    secondaryColor: '#999'
  };

  const team2 = team2Info || {
    name: match.team2,
    shortName: match.team2.split(' ').map(word => word[0]).join(''),
    logo: '/inverse-crest.svg',
    primaryColor: '#666',
    secondaryColor: '#999'
  };

  const statusColors = {
    live: 'bg-red-500',
    upcoming: 'bg-blue-500',
    completed: 'bg-gray-500'
  };

  const statusText = {
    live: 'LIVE',
    upcoming: 'Upcoming',
    completed: 'Completed'
  };

  // Log missing teams for debugging
  if (!team1Info || !team2Info) {
    console.warn('Team not found in mapping:', {
      match_id: match.match_id,
      team1: match.team1,
      team2: match.team2,
      team1Found: !!team1Info,
      team2Found: !!team2Info
    });
  }

  return (
    <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300">
      <CardContent className="p-6">
        {/* Match Info */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-gray-600">
            <div className="font-medium mb-1">{formatMatchDateTime(match.match_date, match.match_time)}</div>
            <div className="text-gray-500">{match.venue}, {match.city}</div>
          </div>
          {status !== 'completed' && (
            <div 
              className={`
                ${statusColors[status]} 
                text-white text-xs tracking-wider
                py-1 px-3 rounded-full
                font-medium
              `}
            >
              {statusText[status]}
            </div>
          )}
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between gap-6 mb-4">
          {/* Team 1 */}
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="w-16 h-16 relative mb-2">
              <img 
                src={team1.logo} 
                alt={team1.name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = '/inverse-crest.svg';
                  e.currentTarget.onerror = null;
                }}
              />
            </div>
            <div className="font-semibold text-sm">{team1.shortName}</div>
          </div>

          {/* VS */}
          <div className="text-gray-400 font-bold text-sm">VS</div>

          {/* Team 2 */}
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="w-16 h-16 relative mb-2">
              <img 
                src={team2.logo} 
                alt={team2.name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = '/inverse-crest.svg';
                  e.currentTarget.onerror = null;
                }}
              />
            </div>
            <div className="font-semibold text-sm">{team2.shortName}</div>
          </div>
        </div>

        {/* Match Result or Team Info */}
        <div className="mt-4 text-sm text-center">
          {status === 'completed' ? (
            // Show match result and winner for completed matches
            <div className="space-y-2">
              {match.result && (
                <div className="text-gray-600">{match.result}</div>
              )}
              {match.winner && (
                <div className="font-semibold text-green-600">
                  Winner: {IPL_TEAMS[match.winner]?.name || match.winner}
                </div>
              )}
              {match.man_of_the_match && (
                <div className="text-blue-600">
                  Player of the Match: {match.man_of_the_match}
                </div>
              )}
              {participants.length > 0 && (
                <div 
                  className="text-blue-600 hover:text-blue-800 cursor-pointer mt-2"
                  onClick={() => router.push(`/match/${match.match_id}/participants`)}
                >
                  View {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
                </div>
              )}
            </div>
          ) : status === 'live' ? (
            // Only show participant count for live matches
            <div>
              {participants.length > 0 && (
                <div 
                  className="text-blue-600 hover:text-blue-800 cursor-pointer"
                  onClick={() => router.push(`/match/${match.match_id}/participants`)}
                >
                  {participants.length} {participants.length === 1 ? 'participant' : 'participants'} in this match
                </div>
              )}
            </div>
          ) : (
            // Show participant count and team creation for upcoming matches
            <>
              {participants.length > 0 ? (
                <div 
                  className="text-blue-600 hover:text-blue-800 cursor-pointer"
                  onClick={() => router.push(`/match/${match.match_id}/participants`)}
                >
                  {participants.length} {participants.length === 1 ? 'participant' : 'participants'} in this match
                </div>
              ) : (
                <div className="text-gray-600 italic">
                  Be the first to create a team!
                </div>
              )}

              {/* Create/Edit Team Button */}
              {showCreateTeam && (
                <div className="mt-4">
                  <Button 
                    className={`w-full ${hasTeam ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'} text-white transition-colors`}
                    onClick={() => router.push(`/create-team/${match.match_id}`)}
                  >
                    {hasTeam ? 'Edit Team' : 'Create Team'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
