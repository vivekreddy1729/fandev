import React, { useState } from 'react';
import { saveUserTeam } from '@/lib/userTeams';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Player } from '@/types/supabase';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { validateTeamSelection, TEAM_RULES } from '@/components/TeamRules';

interface TeamSubmitDialogProps {
  open: boolean;
  onClose: () => void;
  selectedPlayers: Player[];
  matchId: number;
}

export function TeamSubmitDialog({ open, onClose, selectedPlayers, matchId }: TeamSubmitDialogProps) {
  const { user } = useUser();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  // Validate user is signed in
  if (!user?.emailAddresses?.[0]?.emailAddress) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Authentication Required</DialogTitle>
          </DialogHeader>
          <div className="mt-4 text-red-600">
            Please sign in to save your team.
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  const userEmail = user.emailAddresses[0].emailAddress;
  // Calculate role distribution using validateTeamSelection
  const { currentCounts: roleDistribution } = validateTeamSelection(selectedPlayers);

  const roleOrder = ['batsman', 'wicket-keeper', 'all-rounder', 'bowler'] as const;
  const roleNames: Record<typeof roleOrder[number], string> = {
    'batsman': 'Batsmen',
    'wicket-keeper': 'Wicket Keeper',
    'all-rounder': 'All Rounders',
    'bowler': 'Bowlers'
  };

  // Group players by role
  const playersByRole = selectedPlayers.reduce((acc, player) => {
    if (!acc[player.role]) {
      acc[player.role] = [];
    }
    acc[player.role].push(player);
    return acc;
  }, {} as Record<string, Player[]>);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Your Team Selection</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-4">Role Distribution</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {roleOrder.map(role => (
                <div key={role} className="bg-gray-50 p-3 rounded-lg">
                  <span className="font-semibold text-gray-700">{roleNames[role]}</span>
                  <span className="float-right font-bold text-lg">
                    {roleDistribution[role] || 0}/{TEAM_RULES.roleLimits[role]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {roleOrder.map(role => (
            <div key={role} className="mb-6">
              <h3 className="font-semibold text-lg mb-2">{roleNames[role]}</h3>
              <div className="space-y-2">
                {playersByRole[role]?.map((player) => (
                  <div key={player.player_id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                    <div>
                      <span className="font-medium">{player.player_name}</span>
                      <span className="text-sm text-gray-500 ml-2">({player.team_name})</span>
                    </div>
                    <div className="text-green-600 font-medium">
                      Points: {player.points} {player.calculatedPoints && player.points && 
                        `(×${(player.calculatedPoints / player.points).toFixed(1)})`
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-6 pt-4 border-t">

            {error && (
              <div className="text-red-600 text-sm mb-4">{error}</div>
            )}
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
              onClick={async () => {
                if (!user?.emailAddresses?.[0]?.emailAddress) {
                  setError('Please sign in to save your team');
                  return;
                }

                try {
                  setSaving(true);
                  setError(undefined);
                  const result = await saveUserTeam(
                    user.emailAddresses[0].emailAddress,
                    matchId,
                    selectedPlayers
                  );
                  if (result.success) {
                    onClose();
                    router.push('/dashboard');
                  } else {
                    setError(result.error || 'Failed to save team');
                  }
                } catch (err) {
                  console.error('Error saving team:', err);
                  setError('An unexpected error occurred');
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Finalize Team'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
