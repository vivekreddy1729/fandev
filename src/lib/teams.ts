export type TeamInfo = {
  name: string;
  shortName: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
};

// Helper function to normalize team names for comparison
function normalizeTeamName(name: string): string {
  return name.toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Base team data
const teamsData: { [key: string]: TeamInfo } = {
  'Chennai Super Kings': {
    name: 'Chennai Super Kings',
    shortName: 'CSK',
    logo: '/images/csk.png',
    primaryColor: '#FFFF3C',
    secondaryColor: '#0081E9'
  },
  'Delhi Capitals': {
    name: 'Delhi Capitals',
    shortName: 'DC',
    logo: '/images/dc.png',
    primaryColor: '#0078BC',
    secondaryColor: '#EF1B23'
  },
  'Gujarat Titans': {
    name: 'Gujarat Titans',
    shortName: 'GT',
    logo: '/images/gt.png',
    primaryColor: '#1B2133',
    secondaryColor: '#B6862C'
  },
  'Kolkata Knight Riders': {
    name: 'Kolkata Knight Riders',
    shortName: 'KKR',
    logo: '/images/kkr.png',
    primaryColor: '#3A225D',
    secondaryColor: '#B3A123'
  },
  'Lucknow Super Giants': {
    name: 'Lucknow Super Giants',
    shortName: 'LSG',
    logo: '/images/lsg.png',
    primaryColor: '#A72056',
    secondaryColor: '#FFCC00'
  },
  'Mumbai Indians': {
    name: 'Mumbai Indians',
    shortName: 'MI',
    logo: '/images/mi.png',
    primaryColor: '#004BA0',
    secondaryColor: '#D1AB3E'
  },
  'Punjab Kings': {
    name: 'Punjab Kings',
    shortName: 'PBKS',
    logo: '/images/pbks.png',
    primaryColor: '#D11D1B',
    secondaryColor: '#FDB913'
  },
  'Rajasthan Royals': {
    name: 'Rajasthan Royals',
    shortName: 'RR',
    logo: '/images/rr.png',
    primaryColor: '#EA1A85',
    secondaryColor: '#254AA5'
  },
  'Royal Challengers Bengaluru': {
    name: 'Royal Challengers Bengaluru',
    shortName: 'RCB',
    logo: '/images/rcb.png',
    primaryColor: '#EC1C24',
    secondaryColor: '#000000'
  },
  'Sunrisers Hyderabad': {
    name: 'Sunrisers Hyderabad',
    shortName: 'SRH',
    logo: '/images/srh.png',
    primaryColor: '#F7A721',
    secondaryColor: '#E91C23'
  }
};

// Create the final map with normalized team names
export const IPL_TEAMS: { [key: string]: TeamInfo } = {
  ...teamsData,
  // Add normalized versions of team names as aliases
  ...Object.entries(teamsData).reduce((acc, [key, value]) => {
    acc[normalizeTeamName(key)] = value;
    return acc;
  }, {} as { [key: string]: TeamInfo })
};
