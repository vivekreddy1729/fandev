'use client';

import { useEffect, useState, use } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { getMatchParticipants } from '@/lib/userTeams';
import { Player } from '@/types/supabase';
import { PlayerCard } from '@/components/PlayerCard';
import { IPL_TEAMS } from '@/lib/teams';

interface Participant {
  userEmail: string;
  players: Player[];
}

export default function MatchParticipantsPage({ params }: { params: Promise<{ matchId: string }> }) {
  const resolvedParams = use(params);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadParticipants = async () => {
      try {
        const data = await getMatchParticipants(parseInt(resolvedParams.matchId));
        setParticipants(data);
      } catch (error) {
        console.error('Error loading participants:', error);
      } finally {
        setLoading(false);
      }
    };
    loadParticipants();
  }, [resolvedParams.matchId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg text-gray-600">Loading participants...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Match Participants</h1>
        <div className="grid grid-cols-1 gap-8">
          {participants.map((participant, index) => (
            <Card key={participant.userEmail} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">
                    Participant {index + 1}
                  </h2>
                  <div className="text-sm text-gray-500">{participant.userEmail}</div>
                </div>

                {/* Team Distribution */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  {Object.entries(IPL_TEAMS).map(([teamName, team]) => {
                    const teamPlayers = participant.players.filter(p => p.team_name === teamName);
                    if (teamPlayers.length === 0) return null;

                    return (
                      <div key={teamName} className="space-y-2">
                        <div className="flex items-center gap-2 mb-3">
                          <img
                            src={team.logo}
                            alt={team.name}
                            className="w-6 h-6 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <h3 className="font-semibold text-gray-700">{team.name}</h3>
                        </div>
                        {teamPlayers.map(player => (
                          <PlayerCard
                            key={player.player_id}
                            player={player}
                            showTeam={false}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
