import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { BookOpen, Loader2, AlertCircle, Sparkles } from 'lucide-react';

interface PublicBook {
  id: string;
  title: string;
  synopsis: string;
}

export const PublicProfileView: React.FC = () => {
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [books, setBooks] = useState<PublicBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Extract username from route: /username
    const path = location.pathname;
    const parts = path.split('/').filter(Boolean);
    
    if (parts.length === 0) return;
    
    const extractedUsername = parts[0];
    setUsername(extractedUsername);

    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const resp = await fetch(`/api/wiki/${extractedUsername}`);
        if (!resp.ok) {
          throw new Error('Profile not found');
        }
        const data = await resp.json();
        setBooks(data.books || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-indigo-600" />
          <p className="text-slate-600 dark:text-slate-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || books.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-lg border border-slate-200 dark:border-slate-800 text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500" />
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Profile Not Found</h2>
          <p className="text-slate-600 dark:text-slate-400">
            {error || 'This user has no public books yet.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-12 md:px-8">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-indigo-600" />
            <h1 className="text-4xl font-black text-slate-900 dark:text-white">{username}</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            {books.length} {books.length === 1 ? 'book' : 'books'} to explore
          </p>
        </div>
      </header>

      {/* Books Grid */}
      <main className="max-w-6xl mx-auto px-4 py-12 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <Link
              key={book.id}
              to={`/${username}/${encodeURIComponent(book.title)}`}
              className="group bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:border-indigo-400 dark:hover:border-indigo-600 transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-900 dark:text-white text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                    {book.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 line-clamp-3">
                    {book.synopsis || 'No synopsis provided'}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-12 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-slate-600 dark:text-slate-400 text-sm md:px-8">
          <p>Plothole Wiki - Discover amazing worlds</p>
        </div>
      </footer>
    </div>
  );
};
