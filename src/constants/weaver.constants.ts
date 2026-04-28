import { Character, Location, PlotPoint } from "../types/weaver.types";

export const CHARACTERS: Character[] = [
  { id: "c1", name: "Madeleine 'Maddy' Maycott", timeline: "201X", role: "Protagonist", description: "Creative consultant for films, feels unfulfilled. Connected via soul/body to Frances." },
  { id: "c2", name: "Frances Bennett", timeline: "1538", role: "Protagonist", description: "Oblate from Epke Abbey, traveling with John Leland. Has a deep connection to history." },
  { id: "c3", name: "Rajesh", timeline: "201X", role: "Supporting", description: "Historical consultant, mysterious and well-funded. Met Maddy on the plane." },
  { id: "c4", name: "John Leland", timeline: "1538", role: "Antagonist/Supporting", description: "Royal agent working for Henry VIII surveying monasteries, suspicious of Father Iroh." },
  { id: "c5", name: "Father Iroh", timeline: "1538", role: "Mentor/Mysterious", description: "Prior of Finchale Priory, enigmatic monk with deep connections to nature/history." },
];

export const LOCATIONS: Location[] = [
  { id: "l1", name: "Airplane & Birmingham Airport", timeline: "201X", description: "The catalyst point where Maddy met Rajesh." },
  { id: "l2", name: "Tintagel Castle", timeline: "201X", description: "Rugged Cornwall coastline, site of the archaeological dig uncovering Arthurian mysteries." },
  { id: "l3", name: "Finchale Priory", timeline: "1538", description: "A sanctuary for scholars near the River Wear, protected by dense nature." },
];

export const PLOT_POINTS: PlotPoint[] = [
  { id: "p1", title: "The Turbulence", timeline: "201X", summary: "Maddy awakens during turbulence on a flight, sets the tone for a disruptive journey." },
  { id: "p2", title: "The Pentagram Discovery", timeline: "201X", summary: "At the Tintagel dig, Maddy discovers a 2D-materializing pentagram inscribed on a slate windowsill." },
  { id: "p3", title: "Awakening in Finchale", timeline: "1538", summary: "Frances Bennett awakens within the body of a traveler, realizing her consciousness is split across time." },
  { id: "p4", title: "Leland's Suspicion", timeline: "1538", summary: "John Leland challenges Father Iroh about the nature of Finchale's protective natural borders." },
];

export const EXTRACTION_PROMPT = `Please process the provided manuscript sample and extract the following:
1. Characters (Name, Timeline, Role, Description)
2. Locations (Name, Timeline, Description)
3. Plot Points (Title, Timeline, Summary)

Format the output as a clean, structured JSON file that can be used to populate card components.`;
