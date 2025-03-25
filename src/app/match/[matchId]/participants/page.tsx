import { getMatchParticipants } from '@/lib/userTeams';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Player } from '@/types/types';

interface PageProps {
  params: {
    matchId: string;
  };
}

export default async function MatchParticipantsPage({ params }: PageProps) {
  const participants = await getMatchParticipants(parseInt(params.matchId));

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Match Participants</h1>
      
      {participants.length === 0 ? (
        <div className="text-center text-gray-600">
          No participants yet. Be the first to create a team!
        </div>
      ) : (
        <div className="space-y-8">
          {participants.map((participant) => (
            <details key={participant.userEmail} className="group">
              <summary className="list-none cursor-pointer">
                <Card className="group-open:ring-2 ring-primary transition-all">
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{participant.userEmail}</CardTitle>
                      <Badge variant="outline">{participant.players.length} players</Badge>
                    </div>
                  </CardHeader>
                </Card>
              </summary>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-4">
                {participant.players.map((player: Player, index) => (
                  <Card key={player.player_id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{player.player_name}</h3>
                            <p className="text-sm text-muted-foreground">{player.speciality}</p>
                          </div>
                          <Badge>{player.role}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Team</span>
                          <span className="font-medium">{player.team_name}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Nationality</span>
                          <span className="font-medium">{player.nationality}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Batting Style</span>
                          <span className="font-medium">{player.handedness}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
