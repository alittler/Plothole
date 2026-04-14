/**
 * Medieval Demographics Calculator
 * Based on "Medieval Demographics Made Easy" by S. John Ross
 * https://donjon.bin.sh/fantasy/demographics/medieval-demographics-made-easy.pdf
 */

export interface DemographicParameters {
  kingdomName: string;
  physicalAreaSqMiles: number;
  populationDensity: 'Desolate' | 'Low' | 'Settled' | 'Average' | 'High' | 'Maximum';
}

export interface DemographicResults {
  kingdomName: string;
  physicalAreaSqMiles: number;
  populationDensity: string;
  totalPopulation: number;
  townPopulation: number;
  ruralPopulation: number;
  numSettlements: number;
  numCities: number;
  numTowns: number;
  numVillages: number;
  numHamlets: number;
  numCastles: number;
  numFarms: number;
}

// Density mapping based on medieval demographics (persons per square mile)
const DENSITY_MAP: Record<DemographicParameters['populationDensity'], number> = {
  Desolate: 1,
  Low: 5,
  Settled: 10,
  Average: 20,
  High: 30,
  Maximum: 40,
};

/**
 * Calculate total population based on area and density
 */
export function calculatePopulation(areaSqMiles: number, density: DemographicParameters['populationDensity']): number {
  const personsPerSqMile = DENSITY_MAP[density];
  return Math.round(areaSqMiles * personsPerSqMile);
}

/**
 * Calculate number of settlements based on total population
 * Formula: Population / 15 (medieval average per settlement)
 */
export function calculateSettlements(totalPopulation: number): number {
  return Math.max(1, Math.round(totalPopulation / 15));
}

/**
 * Distribute settlements into cities, towns, villages, and hamlets
 * Based on medieval settlement distribution patterns
 */
export function distributeSettlements(numSettlements: number): {
  cities: number;
  towns: number;
  villages: number;
  hamlets: number;
} {
  // Cities: ~0.2% of settlements (population > 10,000)
  const cities = Math.max(0, Math.floor(numSettlements * 0.002));
  
  // Towns: ~2% of settlements (population 2,000-10,000)
  const towns = Math.max(0, Math.floor(numSettlements * 0.02));
  
  // Villages: ~15% of settlements (population 200-2,000)
  const villages = Math.max(1, Math.floor(numSettlements * 0.15));
  
  // Hamlets: remainder (population < 200)
  const hamlets = Math.max(1, numSettlements - cities - towns - villages);
  
  return { cities, towns, villages, hamlets };
}

/**
 * Calculate number of castles/strongholds
 * Formula: 1 castle per 50,000 population (or 1 per major settlement)
 */
export function calculateCastles(totalPopulation: number, numCities: number, numTowns: number): number {
  const castlesFromPopulation = Math.max(1, Math.floor(totalPopulation / 50000));
  const castlesFromMajorSettlements = numCities + Math.floor(numTowns / 2);
  return Math.max(1, Math.max(castlesFromPopulation, castlesFromMajorSettlements));
}

/**
 * Calculate number of farms
 * Formula: 1 farm per 50-100 people (use ~75 average)
 */
export function calculateFarms(ruralPopulation: number): number {
  return Math.max(1, Math.round(ruralPopulation / 75));
}

/**
 * Main demographics calculator
 */
export function calculateDemographics(params: DemographicParameters): DemographicResults {
  const totalPopulation = calculatePopulation(params.physicalAreaSqMiles, params.populationDensity);
  
  // Assume ~20% of population lives in towns/cities
  const townPopulation = Math.round(totalPopulation * 0.2);
  const ruralPopulation = totalPopulation - townPopulation;
  
  const numSettlements = calculateSettlements(townPopulation);
  const settlements = distributeSettlements(numSettlements);
  const numCastles = calculateCastles(totalPopulation, settlements.cities, settlements.towns);
  const numFarms = calculateFarms(ruralPopulation);
  
  return {
    kingdomName: params.kingdomName,
    physicalAreaSqMiles: params.physicalAreaSqMiles,
    populationDensity: params.populationDensity,
    totalPopulation,
    townPopulation,
    ruralPopulation,
    numSettlements,
    numCities: settlements.cities,
    numTowns: settlements.towns,
    numVillages: settlements.villages,
    numHamlets: settlements.hamlets,
    numCastles,
    numFarms,
  };
}
