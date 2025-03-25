'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-gray-900 text-white">
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-orange-400">
            IPL Fantasy League 2025
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-gray-300">
            Create your dream team and compete with cricket fans worldwide
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="p-6 bg-gray-800/50 rounded-lg shadow-xl hover:transform hover:scale-105 transition-transform duration-300 border border-blue-500/20">
              <h3 className="text-xl font-semibold mb-4 text-blue-400">Build Your Team</h3>
              <p className="text-gray-400">Select players from all IPL teams and create your perfect XI within the budget</p>
            </div>
            
            <div className="p-6 bg-gray-800/50 rounded-lg shadow-xl hover:transform hover:scale-105 transition-transform duration-300 border border-orange-500/20">
              <h3 className="text-xl font-semibold mb-4 text-orange-400">Score Points</h3>
              <p className="text-gray-400">Earn points based on your players&apos; real-life performances in IPL matches</p>
            </div>
            
            <div className="p-6 bg-gray-800/50 rounded-lg shadow-xl hover:transform hover:scale-105 transition-transform duration-300 border border-green-500/20">
              <h3 className="text-xl font-semibold mb-4 text-green-400">Win Prizes</h3>
              <p className="text-gray-400">Compete in daily matches and tournaments to win exciting prizes</p>
            </div>
          </div>
          
          <div className="mt-16">
            <h2 className="text-3xl font-bold mb-8 text-gray-200">Get Ready for IPL 2025</h2>
            <p className="text-lg text-gray-400 mb-8">
              Join millions of cricket fans and prove your team selection skills
            </p>
            <div className="bg-gradient-to-r from-blue-500/10 to-orange-500/10 p-6 rounded-lg border border-blue-500/20">
              <h3 className="text-xl font-semibold mb-4 text-blue-300">Upcoming: Season Start</h3>
              <p className="text-gray-400">
                The IPL 2025 season is about to begin! Create your account now and start building your winning team.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
