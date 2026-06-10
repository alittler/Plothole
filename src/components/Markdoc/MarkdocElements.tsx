import React from 'react';
import {
  User,
  MapPin,
  Zap,
  BookOpen,
  Lightbulb,
  AlertCircle,
  MessageSquare,
  Minus,
  Info,
  AlertTriangle,
  HelpCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

/**
 * Narrative element components for Markdoc rendering
 */

interface NarrativeElementProps {
  name?: string;
  id?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

// Character tag component
export const Character: React.FC<NarrativeElementProps> = ({
  name,
  role = 'supporting',
  tier = 2,
  id,
  children,
}) => (
  <div
    id={id}
    className="my-4 p-4 rounded-lg border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600"
  >
    <div className="flex items-start gap-3">
      <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded text-blue-600 dark:text-blue-300">
        <User size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <h4 className="font-bold text-blue-900 dark:text-blue-100">{name}</h4>
          <span className="text-xs px-2 py-1 bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded capitalize">
            {role}
          </span>
          <span className="text-xs text-blue-600 dark:text-blue-300">
            Tier {tier}
          </span>
        </div>
        <div className="text-sm text-blue-800 dark:text-blue-200">{children}</div>
      </div>
    </div>
  </div>
);

// Location tag component
export const Location: React.FC<NarrativeElementProps> = ({
  name,
  type = 'unknown',
  id,
  children,
}) => (
  <div
    id={id}
    className="my-4 p-4 rounded-lg border-l-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-600"
  >
    <div className="flex items-start gap-3">
      <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded text-emerald-600 dark:text-emerald-300">
        <MapPin size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <h4 className="font-bold text-emerald-900 dark:text-emerald-100">
            {name}
          </h4>
          <span className="text-xs px-2 py-1 bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-200 rounded capitalize">
            {type}
          </span>
        </div>
        <div className="text-sm text-emerald-800 dark:text-emerald-200">
          {children}
        </div>
      </div>
    </div>
  </div>
);

// Plot Event tag component
export const PlotEvent: React.FC<NarrativeElementProps> = ({
  title,
  type = 'other',
  significance = 'major',
  id,
  children,
}) => {
  const getSignificanceColor = (sig: string) => {
    switch (sig) {
      case 'minor':
        return { bg: 'bg-yellow-50', bgDark: 'dark:bg-yellow-900/20', border: 'border-yellow-500', text: 'text-yellow-900', textDark: 'dark:text-yellow-100', badge: 'bg-yellow-200 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200', icon: 'bg-yellow-100 dark:bg-yellow-800 text-yellow-600 dark:text-yellow-300' };
      case 'pivotal':
        return { bg: 'bg-red-50', bgDark: 'dark:bg-red-900/20', border: 'border-red-500', text: 'text-red-900', textDark: 'dark:text-red-100', badge: 'bg-red-200 text-red-700 dark:bg-red-800 dark:text-red-200', icon: 'bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-300' };
      default:
        return { bg: 'bg-orange-50', bgDark: 'dark:bg-orange-900/20', border: 'border-orange-500', text: 'text-orange-900', textDark: 'dark:text-orange-100', badge: 'bg-orange-200 text-orange-700 dark:bg-orange-800 dark:text-orange-200', icon: 'bg-orange-100 dark:bg-orange-800 text-orange-600 dark:text-orange-300' };
    }
  };

  const colors = getSignificanceColor(significance);

  return (
    <div
      id={id}
      className={`my-4 p-4 rounded-lg border-l-4 ${colors.border} ${colors.bg} ${colors.bgDark}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded ${colors.icon}`}>
          <Zap size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className={`font-bold ${colors.text} ${colors.textDark}`}>
              {title}
            </h4>
            <span className={`text-xs px-2 py-1 rounded capitalize ${colors.badge}`}>
              {significance}
            </span>
          </div>
          <div className="text-sm text-slate-800 dark:text-slate-200">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Lore/Worldbuilding tag component
export const Lore: React.FC<NarrativeElementProps> = ({
  term,
  type = 'concept',
  tier = 'moderate',
  id,
  children,
}) => (
  <div
    id={id}
    className="my-4 p-4 rounded-lg border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-600"
  >
    <div className="flex items-start gap-3">
      <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded text-purple-600 dark:text-purple-300">
        <BookOpen size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <h4 className="font-bold text-purple-900 dark:text-purple-100">
            {term}
          </h4>
          <span className="text-xs px-2 py-1 bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-200 rounded capitalize">
            {type}
          </span>
        </div>
        <div className="text-sm text-purple-800 dark:text-purple-200">
          {children}
        </div>
      </div>
    </div>
  </div>
);

// Theme tag component
export const Theme: React.FC<NarrativeElementProps> = ({
  name,
  description,
  id,
  children,
}) => (
  <div
    id={id}
    className="my-4 p-4 rounded-lg border-l-4 border-rose-500 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-600"
  >
    <div className="flex items-start gap-3">
      <div className="p-2 bg-rose-100 dark:bg-rose-800 rounded text-rose-600 dark:text-rose-300">
        <Lightbulb size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-rose-900 dark:text-rose-100 mb-2">
          {name}
        </h4>
        {description && (
          <p className="text-xs text-rose-700 dark:text-rose-300 mb-2">
            {description}
          </p>
        )}
        <div className="text-sm text-rose-800 dark:text-rose-200">{children}</div>
      </div>
    </div>
  </div>
);

// Narrative Note tag component
interface NarrativeNoteProps extends NarrativeElementProps {
  type?: 'info' | 'warning' | 'important' | 'question';
  title?: string;
}

export const NarrativeNote: React.FC<NarrativeNoteProps> = ({
  type = 'info',
  title,
  children,
}) => {
  const config = {
    info: {
      icon: Info,
      bg: 'bg-blue-50',
      bgDark: 'dark:bg-blue-900/20',
      border: 'border-blue-500',
      icon_bg: 'bg-blue-100 dark:bg-blue-800',
      icon_color: 'text-blue-600 dark:text-blue-300',
      text: 'text-blue-900 dark:text-blue-100',
      textContent: 'text-blue-800 dark:text-blue-200',
      label: 'Note',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-amber-50',
      bgDark: 'dark:bg-amber-900/20',
      border: 'border-amber-500',
      icon_bg: 'bg-amber-100 dark:bg-amber-800',
      icon_color: 'text-amber-600 dark:text-amber-300',
      text: 'text-amber-900 dark:text-amber-100',
      textContent: 'text-amber-800 dark:text-amber-200',
      label: 'Warning',
    },
    important: {
      icon: AlertCircle,
      bg: 'bg-red-50',
      bgDark: 'dark:bg-red-900/20',
      border: 'border-red-500',
      icon_bg: 'bg-red-100 dark:bg-red-800',
      icon_color: 'text-red-600 dark:text-red-300',
      text: 'text-red-900 dark:text-red-100',
      textContent: 'text-red-800 dark:text-red-200',
      label: 'Important',
    },
    question: {
      icon: HelpCircle,
      bg: 'bg-cyan-50',
      bgDark: 'dark:bg-cyan-900/20',
      border: 'border-cyan-500',
      icon_bg: 'bg-cyan-100 dark:bg-cyan-800',
      icon_color: 'text-cyan-600 dark:text-cyan-300',
      text: 'text-cyan-900 dark:text-cyan-100',
      textContent: 'text-cyan-800 dark:text-cyan-200',
      label: 'Question',
    },
  }[type];

  const Icon = config.icon;

  return (
    <div
      className={`my-4 p-4 rounded-lg border-l-4 ${config.border} ${config.bg} ${config.bgDark}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded ${config.icon_bg} mt-0.5`}>
          <Icon size={18} className={config.icon_color} />
        </div>
        <div className="flex-1">
          {title && (
            <h4 className={`font-bold ${config.text} mb-1`}>{title}</h4>
          )}
          <div className={`text-sm ${config.textContent}`}>{children}</div>
        </div>
      </div>
    </div>
  );
};

// Dialogue block component
export const DialogueBlock: React.FC<NarrativeElementProps> = ({
  character,
  emotion,
  children,
}) => (
  <div className="my-4 p-4 rounded-lg border-l-4 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-600">
    <div className="flex items-start gap-3">
      <div className="p-2 bg-indigo-100 dark:bg-indigo-800 rounded text-indigo-600 dark:text-indigo-300">
        <MessageSquare size={18} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <p className="font-bold text-indigo-900 dark:text-indigo-100">
            {character}
          </p>
          {emotion && (
            <span className="text-xs text-indigo-700 dark:text-indigo-300 italic">
              ({emotion})
            </span>
          )}
        </div>
        <p className="text-sm text-indigo-800 dark:text-indigo-200 italic">
          {children}
        </p>
      </div>
    </div>
  </div>
);

// Scene break component
export const SceneBreak: React.FC<{ type?: string }> = ({ type = 'scene' }) => (
  <div className="my-6 flex items-center justify-center">
    <div className="flex items-center gap-2 text-slate-400">
      {Array(3)
        .fill(0)
        .map((_, i) => (
          <Minus key={i} size={20} />
        ))}
    </div>
  </div>
);

// Callout component
export const Callout: React.FC<
  NarrativeElementProps & { type?: string; title?: string }
> = ({ type = 'info', title, children }) => (
  <div className="my-4 p-4 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
    {title && (
      <h4 className="font-bold text-slate-900 dark:text-white mb-2">
        {title}
      </h4>
    )}
    <div className="text-sm text-slate-800 dark:text-slate-200">{children}</div>
  </div>
);

// Spoiler component
export const Spoiler: React.FC<
  NarrativeElementProps & { label?: string }
> = ({ label = 'Spoiler', children }) => {
  const [revealed, setRevealed] = React.useState(false);

  return (
    <div className="my-2">
      <button
        onClick={() => setRevealed(!revealed)}
        className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
      >
        {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
        <span className="text-sm font-semibold">
          {revealed ? label : `${label} (click to reveal)`}
        </span>
      </button>
      {revealed && (
        <div className="mt-2 p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="text-sm text-slate-700 dark:text-slate-300">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

// Reference component
export const Reference: React.FC<
  NarrativeElementProps & {
    type?: string;
    display?: string;
  }
> = ({ type, id, display }) => (
  <a
    href={`#${id}`}
    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-semibold transition-colors"
  >
    {display || id}
    <span className="text-xs text-slate-500">({type})</span>
  </a>
);

// Tabs component
export const Tabs: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const [activeTab, setActiveTab] = React.useState(0);
  const tabs = React.Children.toArray(children).filter(
    (child) =>
      React.isValidElement(child) && (child.type as any).name === 'Tab'
  );

  return (
    <div className="my-4 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        {tabs.map((tab, index) => {
          const label = (tab as any).props?.label;
          return (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`px-4 py-2 font-semibold text-sm transition-colors ${
                activeTab === index
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="p-4">{tabs[activeTab]}</div>
    </div>
  );
};

// Tab component
export const Tab: React.FC<
  NarrativeElementProps & { label: string }
> = ({ label, children }) => <>{children}</>;

// Standard HTML element components
export const Heading: React.FC<
  NarrativeElementProps & { level: number }
> = ({ level, children }) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  const classes =
    {
      1: 'text-3xl font-black',
      2: 'text-2xl font-bold',
      3: 'text-xl font-bold',
      4: 'text-lg font-bold',
      5: 'text-base font-bold',
      6: 'text-sm font-bold',
    }[level] || 'text-base font-bold';

  return (
    <Tag className={`my-4 ${classes} text-slate-900 dark:text-white`}>
      {children}
    </Tag>
  );
};

export const Paragraph: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => (
  <p className="my-2 text-slate-800 dark:text-slate-200 leading-relaxed">
    {children}
  </p>
);

export const List: React.FC<
  NarrativeElementProps & { ordered?: boolean }
> = ({ ordered = false, children }) => {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag
      className={`my-4 pl-6 space-y-1 text-slate-800 dark:text-slate-200 ${
        ordered ? 'list-decimal' : 'list-disc'
      }`}
    >
      {children}
    </Tag>
  );
};

export const Item: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => <li className="text-slate-800 dark:text-slate-200">{children}</li>;

export const Fence: React.FC<
  NarrativeElementProps & { language?: string; content?: string }
> = ({ language = 'plaintext', content = '' }) => (
  <pre className="my-4 p-4 rounded-lg bg-slate-900 dark:bg-slate-950 overflow-x-auto">
    <code className={`text-slate-100 text-sm font-mono`}>{content}</code>
  </pre>
);

export const Blockquote: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => (
  <blockquote className="my-4 pl-4 border-l-4 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 italic">
    {children}
  </blockquote>
);

export const Link: React.FC<
  NarrativeElementProps & { href?: string }
> = ({ href = '#', children }) => (
  <a
    href={href}
    className="text-blue-600 dark:text-blue-400 hover:underline"
  >
    {children}
  </a>
);

export const Image: React.FC<
  NarrativeElementProps & {
    src?: string;
    alt?: string;
    title?: string;
  }
> = ({ src = '', alt = '', title }) => (
  <figure className="my-4">
    <img
      src={src}
      alt={alt}
      title={title}
      className="rounded-lg max-w-full h-auto"
    />
    {alt && (
      <figcaption className="mt-2 text-sm text-slate-500 text-center">
        {alt}
      </figcaption>
    )}
  </figure>
);
