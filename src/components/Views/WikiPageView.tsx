import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { BookOpen, User, Map, Clock, Users, Loader2, AlertCircle } from 'lucide-react';

interface WikiData {
  title: string;
  author: string;
  synopsis: string;
  characters: any[];
  worldBuilding: any[];
  timeline: any[];
}

export const WikiPageView: React.FC = () => {
  const location = useLocation();
  const [wikiData, setWikiData] = useState<WikiData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Extract username and bookName from route: /username/bookname
    const path = location.pathname;
    const parts = path.split('/').filter(Boolean);
    
    if (parts.length < 2) return;
    
    const username = parts[0];
    const bookName = parts.slice(1).join('/'); // Rejoin in case book name has slashes

    const fetchWiki = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const resp = await fetch(`/api/wiki/${username}/${encodeURIComponent(bookName)}`);
        if (!resp.ok) {
          throw new Error('Wiki page not found');
        }
        const data = await resp.json();
        setWikiData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load wiki page');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWiki();
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-indigo-600" />
          <p className="text-slate-600 dark:text-slate-400">Loading wiki...</p>
        </div>
      </div>
    );
  }

  if (error || !wikiData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-lg border border-slate-200 dark:border-slate-800 text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500" />
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Wiki Not Found</h2>
          <p className="text-slate-600 dark:text-slate-400">{error || 'This wiki page does not exist or is not public.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 md:py-6 md:px-8">
          <div className="flex items-center gap-3 mb-4 hidden sm:flex">
            <BookOpen className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">{wikiData.title}</h1>
          </div>
          <div className="sm:hidden mb-4">
            <BookOpen className="w-6 h-6 text-indigo-600" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2 hidden sm:flex">
            <User className="w-4 h-4" />
            By {wikiData.author}
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-12 md:px-8 space-y-12">
        {/* Synopsis */}
        {wikiData.synopsis && (
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-600" />
              Synopsis
            </h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {wikiData.synopsis}
            </p>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Characters */}
          {wikiData.characters && wikiData.characters.length > 0 && (
            <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Users className="w-6 h-6 text-purple-600" />
                Characters ({wikiData.characters.length})
              </h2>
              <div className="space-y-4">
                {wikiData.characters.map((char: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                    <h3 className="font-bold text-slate-900 dark:text-white">{char.name || `Character ${idx + 1}`}</h3>
                    {char.role && <p className="text-sm text-slate-600 dark:text-slate-400">{char.role}</p>}
                    {char.description && <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">{char.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* World Building */}
          {wikiData.worldBuilding && wikiData.worldBuilding.length > 0 && (
            <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Map className="w-6 h-6 text-emerald-600" />
                World Building ({wikiData.worldBuilding.length})
              </h2>
              <div className="space-y-4">
                {wikiData.worldBuilding.map((item: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                    <h3 className="font-bold text-slate-900 dark:text-white">{item.name || `Location ${idx + 1}`}</h3>
                    {item.description && <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">{item.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Timeline */}
        {wikiData.timeline && wikiData.timeline.length > 0 && (
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Clock className="w-6 h-6 text-blue-600" />
              Timeline ({wikiData.timeline.length})
            </h2>
            <div className="space-y-3">
              {wikiData.timeline.map((event: any, idx: number) => (
                <div key={idx} className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <div className="font-bold text-indigo-600 min-w-fit">{event.year || event.date || `Year ${idx + 1}`}</div>
                  <div className="text-slate-700 dark:text-slate-300">{event.event || event.description}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-12 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-slate-600 dark:text-slate-400 text-sm md:px-8">
          <p>Plothole Wiki - {wikiData.author}'s World</p>
        </div>
      </footer>
    </div>
  );
};
