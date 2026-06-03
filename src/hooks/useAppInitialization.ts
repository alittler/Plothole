import { useState, useEffect, useRef } from 'react';
import { User, Note, ToolboxLink, AppPrompts, AppSettings, ViewType } from '../types';
import { 
  getAllGlobalNotes, 
  getAllGlobalResources, 
  getAppPrompts, 
  getAppSettings, 
  saveAppSettings,
  setServerHealth
} from '../services/storageService';
import { DEFAULT_APP_PROMPTS, DEFAULT_APP_SETTINGS } from '../constants/defaults';

const DEMO_USER: User = {
  id: 'user-1',
  name: 'Anonymous Writer',
  email: 'guest@plothole.local',
  role: 'admin',
  lastActive: Date.now(),
  themeColor: '59 130 246',
  preferences: { 
    themeMode: 'light', 
    fontSize: 'md', 
    fontFamily: 'sans', 
    landingPage: ViewType.BOOKSHELF, 
    colorfulIcons: true, 
    semanticSearchEnabled: false,
    aiVerbosity: 'balanced'
  }
};

export function useAppInitialization(auth0User: any, isAuthLoading: boolean, getAccessTokenSilently: any) {
  const [globalNotes, setGlobalNotes] = useState<Note[]>([]);
  const [globalResources, setGlobalResources] = useState<ToolboxLink[]>([]);
  const [appPrompts, setAppPromptsState] = useState<AppPrompts>(DEFAULT_APP_PROMPTS);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [currentUser, setCurrentUser] = useState<User>(DEMO_USER);
  const [isServerConnected, setIsServerConnected] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('Spooling Engines');

  // Sync Auth0 user with app user
  useEffect(() => {
    if (!isAuthLoading && auth0User) {
      const email = auth0User.email || '';
      const isAdmin = (auth0User['https://plothole.ai/roles']?.includes('admin')) ||
        (appSettings.adminEmails?.includes(email)) ||
        (process.env.NODE_ENV === 'development' && email.endsWith('@plothole.ai'));

      setCurrentUser(prev => ({
        ...prev,
        id: auth0User.sub || '',
        name: auth0User.name || auth0User.nickname || 'Writer',
        email: email,
        role: isAdmin ? 'admin' : 'editor',
      }));

      const fetchUsername = async () => {
        try {
          const token = await getAccessTokenSilently();
          const resp = await fetch('/api/user/username', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data.username) {
              setCurrentUser(prev => ({
                ...prev,
                username: data.username
              }));
            }
          }
        } catch (err) {
          console.error('Failed to fetch username:', err);
        }
      };
      fetchUsername();
    }
  }, [isAuthLoading, auth0User, appSettings.adminEmails, getAccessTokenSilently]);

  // Initial Data Fetching
  useEffect(() => {
    if (isAuthLoading) return;

    const init = async () => {
      setIsLoaded(false);
      setLoadingProgress(20);
      setLoadingStage('Synchronizing Metadata');

      try {
        // Fetch non-critical data in parallel with a timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Initialization timeout')), 8000)
        );

        const dataPromise = Promise.all([
          getAllGlobalNotes(),
          getAllGlobalResources(),
          getAppPrompts(),
          getAppSettings()
        ]);

        const [notes, resources, prompts, settings] = await Promise.race([dataPromise, timeoutPromise]) as [Note[], ToolboxLink[], AppPrompts, AppSettings];

        if (notes) setGlobalNotes(notes);
        if (resources) setGlobalResources(resources);
        if (prompts) setAppPromptsState(prev => ({ ...prev, ...prompts }));
        
        if (settings) {
          const finalSettings = { ...settings };
          if (!finalSettings.appName || finalSettings.appName.includes('Steno') || finalSettings.appName === 'Plothole AI') {
            finalSettings.appName = 'Plothole — Your Story, Decoded';
            await saveAppSettings(finalSettings as AppSettings);
          }
          setAppSettings(prev => ({ ...prev, ...finalSettings }));
        }

        setLoadingProgress(100);
        setLoadingStage('Ready');
        setTimeout(() => setIsLoaded(true), 200);
      } catch (err) {
        console.error("Initialization failed or timed out:", err);
        // Ensure we still mark as loaded so the user can at least see the app
        setLoadingStage('Starting in Offline Mode');
        setLoadingProgress(100);
        setTimeout(() => setIsLoaded(true), 1000);
      }
    };
    init();
  }, [isAuthLoading]);

  // Server Health Heartbeat
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/config');
        const healthy = res.ok;
        setServerHealth(healthy);
        setIsServerConnected(healthy);
      } catch (e) {
        setServerHealth(false);
        setIsServerConnected(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    globalNotes,
    setGlobalNotes,
    globalResources,
    appPrompts,
    setAppPromptsState,
    appSettings,
    setAppSettings,
    currentUser,
    setCurrentUser,
    isServerConnected,
    isLoaded,
    loadingProgress,
    loadingStage
  };
}
