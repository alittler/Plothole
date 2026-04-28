export type Timeline = "201X" | "1538";

export interface Character {
  id: string;
  name: string;
  timeline: Timeline;
  role: string;
  description: string;
}

export interface Location {
  id: string;
  name: string;
  timeline: Timeline;
  description: string;
}

export interface PlotPoint {
  id: string;
  title: string;
  timeline: Timeline;
  summary: string;
}
