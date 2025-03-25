'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { getTeamPlayers } from '@/lib/players';
import { getMatches } from '@/lib/matches';
import { IPL_TEAMS } from '@/lib/teams';
import { Player, IPLSchedule } from '@/types/supabase';
import { PlayerCard } from '@/components/PlayerCard';
import { TeamSubmitDialog } from '@/components/TeamSubmitDialog';
import { Button } from '@/components/ui/button';
import { validateTeamSelection, calculatePlayerPoints, TEAM_RULES } from '@/components/TeamRules';
import { getUserTeam, saveUserTeam } from '@/lib/userTeams';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function CreateTeamPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { user } = useUser();
  const router = useRouter();
  const [hasExistingTeam, setHasExistingTeam] = useState(false);
  const resolvedParams = use(params);
  const matchId = resolvedParams.matchId;

  const [match, setMatch] = useState<IPLSchedule | null>(null);
  const [team1Players, setTeam1Players] = useState<Player[]>([]);
  const [team2Players, setTeam2Players] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [currentCounts, setCurrentCounts] = useState<{ [key: string]: number }>({});
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllData() {
      try {
        setLoading(true);
        // Fetch match details
        const matchData = await getMatches();
        const currentMatch = [...matchData.futureMatches, ...matchData.pastMatches]
          .find(m => m.match_id === parseInt(matchId));
        
        if (!currentMatch) {
          console.error('Match not found');
          return;
        }
        
        setMatch(currentMatch);

        // Fetch players for both teams
        const [team1Data, team2Data] = await Promise.all([
          getTeamPlayers(currentMatch.team1),
          getTeamPlayers(currentMatch.team2)
        ]);

        setTeam1Players(team1Data);
        setTeam2Players(team2Data);

        // Only fetch existing team if user is logged in
        if (user?.emailAddresses?.[0]?.emailAddress) {
          console.log('Fetching team for user:', user.emailAddresses[0].emailAddress);
          const existingTeam = await getUserTeam(
            user.emailAddresses[0].emailAddress,
            parseInt(matchId)
          );
          if (existingTeam) {
            console.log('Found existing team:', existingTeam);
            // Points are already calculated in getUserTeam
            setSelectedPlayers(existingTeam);
            setHasExistingTeam(true);
            
            // Update role counts for existing team
            const validation = validateTeamSelection(existingTeam);
            setCurrentCounts(validation.currentCounts);
            if (!validation.isValid) {
              setValidationErrors(validation.errors);
            }
          } else {
            // Reset selected players if no existing team
            setSelectedPlayers([]);
            setHasExistingTeam(false);
            setCurrentCounts({
              'batsman': 0,
              'bowler': 0,
              'all-rounder': 0,
              'wicket-keeper': 0
            });
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setValidationErrors(['Error loading data. Please try again.']);
      } finally {
        setLoading(false);
      }
    }

    fetchAllData();
  }, [matchId, user]);

  const onDragEnd = (result: any) => {
    const { source, destination } = result;

    // Dropped outside a droppable area
    if (!destination) return;

    const sourceList = source.droppableId === 'team1' ? team1Players :
                      source.droppableId === 'team2' ? team2Players :
                      selectedPlayers;

    const destList = destination.droppableId === 'selected' ? selectedPlayers :
                    destination.droppableId === 'team1' ? team1Players :
                    team2Players;

    // Moving to selected team - validate first
    if (destination.droppableId === 'selected' && source.droppableId !== 'selected') {
      const playerToAdd = sourceList[source.index];
      const newSelectedPlayers = [...selectedPlayers, playerToAdd];
      const validation = validateTeamSelection(newSelectedPlayers);

      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        return;
      }

      setCurrentCounts(validation.currentCounts);
      setValidationErrors([]);
    } else if (destination.droppableId !== 'selected' && source.droppableId === 'selected') {
      // Removing from selected team - update counts
      const remainingPlayers = selectedPlayers.filter((_, index) => index !== source.index);
      const validation = validateTeamSelection(remainingPlayers);
      setCurrentCounts(validation.currentCounts);
      setValidationErrors([]);
    }

    // Move within the same list
    if (source.droppableId === destination.droppableId) {
      const items = Array.from(sourceList);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);

      if (source.droppableId === 'selected') {
        setSelectedPlayers(calculatePlayerPoints(items));
      } else if (source.droppableId === 'team1') {
        setTeam1Players(items);
      } else {
        setTeam2Players(items);
      }
      return;
    }

    // Move between different lists
    const sourceItems = Array.from(sourceList);
    const [movedItem] = sourceItems.splice(source.index, 1);

    // When moving back to team lists, ensure player goes back to original team
    if (destination.droppableId !== 'selected') {
      const originalTeam = movedItem.team_name === match?.team1 ? 'team1' : 'team2';
      if (destination.droppableId !== originalTeam) {
        setValidationErrors([`Players must be returned to their original team (${movedItem.team_name})`]);
        return;
      }
      // Remove calculated points when returning to team
      delete movedItem.calculatedPoints;
      
      // Don't add the player back if they already exist in the destination team
      const destItems = Array.from(destList);
      const playerExists = destItems.some(p => p.player_id === movedItem.player_id);
      if (!playerExists) {
        destItems.splice(destination.index, 0, movedItem);
      }

      if (source.droppableId === 'selected') {
        setSelectedPlayers(sourceItems);
        if (destination.droppableId === 'team1') {
          setTeam1Players(destItems);
        } else {
          setTeam2Players(destItems);
        }
      }
    } else {
      // Moving to selected list
      const destItems = Array.from(destList);
      destItems.splice(destination.index, 0, movedItem);

      if (source.droppableId === 'team1') {
        setTeam1Players(sourceItems);
      } else if (source.droppableId === 'team2') {
        setTeam2Players(sourceItems);
      }
      setSelectedPlayers(calculatePlayerPoints(destItems));
    }

    // Update validation state for the final state
    let finalSelectedPlayers = selectedPlayers;
    if (destination.droppableId === 'selected') {
      finalSelectedPlayers = Array.from(destList);
      finalSelectedPlayers.splice(destination.index, 0, movedItem);
    } else if (source.droppableId === 'selected') {
      finalSelectedPlayers = sourceItems;
    }
    
    const validation = validateTeamSelection(finalSelectedPlayers);
    setCurrentCounts(validation.currentCounts);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
    } else {
      setValidationErrors([]);
    }
  };

  if (loading || !match) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  // Debug logging
  console.log('Match teams:', {
    team1Name: match.team1,
    team2Name: match.team2,
    availableTeams: Object.keys(IPL_TEAMS)
  });

  // Debug logging
  console.log('Team info:', {
    team1Name: match.team1,
    team2Name: match.team2,
    team1Info: IPL_TEAMS[match.team1],
    team2Info: IPL_TEAMS[match.team2],
    allTeams: Object.keys(IPL_TEAMS)
  });

  const team1 = IPL_TEAMS[match.team1];
  const team2 = IPL_TEAMS[match.team2];

  if (!team1 || !team2) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-2">Error loading teams</div>
          <div className="text-sm text-gray-600">
            Team 1: {match.team1} {team1 ? '✓' : '✗'}<br />
            Team 2: {match.team2} {team2 ? '✓' : '✗'}
          </div>
        </div>
      </div>
    );
  }

  const handleSubmitTeam = async () => {
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      setValidationErrors(['Please sign in to save your team']);
      return;
    }

    const userEmail = user.emailAddresses[0].emailAddress;
    console.log('Submitting team for user:', userEmail);

    try {
      // Validate team selection
      const validation = validateTeamSelection(selectedPlayers);
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        return;
      }

      const result = await saveUserTeam(
        userEmail,
        parseInt(matchId),
        selectedPlayers
      );

      if (result.success) {
        setShowSubmitDialog(false);
        setHasExistingTeam(true); // Update state to reflect team exists
        // Redirect to dashboard
        router.replace('/dashboard');
      } else {
        setValidationErrors([result.error || 'Failed to save team']);
      }
    } catch (error) {
      console.error('Error submitting team:', error);
      setValidationErrors(['An unexpected error occurred']);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirm Your Team</DialogTitle>
            <DialogDescription>
              Review your team selection and points multipliers before submitting.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {match && (
                <>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700">{match ? IPL_TEAMS[match.team1].name : ''}</h3>
                    {match && selectedPlayers
                      .filter(p => p.team_name === match.team1)
                      .map(player => (
                        <div key={player.player_id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                          <span>{player.player_name}</span>
                          <span className="text-green-600 font-medium">
                            {player.calculatedPoints && player.points && 
                              `×${(player.calculatedPoints / player.points).toFixed(1)}`
                            }
                          </span>
                        </div>
                      ))
                    }
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700">{match ? IPL_TEAMS[match.team2].name : ''}</h3>
                    {match && selectedPlayers
                      .filter(p => p.team_name === match.team2)
                      .map(player => (
                        <div key={player.player_id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                          <span>{player.player_name}</span>
                          <span className="text-green-600 font-medium">
                            {player.calculatedPoints && player.points && 
                              `×${(player.calculatedPoints / player.points).toFixed(1)}`
                            }
                          </span>
                        </div>
                      ))
                    }
                  </div>
                </>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>Cancel</Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white" 
              onClick={handleSubmitTeam}
            >
              {hasExistingTeam ? 'Update Team' : 'Submit Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">Create Your Fantasy Team</h1>
        
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-3 gap-6">
            {/* Team 1 Players */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src={team1.logo} 
                  alt={team1.name} 
                  className="w-8 h-8 object-contain" 
                  onError={(e) => {
                    console.error('Error loading team1 logo:', team1.logo);
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <h2 className="font-semibold">{team1.name}</h2>
              </div>
              <Droppable droppableId="team1">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {team1Players
                      .filter(player => !selectedPlayers.some(p => p.player_id === player.player_id))
                      .map((player, index) => (
                        <Draggable
                          key={`team1-${player.player_id}`}
                          draggableId={player.player_id.toString()}
                          index={index}
                        >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <PlayerCard 
                              player={player}
                              isDragging={snapshot.isDragging}
                              showTeam={true}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* Selected Players */}
            <div className="bg-white rounded-lg shadow-sm p-4 flex flex-col h-full">
              <div>
                <h2 className="text-xl font-bold mb-6">{hasExistingTeam ? 'Your Existing Team' : 'Create Your Team'} ({selectedPlayers.length}/11)</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold mb-3">Team Distribution</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {match && (
                        <>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <span className="font-semibold text-gray-700">{IPL_TEAMS[match.team1].shortName}</span>
                            <span className="float-right font-bold text-lg">{selectedPlayers.filter(p => p.team_name === match.team1).length}/6</span>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <span className="font-semibold text-gray-700">{IPL_TEAMS[match.team2].shortName}</span>
                            <span className="float-right font-bold text-lg">{selectedPlayers.filter(p => p.team_name === match.team2).length}/6</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-base font-semibold mb-3">Role Distribution</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="font-semibold text-gray-700">Batsmen</span>
                        <span className="float-right font-bold text-lg">{currentCounts['batsman'] || 0}/4</span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="font-semibold text-gray-700">Bowlers</span>
                        <span className="float-right font-bold text-lg">{currentCounts['bowler'] || 0}/4</span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="font-semibold text-gray-700">All-rounders</span>
                        <span className="float-right font-bold text-lg">{currentCounts['all-rounder'] || 0}/2</span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="font-semibold text-gray-700">Wicket-keeper</span>
                        <span className="float-right font-bold text-lg">{currentCounts['wicket-keeper'] || 0}/1</span>
                      </div>
                    </div>
                  </div>

                  {validationErrors.length > 0 && (
                    <div className="text-sm text-red-600">
                      {validationErrors.map((error, index) => (
                        <div key={index}>{error}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                <Droppable droppableId="selected">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="flex-1 mt-6 space-y-2 min-h-[400px] border-2 border-dashed border-gray-200 rounded-lg p-4"
                    >
                      {selectedPlayers.map((player, index) => (
                        <Draggable
                          key={`selected-${player.player_id}`}
                          draggableId={player.player_id.toString()}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <PlayerCard 
                                player={player}
                                isDragging={snapshot.isDragging}
                                showTeam={false}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                <div className="mt-6">
                  {selectedPlayers.length === TEAM_RULES.maxPlayers && !validationErrors.length ? (
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg text-lg shadow-sm transition-colors" 
                      onClick={() => setShowSubmitDialog(true)}
                    >
                      {hasExistingTeam ? 'Update Team' : 'Submit Team'}
                    </Button>
                  ) : (
                    <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                      <span className="text-lg font-semibold text-gray-500">
                        {11 - selectedPlayers.length} more player{11 - selectedPlayers.length !== 1 ? 's' : ''} needed
                      </span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Team 2 Players */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src={team2.logo} 
                  alt={team2.name} 
                  className="w-8 h-8 object-contain" 
                  onError={(e) => {
                    console.error('Error loading team2 logo:', team2.logo);
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <h2 className="font-semibold">{team2.name}</h2>
              </div>
              <Droppable droppableId="team2">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {team2Players
                      .filter(player => !selectedPlayers.some(p => p.player_id === player.player_id))
                      .map((player, index) => (
                        <Draggable
                          key={`team2-${player.player_id}`}
                          draggableId={player.player_id.toString()}
                          index={index}
                        >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <PlayerCard 
                              player={player}
                              isDragging={snapshot.isDragging}
                              showTeam={true}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

            </div>
          </div>
        </DragDropContext>
        <TeamSubmitDialog
          open={showSubmitDialog}
          onClose={() => setShowSubmitDialog(false)}
          selectedPlayers={selectedPlayers}
          matchId={parseInt(resolvedParams.matchId)}
        />
      </div>
    </div>
  );
}
