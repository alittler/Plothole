import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ViewType, ProjectData, ProjectMetadata, User } from '../../types';
import { Search, Grid3x3, List, Filter, Plus, Edit2, Trash2, ChevronRight, Users, MapPin, Wand2, Book, Clock, Archive } from 'lucide-react';

interface CardCatalogueViewProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  data: ProjectData;
  onLinkClick: (type: string, id: string) => void;
  onUpdateProject: (updates: Partial<ProjectData>) => void;
  projectsMetadata?: ProjectMetadata[];
  currentUser?: User;
}

enum CardType {
  CHARACTER = 'Characters',
  LOCATION = 'Locations',
  ARTIFACT = 'Items & Artifacts',
  LORE = 'Lore & Worldbuilding',
  TIMELINE = 'Timeline Events',
  ENTITY = 'Entities'
}

type DisplayMode = 'grid' | 'list';

export const CardCatalogueView: React.FC<CardCatalogueViewProps> = ({
  data,
  onLinkClick,
  onUpdateProject
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedType = (searchParams.get('type') as CardType) || CardType.CHARACTER;
  const setSelectedType = (type: CardType) => setSearchParams({ type });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grid');
  const [filterProject, setFilterProject] = useState(true);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const cardTypes = Object.values(CardType);

  const getCards = () => {
    let cards: any[] = [];
    
    switch (selectedType) {
      case CardType.CHARACTER:
        cards = (data.characters || []).map(c => ({
          id: c.id,
          title: c.name,
          type: 'Character',
          role: c.role,
          description: c.description,
          preview: `${c.name} • ${c.role}`
        }));
        break;
      case CardType.LOCATION:
        cards = (data.locations || []).map(l => ({
          id: l.id,
          title: l.name,
          type: 'Location',
          locationType: l.type,
          description: l.description,
          preview: `${l.name} • ${l.type || 'Location'}`
        }));
        break;
      case CardType.ARTIFACT:
        cards = (data.artifacts || []).map(a => ({
          id: a.id,
          title: a.name,
          type: 'Artifact',
          artifactType: a.type,
          description: a.description,
          preview: `${a.name}${a.type ? ' • ' + a.type : ''}`
        }));
        break;
      case CardType.LORE:
        cards = (data.lore || []).map(l => ({
          id: l.id,
          title: l.term || l.name || 'Untitled',
          type: 'Lore',
          category: l.category,
          description: l.definition || l.description,
          preview: `${l.term || l.name || 'Untitled'}${l.category ? ' • ' + l.category : ''}`
        }));
        break;
      case CardType.TIMELINE:
        cards = (data.timeline || []).map(t => ({
          id: t.id,
          title: t.title || t.event,
          type: 'Timeline',
          date: t.date,
          description: t.description,
          preview: `${t.title || t.event}${t.date ? ' • ' + t.date : ''}`
        }));
        break;
      case CardType.ENTITY:
        cards = (data.entities || []).map(e => ({
          id: e.id,
          title: e.name,
          type: 'Entity',
          entityType: e.type,
          tier: e.tier,
          description: e.description,
          preview: `${e.name} • ${e.type}${e.tier ? ' (Tier ' + e.tier + ')' : ''}`
        }));
        break;
    }

    return cards.filter(card => {
      const searchLower = searchTerm.toLowerCase();
      return card.title.toLowerCase().includes(searchLower) ||
             card.description?.toLowerCase().includes(searchLower) ||
             card.preview?.toLowerCase().includes(searchLower);
    });
  };

  const filteredCards = useMemo(() => getCards(), [selectedType, searchTerm, data]);

  const getCardIcon = (type: CardType) => {
    switch (type) {
      case CardType.CHARACTER:
        return <Users size={16} />;
      case CardType.LOCATION:
        return <MapPin size={16} />;
      case CardType.ARTIFACT:
        return <Archive size={16} />;
      case CardType.LORE:
        return <Book size={16} />;
      case CardType.TIMELINE:
        return <Clock size={16} />;
      case CardType.ENTITY:
        return <Wand2 size={16} />;
    }
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 md:p-6 shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white hidden sm:block">Card Catalogue</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDisplayMode(displayMode === 'grid' ? 'list' : 'grid')}
                className={`p-2 rounded-lg transition-colors ${
                  displayMode === 'grid'
                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title="Grid view"
              >
                <Grid3x3 size={18} />
              </button>
              <button
                onClick={() => setDisplayMode(displayMode === 'list' ? 'grid' : 'list')}
                className={`p-2 rounded-lg transition-colors ${
                  displayMode === 'list'
                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title="List view"
              >
                <List size={18} />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search cards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900"
            />
          </div>

          {/* Card Type Tabs */}
          <div className="flex flex-wrap gap-2">
            {cardTypes.map((type) => {
              const count = (() => {
                switch (type) {
                  case CardType.CHARACTER: return (data.characters || []).length;
                  case CardType.LOCATION: return (data.locations || []).length;
                  case CardType.ARTIFACT: return (data.artifacts || []).length;
                  case CardType.LORE: return (data.lore || []).length;
                  case CardType.TIMELINE: return (data.timeline || []).length;
                  case CardType.ENTITY: return (data.entities || []).length;
                }
              })();

              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${
                    selectedType === type
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {getCardIcon(type)}
                  {type}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    selectedType === type
                      ? 'bg-white/20'
                      : 'bg-slate-300 dark:bg-slate-700'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          {filteredCards.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700">
                {getCardIcon(selectedType)}
              </div>
              <p className="text-slate-400 font-serif italic">
                {searchTerm ? 'No cards match your search' : `No ${selectedType.toLowerCase()} yet`}
              </p>
            </div>
          ) : displayMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCards.map((card) => (
                <div
                  key={card.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-200 dark:border-slate-700 flex flex-col group"
                >
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-bold text-slate-900 dark:text-white line-clamp-2 text-sm mb-2">
                      {card.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 flex-1 mb-4">
                      {card.preview}
                    </p>
                    {card.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-500 line-clamp-2 mb-4">
                        {card.description}
                      </p>
                    )}
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onLinkClick(card.type, card.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="space-y-2">
              {filteredCards.map((card) => (
                <div
                  key={card.id}
                  className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all group flex items-center justify-between cursor-pointer"
                  onClick={() => onLinkClick(card.type, card.id)}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      {card.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">
                      {card.preview}
                    </p>
                  </div>
                  <ChevronRight className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ml-4 shrink-0" size={18} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
