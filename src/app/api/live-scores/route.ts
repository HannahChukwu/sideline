import { NextResponse } from "next/server";

export interface LiveGame {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  period: string;
  clock: string;
  status: "live" | "final" | "upcoming";
  startTime?: string; // for upcoming games
}

/**
 * Simulates live score progression using the current minute of the day.
 * Scores advance naturally so each poll returns slightly different values,
 * creating the feel of a live scoreboard.
 */
function buildGames(): LiveGame[] {
  const now = new Date();
  const m = now.getMinutes();   // 0-59
  const s = now.getSeconds();   // 0-59

  // Basketball — in Q3 / Q4 depending on minute
  const bballQ = m < 15 ? "Q1" : m < 30 ? "Q2" : m < 45 ? "Q3" : "Q4";
  const bballClock = `${7 - (m % 8)}:${String(59 - (s % 60)).padStart(2, "0")}`;

  // Soccer — progressing through 2nd half
  const soccerMin = 45 + Math.floor(m * 0.75);
  const soccerScore2 = soccerMin > 62 ? 2 : 1;

  // Track — already finished
  // Volleyball — upcoming tonight

  return [
    {
      id: "bball-live",
      sport: "Basketball",
      homeTeam: "Falcons",
      awayTeam: "Eagles",
      homeScore: 48 + Math.floor(m / 3),
      awayScore: 42 + Math.floor(m / 4),
      period: bballQ,
      clock: bballClock,
      status: "live",
    },
    {
      id: "soccer-live",
      sport: "Soccer",
      homeTeam: "Falcons",
      awayTeam: "Tigers",
      homeScore: 1 + (soccerMin > 55 ? 1 : 0),
      awayScore: soccerScore2,
      period: `${soccerMin}'`,
      clock: "",
      status: "live",
    },
    {
      id: "track-final",
      sport: "Track & Field",
      homeTeam: "Falcons",
      awayTeam: "Wolverines",
      homeScore: 87,
      awayScore: 71,
      period: "Final",
      clock: "",
      status: "final",
    },
    {
      id: "swim-final",
      sport: "Swimming",
      homeTeam: "Falcons",
      awayTeam: "Stingrays",
      homeScore: 212,
      awayScore: 178,
      period: "Final",
      clock: "",
      status: "final",
    },
    {
      id: "volleyball-upcoming",
      sport: "Volleyball",
      homeTeam: "Falcons",
      awayTeam: "Bears",
      homeScore: 0,
      awayScore: 0,
      period: "Upcoming",
      clock: "",
      status: "upcoming",
      startTime: "7:00 PM",
    },
    {
      id: "baseball-upcoming",
      sport: "Baseball",
      homeTeam: "Falcons",
      awayTeam: "Hawks",
      homeScore: 0,
      awayScore: 0,
      period: "Upcoming",
      clock: "",
      status: "upcoming",
      startTime: "3:30 PM",
    },
  ];
}

export async function GET() {
  return NextResponse.json(
    { games: buildGames(), updatedAt: new Date().toISOString() },
    {
      headers: {
        // Allow client to cache for 30 s, then revalidate
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30",
      },
    }
  );
}
