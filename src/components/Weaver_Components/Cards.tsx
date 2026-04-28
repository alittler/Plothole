import { Character, Location, PlotPoint } from "../types";

export const CharacterCard = ({ character }: { character: Character }) => (
  <div id={`char-${character.id}`} className="p-5 border border-slate-200 rounded-xl shadow-sm bg-white hover:shadow-md transition">
    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded mb-3 inline-block">{character.role}</span>
    <h3 className="text-[15px] font-semibold text-slate-900 mb-1.5">{character.name}</h3>
    <p className="text-xs text-slate-500 italic mb-2.5 font-mono">{character.timeline}</p>
    <p className="text-[13px] text-slate-600 leading-6">{character.description}</p>
  </div>
);

export const LocationCard = ({ location }: { location: Location }) => (
  <div id={`loc-${location.id}`} className="p-5 border border-slate-200 rounded-xl shadow-sm bg-white hover:shadow-md transition">
    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-1 rounded mb-3 inline-block">Location</span>
    <h3 className="text-[15px] font-semibold text-slate-900 mb-1.5">{location.name}</h3>
    <p className="text-xs text-slate-500 italic mb-2.5 font-mono">{location.timeline}</p>
    <p className="text-[13px] text-slate-600 leading-6">{location.description}</p>
  </div>
);

export const PlotCard = ({ plot }: { plot: PlotPoint }) => (
  <div id={`plot-${plot.id}`} className="p-5 border border-slate-200 rounded-xl shadow-sm bg-white hover:shadow-md transition">
    <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 px-2 py-1 rounded mb-3 inline-block">Plot Point</span>
    <h3 className="text-[15px] font-semibold text-slate-900 mb-1.5">{plot.title}</h3>
    <p className="text-xs text-slate-500 italic mb-2.5 font-mono">{plot.timeline}</p>
    <p className="text-[13px] text-slate-600 leading-6">{plot.summary}</p>
  </div>
);
