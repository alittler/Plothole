import React, { useState, useMemo } from 'react';
import { CharacterProfile } from '../types';
import { Search, Filter, ShieldAlert, Heart, HelpCircle, AlertCircle, Sparkles, UserMinus, User, Globe } from 'lucide-react';

interface CharacterListProps {
  characters: CharacterProfile[];
  selectedCharacter: CharacterProfile | null;
  onSelectCharacter: (character: CharacterProfile) => void;
  images?: Record<string, string>;
  onUpdateCharacter?: (updatedChar: CharacterProfile, changeDetails: string) => void;
}

export default function CharacterList({
  characters,
  selectedCharacter,
  onSelectCharacter,
  images = {},
  onUpdateCharacter,
}: CharacterListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [speciesFilter, setSpeciesFilter] = useState<string>('ALL');

  // Dynamically extract all unique species represented in the current character list
  const allSpecies = useMemo(() => {
    const speciesSet = new Set<string>();
    characters.forEach((char) => {
      if (char.core.species) {
        speciesSet.add(char.core.species);
      }
    });
    return Array.from(speciesSet);
  }, [characters]);

  // Filter character profiles based on search query, living status, and species
  const filteredCharacters = useMemo(() => {
    return characters.filter((char) => {
      const matchesSearch =
        char.core.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (char.core.nickname && char.core.nickname.toLowerCase().includes(searchQuery.toLowerCase())) ||
        char.core.role.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        char.core.living_status.toUpperCase() === statusFilter.toUpperCase();

      const matchesSpecies =
        speciesFilter === 'ALL' ||
        char.core.species.toLowerCase() === speciesFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesSpecies;
    });
  }, [characters, searchQuery, statusFilter, speciesFilter]);

  // Helper to render beautiful living status indicator dots/icons
  const renderStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    let bg = 'bg-slate-100 text-slate-700';
    let dotColor = 'bg-slate-400';

    if (s === 'alive') {
      bg = 'bg-emerald-50 text-emerald-800 border-emerald-100';
      dotColor = 'bg-emerald-500';
    } else if (s === 'dead') {
      bg = 'bg-rose-50 text-rose-800 border-rose-100';
      dotColor = 'bg-rose-500';
    } else if (s === 'missing') {
      bg = 'bg-amber-50 text-amber-800 border-amber-100';
      dotColor = 'bg-amber-500';
    } else if (s === 'non-biological') {
      bg = 'bg-blue-50 text-blue-800 border-blue-100';
      dotColor = 'bg-blue-500';
    } else if (s === 'undead') {
      bg = 'bg-purple-50 text-purple-800 border-purple-100';
      dotColor = 'bg-purple-500';
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-4" id="character-list-component">
      {/* Search & Dynamic Filters Container */}
      <div className="space-y-3 bg-slate-50/50 p-3 rounded-lg border border-slate-200/80">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search characters by name, role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">All Statuses</option>
              <option value="ALIVE">Alive</option>
              <option value="DEAD">Dead</option>
              <option value="MISSING">Missing</option>
              <option value="NON-BIOLOGICAL">Non-biological</option>
              <option value="UNDEAD">Undead</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </div>

          {/* Species Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Species/Origin</label>
            <select
              value={speciesFilter}
              onChange={(e) => setSpeciesFilter(e.target.value)}
              className="w-full p-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">All Species</option>
              {allSpecies.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Characters List Scroll Area */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 select-scrollbar">
        {filteredCharacters.length === 0 ? (
          <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-lg bg-white">
            <UserMinus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">No characters match your criteria</p>
          </div>
        ) : (
          filteredCharacters.map((char, index) => {
            const isSelected = selectedCharacter?.core.name === char.core.name;
            const initials = char.core.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';

            return (
              <button
                key={char.core.name + index}
                id={`char-list-item-${char.core.name.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => onSelectCharacter(char)}
                className={`w-full text-left p-3.5 rounded-lg border transition-all duration-200 focus:outline-none flex items-center gap-3.5 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40 shadow-sm ring-1 ring-blue-600/10'
                    : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/55 bg-white'
                }`}
              >
                {/* Character Avatar Badge */}
                <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-semibold text-xs border shrink-0 ${
                  isSelected
                    ? 'bg-blue-100 text-blue-900 border-blue-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  {char.gallery && char.gallery.length > 0 && images[char.gallery[0]] ? (
                    <img
                      src={images[char.gallery[0]]}
                      alt={char.core.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    initials
                  )}
                </div>

                {/* Character Core Brief */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1">
                    <h4 className="font-semibold text-slate-950 text-sm truncate">
                      {char.core.name}
                    </h4>
                    {char.core.nickname && (
                      <span className="text-[11px] font-normal italic text-slate-500 truncate shrink-0 max-w-[80px]">
                        "{char.core.nickname}"
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 font-medium truncate mb-1">
                    {char.core.role}
                  </p>
                  <div className="flex items-center justify-between gap-1.5 flex-wrap mt-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-block text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                        {char.core.species}
                      </span>
                      {renderStatusBadge(char.core.living_status)}
                    </div>

                    {onUpdateCharacter && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            const isReal = !char.metadata.is_real_person;
                            const updated: CharacterProfile = {
                              ...char,
                              metadata: {
                                ...char.metadata,
                                is_real_person: isReal,
                              },
                            };
                            onUpdateCharacter(
                              updated,
                              `Marked ${char.core.name} as ${isReal ? 'Real-life Person' : 'Fictional Character'}`
                            );
                          }}
                          className={`px-1.5 py-0.5 rounded text-[9px] flex items-center gap-0.5 font-sans border transition-all cursor-pointer ${
                            char.metadata.is_real_person
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80 font-semibold'
                              : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-100'
                          }`}
                          title={char.metadata.is_real_person ? 'Click to mark as Fictional' : 'Click to note as Real Life Person'}
                        >
                          <User className="w-2.5 h-2.5" />
                          <span>{char.metadata.is_real_person ? 'Real Person' : 'Real?'}</span>
                        </button>
                        {char.metadata.is_real_person && char.metadata.wikipedia_url && (
                          <a
                            href={char.metadata.wikipedia_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-0.5 text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-all"
                            title={`Wikipedia: ${char.metadata.wikipedia_title || char.core.name}`}
                          >
                            <Globe className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
