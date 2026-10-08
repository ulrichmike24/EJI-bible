import React, { useState, useEffect } from 'react';
import { User, Mail, ShieldCheck, LogOut, Key, Sparkles, Check, AlertCircle, Eye, EyeOff, Globe } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { getStoredApiKey, setStoredApiKey, testGeminiApiKey } from '../../lib/api.ts';

interface ProfileViewProps {
  translation: 'LSG' | 'KJV';
  setTranslation: (t: 'LSG' | 'KJV') => void;
  setCurrentTab: (tab: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  translation,
  setTranslation,
  setCurrentTab,
}) => {
  const { user, isAdmin, login, logout } = useAuth();
  const { isWhite } = useTheme();

  // Gemini API Key state
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testFeedback, setTestFeedback] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    const existing = getStoredApiKey();
    if (existing) {
      setApiKeyInput(existing);
    }
  }, []);

  const handleSaveKey = () => {
    setStoredApiKey(apiKeyInput.trim());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleClearKey = () => {
    setStoredApiKey('');
    setApiKeyInput('');
    setTestStatus('idle');
    setTestFeedback('');
  };

  const handleTestKey = async () => {
    if (!apiKeyInput.trim()) {
      setTestStatus('error');
      setTestFeedback('Veuillez d\'abord saisir une clé API.');
      return;
    }
    setTestStatus('testing');
    setTestFeedback('Connexion en cours aux serveurs Gemini...');
    try {
      const result = await testGeminiApiKey(apiKeyInput.trim());
      if (result.success) {
        setTestStatus('success');
        setTestFeedback(`IA Connectée avec succès via ${result.model || 'Gemini'} !`);
        setStoredApiKey(apiKeyInput.trim());
      } else {
        setTestStatus('error');
        setTestFeedback(`Échec : ${result.message}`);
      }
    } catch (e: any) {
      setTestStatus('error');
      setTestFeedback(e.message || 'Erreur lors du test.');
    }
  };

  const favCount = JSON.parse(localStorage.getItem('bible_ai_favorites') || '[]').length;
  const notesCount = Object.keys(JSON.parse(localStorage.getItem('bible_ai_notes') || '{}')).length;
  const progressData = JSON.parse(localStorage.getItem('bible_ai_reading_progress') || '{}');
  const totalDaysCompleted = Object.values(progressData).reduce(
    (acc: number, arr: any) => acc + (Array.isArray(arr) ? arr.length : 0),
    0
  );

  return (
    <div className="space-y-8 pb-20 max-w-3xl mx-auto">
      {/* PROFILE CARD */}
      <div className={`border rounded-3xl p-6 sm:p-10 space-y-6 shadow-sm transition-colors ${
        isWhite
          ? 'bg-white border-neutral-200 text-neutral-900'
          : 'bg-neutral-950 border-neutral-800 text-neutral-100'
      }`}>
        <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Profil'}
              className="w-20 h-20 rounded-3xl object-cover border-2 border-neutral-300 shadow-md"
            />
          ) : (
            <div className={`w-20 h-20 rounded-3xl border flex items-center justify-center font-extrabold text-2xl shadow-sm ${
              isWhite
                ? 'bg-neutral-100 border-neutral-200 text-neutral-900'
                : 'bg-neutral-900 border-neutral-800 text-white'
            }`}>
              {user ? user.email?.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
            </div>
          )}

          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className={`text-xl sm:text-2xl font-black ${isWhite ? 'text-neutral-950' : 'text-white'}`}>
                {user ? user.displayName || 'Utilisateur Bible AI' : 'Invité (Non connecté)'}
              </h1>
              {isAdmin && (
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  isWhite
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-red-950/40 text-red-300 border-red-900/50'
                }`}>
                  <ShieldCheck className="w-3 h-3" />
                  Administrateur
                </span>
              )}
            </div>
            <p className={`text-xs flex items-center justify-center sm:justify-start gap-1.5 ${
              isWhite ? 'text-neutral-500' : 'text-neutral-400'
            }`}>
              <Mail className="w-3.5 h-3.5" />
              <span>{user?.email || 'Connectez-vous pour synchroniser vos données'}</span>
            </p>
          </div>

          <div>
            {user ? (
              <button
                onClick={logout}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-semibold transition-all ${
                  isWhite
                    ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-300'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border-neutral-800'
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnexion</span>
              </button>
            ) : (
              <button
                onClick={login}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all ${
                  isWhite
                    ? 'bg-neutral-950 hover:bg-neutral-800 text-white'
                    : 'bg-white hover:bg-neutral-200 text-neutral-950'
                }`}
              >
                <span>Connexion Google</span>
              </button>
            )}
          </div>
        </div>

        {/* STATS OVERVIEW */}
        <div className={`grid grid-cols-3 gap-3 pt-4 border-t ${
          isWhite ? 'border-neutral-200' : 'border-neutral-800'
        }`}>
          <div
            onClick={() => setCurrentTab('library')}
            className={`p-4 rounded-2xl border text-center cursor-pointer transition-colors ${
              isWhite
                ? 'bg-neutral-50 hover:bg-neutral-100/80 border-neutral-200'
                : 'bg-neutral-900/60 hover:bg-neutral-800 border-neutral-800'
            }`}
          >
            <div className={`text-xl font-black ${isWhite ? 'text-neutral-950' : 'text-white'}`}>{favCount}</div>
            <div className={`text-[11px] mt-1 ${isWhite ? 'text-neutral-500' : 'text-neutral-400'}`}>Favoris</div>
          </div>

          <div
            onClick={() => setCurrentTab('library')}
            className={`p-4 rounded-2xl border text-center cursor-pointer transition-colors ${
              isWhite
                ? 'bg-neutral-50 hover:bg-neutral-100/80 border-neutral-200'
                : 'bg-neutral-900/60 hover:bg-neutral-800 border-neutral-800'
            }`}
          >
            <div className={`text-xl font-black ${isWhite ? 'text-neutral-950' : 'text-white'}`}>{notesCount}</div>
            <div className={`text-[11px] mt-1 ${isWhite ? 'text-neutral-500' : 'text-neutral-400'}`}>Notes prises</div>
          </div>

          <div
            onClick={() => setCurrentTab('plans')}
            className={`p-4 rounded-2xl border text-center cursor-pointer transition-colors ${
              isWhite
                ? 'bg-neutral-50 hover:bg-neutral-100/80 border-neutral-200'
                : 'bg-neutral-900/60 hover:bg-neutral-800 border-neutral-800'
            }`}
          >
            <div className={`text-xl font-black ${isWhite ? 'text-neutral-950' : 'text-white'}`}>{totalDaysCompleted}</div>
            <div className={`text-[11px] mt-1 ${isWhite ? 'text-neutral-500' : 'text-neutral-400'}`}>Jours de plans lus</div>
          </div>
        </div>

        {/* PREFERENCES */}
        <div className={`space-y-4 pt-4 border-t ${
          isWhite ? 'border-neutral-200' : 'border-neutral-800'
        }`}>
          <h3 className={`font-bold text-sm ${isWhite ? 'text-neutral-950' : 'text-white'}`}>Préférences de lecture</h3>
          <div className={`flex items-center justify-between p-4 rounded-2xl border ${
            isWhite ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-900 border-neutral-800'
          }`}>
            <div>
              <div className={`text-xs font-semibold ${isWhite ? 'text-neutral-900' : 'text-white'}`}>Traduction par défaut</div>
              <div className={`text-[11px] ${isWhite ? 'text-neutral-500' : 'text-neutral-400'}`}>
                Choix entre la référence francophone (LSG 1910) et anglophone (KJV)
              </div>
            </div>

            <div className={`flex p-0.5 rounded-xl border text-xs ${
              isWhite ? 'bg-white border-neutral-200' : 'bg-neutral-950 border-neutral-800'
            }`}>
              <button
                onClick={() => setTranslation('LSG')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all border ${
                  translation === 'LSG'
                    ? isWhite
                      ? 'bg-neutral-950 text-white border-neutral-950 shadow-xs'
                      : 'bg-white text-neutral-950 border-white shadow-xs'
                    : isWhite
                    ? 'text-neutral-600 hover:text-black border-transparent'
                    : 'text-neutral-400 hover:text-white border-transparent'
                }`}
              >
                LSG 1910
              </button>
              <button
                onClick={() => setTranslation('KJV')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all border ${
                  translation === 'KJV'
                    ? isWhite
                      ? 'bg-neutral-950 text-white border-neutral-950 shadow-xs'
                      : 'bg-white text-neutral-950 border-white shadow-xs'
                    : isWhite
                    ? 'text-neutral-600 hover:text-black border-transparent'
                    : 'text-neutral-400 hover:text-white border-transparent'
                }`}
              >
                KJV
              </button>
            </div>
          </div>
        </div>

        {/* GEMINI AI CONFIGURATION & LIVE WEB SEARCH */}
        <div className={`space-y-4 pt-5 border-t ${
          isWhite ? 'border-neutral-200' : 'border-neutral-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className={`w-4 h-4 ${isWhite ? 'text-amber-600' : 'text-amber-400'}`} />
              <h3 className={`font-bold text-sm ${isWhite ? 'text-neutral-950' : 'text-white'}`}>
                Intelligence Artificielle & Recherche Live (Gemini)
              </h3>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
              apiKeyInput.trim()
                ? isWhite
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-emerald-950/40 text-emerald-300 border-emerald-800'
                : isWhite
                ? 'bg-neutral-100 text-neutral-600 border-neutral-300'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800'
            }`}>
              <Globe className="w-2.5 h-2.5" />
              {apiKeyInput.trim() ? 'Clé configurée' : 'Clé par défaut / Vercel'}
            </span>
          </div>

          <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
            isWhite ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-900 border-neutral-800'
          }`}>
            <div className="space-y-1">
              <p className={`text-xs ${isWhite ? 'text-neutral-600' : 'text-neutral-300'}`}>
                Permet à l'IA d'analyser en profondeur et de rechercher en direct sur le Net les informations théologiques, historiques et d'actualité pour vos études bibliques, explications de versets et scripts.
              </p>
              <p className={`text-[11px] ${isWhite ? 'text-neutral-500' : 'text-neutral-400'}`}>
                Si vous déployez sur Vercel, vous pouvez ajouter cette clé ici ou dans les variables d'environnement Vercel (<code className="px-1 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 font-mono text-[10px]">GEMINI_API_KEY</code>).
              </p>
            </div>

            <div className="space-y-2">
              <label className={`text-xs font-bold flex items-center justify-between ${isWhite ? 'text-neutral-800' : 'text-neutral-200'}`}>
                <span className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  <span>Clé API Google Gemini</span>
                </span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-[11px] underline font-normal ${
                    isWhite ? 'text-neutral-600 hover:text-neutral-950' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Obtenir une clé gratuite &rarr;
                </a>
              </label>

              <div className="relative flex items-center">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={e => {
                    setApiKeyInput(e.target.value);
                    setTestStatus('idle');
                    setTestFeedback('');
                  }}
                  placeholder="AIzaSy..."
                  className={`w-full border rounded-xl pl-3 pr-10 py-2.5 text-xs outline-none font-mono transition-colors ${
                    isWhite
                      ? 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-950'
                      : 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-600 focus:border-white'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className={`absolute right-3 p-1 rounded-md transition-colors ${
                    isWhite ? 'text-neutral-400 hover:text-neutral-700' : 'text-neutral-500 hover:text-neutral-200'
                  }`}
                  title={showKey ? 'Masquer la clé' : 'Afficher la clé'}
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* ACTION BUTTONS & FEEDBACK */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSaveKey}
                disabled={!apiKeyInput.trim()}
                className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-40 ${
                  isWhite
                    ? 'bg-neutral-950 hover:bg-neutral-800 text-white'
                    : 'bg-white hover:bg-neutral-200 text-neutral-950'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSaved ? 'Enregistré !' : 'Enregistrer'}</span>
              </button>

              <button
                type="button"
                onClick={handleTestKey}
                disabled={!apiKeyInput.trim() || testStatus === 'testing'}
                className={`px-4 py-2 rounded-xl border text-xs font-semibold active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-40 ${
                  isWhite
                    ? 'bg-white hover:bg-neutral-100 text-neutral-800 border-neutral-300'
                    : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-200 border-neutral-700'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{testStatus === 'testing' ? 'Test en cours...' : 'Tester la connexion'}</span>
              </button>

              {apiKeyInput.trim() && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    isWhite
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-red-400 hover:bg-red-950/40'
                  }`}
                >
                  Effacer
                </button>
              )}
            </div>

            {/* TEST FEEDBACK NOTIFICATION */}
            {testFeedback && (
              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                testStatus === 'success'
                  ? isWhite
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : testStatus === 'error'
                  ? isWhite
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-red-950/40 border-red-800 text-red-300'
                  : isWhite
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-amber-950/40 border-amber-800 text-amber-300'
              }`}>
                {testStatus === 'success' ? (
                  <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                ) : testStatus === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                ) : (
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                )}
                <span className="leading-relaxed">{testFeedback}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
