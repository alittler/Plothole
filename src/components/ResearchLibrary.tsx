import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { 
  FileText, 
  Globe, 
  Youtube, 
  FileUp, 
  Plus, 
  Search, 
  Trash2, 
  Sparkles, 
  Send, 
  Upload, 
  ExternalLink, 
  BookOpen, 
  PlusCircle, 
  Loader, 
  CheckCircle, 
  FileCode, 
  Image as ImageIcon,
  Edit,
  ArrowRight,
  Bookmark,
  Share2,
  Link,
  File,
  RotateCcw,
  Check,
  Copy,
  ListPlus,
  Save
} from 'lucide-react';
import Markdown from 'react-markdown';
import { ResearchNotebook, ResearchSource } from '../types';
import { buildSingleFileMarkdown, getFastSourceSHA, extractKeyTakeaways, computeSHA256 } from '../utils/markdownExporter';

interface ResearchLibraryProps {
  user: any;
  driveToken: string | null;
  notebooks: ResearchNotebook[];
  currentNotebookId: string | null;
  onSaveNotebook: (updatedNotebooks: ResearchNotebook[]) => Promise<void>;
  setCurrentNotebookId: React.Dispatch<React.SetStateAction<string | null>>;
  onLoginRequest: () => void;
  createGoogleDocFromNotebook: (token: string, name: string, sources: ResearchSource[]) => Promise<{ id: string; url: string }>;
  uploadToGoogleDrive: (token: string, name: string, mime: string, content: string) => Promise<{ id: string; name: string; webViewLink?: string }>;
}

export const ResearchLibrary: React.FC<ResearchLibraryProps> = ({
  user,
  driveToken,
  notebooks,
  currentNotebookId,
  onSaveNotebook,
  setCurrentNotebookId,
  onLoginRequest,
  createGoogleDocFromNotebook,
  uploadToGoogleDrive
}) => {
  const activeNotebook = notebooks.find(n => n.id === currentNotebookId) || notebooks[0];

  // UI Panel states
  const [activePane, setActivePane] = useState<'chat' | 'sources' | 'markdown'>('chat');
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Undo Stack & Auto-save States
  const [undoStack, setUndoStack] = useState<ResearchNotebook[][]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<{ message: string; actionLabel?: string; onAction?: () => void } | null>(null);
  const [isCopiedMd, setIsCopiedMd] = useState(false);

  // Source Inline Editing State
  const [isEditingActiveSource, setIsEditingActiveSource] = useState(false);
  const [editTitleInput, setEditTitleInput] = useState('');
  const [editContentInput, setEditContentInput] = useState('');
  const [editTakeawaysInput, setEditTakeawaysInput] = useState<string[]>([]);
  const [newTakeawayInput, setNewTakeawayInput] = useState('');
  
  // Add Source Modal state
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [sourceType, setSourceType] = useState<'text' | 'url' | 'file'>('text');
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileDetails, setFileDetails] = useState<{ name: string; type: string; size: number } | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parsingError, setParsingError] = useState<string | null>(null);

  // New Notebook states
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
  const [notebookNameInput, setNotebookNameInput] = useState('');

  // AI Chat States
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'model'; text: string }>>([
    { 
      role: 'model', 
      text: "Welcome to your Plothole Research Library! 📚 I am your grounded AI Notebook partner. Ask me any questions, generate outlines, or find thematic connections based strictly on your uploaded research sources above." 
    }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Export states
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessUrl, setExportSuccessUrl] = useState<string | null>(null);
  const [exportType, setExportType] = useState<'gdoc' | 'md' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);
  const [deletingNotebookId, setDeletingNotebookId] = useState<string | null>(null);

  const resetAddSourceFields = () => {
    setSourceType('text');
    setNewTitle('');
    setNewUrl('');
    setNewContent('');
    setFileDetails(null);
    setIsParsingFile(false);
    setParsingError(null);
  };

  // Auto-Save and History Helper
  const saveWithAutoSaveAndHistory = async (newNotebooks: ResearchNotebook[], toastMsg?: string) => {
    setUndoStack((prev) => [...prev, notebooks]);
    setSaveStatus('saving');
    try {
      await onSaveNotebook(newNotebooks);
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      if (toastMsg) {
        setToastNotice({
          message: toastMsg,
          actionLabel: 'Undo',
          onAction: () => handleUndo()
        });
        setTimeout(() => setToastNotice(null), 5000);
      }
    } catch (err) {
      console.error("Auto-save failed:", err);
      setSaveStatus('saved');
    }
  };

  const handleUndo = async () => {
    if (undoStack.length === 0) return;
    const previousNotebooks = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setSaveStatus('saving');
    try {
      await onSaveNotebook(previousNotebooks);
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setToastNotice({ message: 'Action undone successfully!' });
      setTimeout(() => setToastNotice(null), 3000);
    } catch (err) {
      console.error("Undo restore failed:", err);
      setSaveStatus('saved');
    }
  };

  // Keyboard shortcut listener for Ctrl+Z / Cmd+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        const activeEl = document.activeElement;
        if (activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA') {
          return;
        }
        if (undoStack.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack]);

  // Filter sources
  const filteredSources = activeNotebook?.sources.filter(source => 
    source.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    source.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const activeSource = activeNotebook?.sources.find(s => s.id === selectedSourceId);

  // When activeSource changes or edit mode toggled, populate edit inputs
  useEffect(() => {
    if (activeSource) {
      setEditTitleInput(activeSource.title);
      setEditContentInput(activeSource.content);
      setEditTakeawaysInput(extractKeyTakeaways(activeSource));
    }
  }, [selectedSourceId, isEditingActiveSource]);

  // Create Notebook
  const handleCreateNotebook = async () => {
    if (!notebookNameInput.trim()) return;
    const newNb: ResearchNotebook = {
      id: 'nb_' + Date.now(),
      name: notebookNameInput.trim(),
      sources: [],
      createdAt: new Date().toISOString(),
      lastEdited: new Date().toISOString()
    };
    const updated = [newNb, ...notebooks];
    await saveWithAutoSaveAndHistory(updated, `Notebook "${newNb.name}" created.`);
    setCurrentNotebookId(newNb.id);
    setNotebookNameInput('');
    setIsCreatingNotebook(false);
  };

  // Delete Notebook
  const handleDeleteNotebook = async (id: string, force: boolean = false) => {
    if (notebooks.length <= 1) {
      alert("You must keep at least one research notebook active.");
      return;
    }
    if (!force) {
      setDeletingNotebookId(id);
      return;
    }
    const targetNb = notebooks.find(n => n.id === id);
    const updated = notebooks.filter(n => n.id !== id);
    await saveWithAutoSaveAndHistory(updated, `Notebook "${targetNb?.name || 'Notebook'}" deleted.`);
    setCurrentNotebookId(updated[0].id);
    setDeletingNotebookId(null);
  };

  // Helper to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Helper to parse DOCX using JSZip
  const parseDocx = async (file: File): Promise<string> => {
    const zip = await JSZip.loadAsync(file);
    const docXml = await zip.file("word/document.xml")?.async("string");
    if (!docXml) {
      throw new Error("Invalid DOCX format: word/document.xml not found");
    }
    // Extract text from w:t tags
    const textMatches = docXml.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || [];
    const text = textMatches
      .map(val => val.replace(/<[^>]+>/g, ""))
      .join(" ");
    return text;
  };

  // File Upload Handlers
  const processUploadedFile = async (file: File) => {
    setFileDetails({ name: file.name, type: file.type, size: file.size });
    setNewTitle(file.name.replace(/\.[^/.]+$/, "")); // Strip extension
    setParsingError(null);
    setIsParsingFile(true);

    const fileExt = file.name.split('.').pop()?.toLowerCase();

    try {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setNewContent(e.target.result as string); // base64 string
            setIsParsingFile(false);
          }
        };
        reader.onerror = () => {
          setParsingError("Failed to read image file.");
          setIsParsingFile(false);
        };
        reader.readAsDataURL(file);
      } else if (fileExt === 'txt' || fileExt === 'md') {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setNewContent(e.target.result as string);
            setIsParsingFile(false);
          }
        };
        reader.onerror = () => {
          setParsingError("Failed to read text/markdown file.");
          setIsParsingFile(false);
        };
        reader.readAsText(file);
      } else if (fileExt === 'docx') {
        const parsedText = await parseDocx(file);
        setNewContent(parsedText);
        setIsParsingFile(false);
      } else if (fileExt === 'doc') {
        // Best effort extraction for legacy .doc
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            const buffer = e.target.result as ArrayBuffer;
            const view = new Uint8Array(buffer);
            let text = "";
            for (let i = 0; i < view.length; i++) {
              const charCode = view[i];
              if ((charCode >= 32 && charCode <= 126) || charCode === 10 || charCode === 13 || charCode === 9) {
                text += String.fromCharCode(charCode);
              }
            }
            const cleanText = text.replace(/\s+/g, ' ').trim().slice(0, 50000);
            setNewContent(`[Extracted from binary .doc file]\n\n${cleanText}`);
            setIsParsingFile(false);
          }
        };
        reader.onerror = () => {
          setParsingError("Failed to read .doc file.");
          setIsParsingFile(false);
        };
        reader.readAsArrayBuffer(file);
      } else if (fileExt === 'pdf' || file.type === 'application/pdf') {
        const base64Data = await fileToBase64(file);
        const response = await fetch("/api/research/parse-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Data,
            fileName: file.name,
            mimeType: "application/pdf"
          })
        });
        const result = await response.json();
        if (result.success) {
          setNewContent(result.text);
        } else {
          throw new Error(result.error || "Server failed to parse PDF.");
        }
        setIsParsingFile(false);
      } else {
        // Fallback for other file types
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setNewContent(e.target.result as string);
            setIsParsingFile(false);
          }
        };
        reader.onerror = () => {
          setParsingError("Failed to read file.");
          setIsParsingFile(false);
        };
        reader.readAsText(file);
      }
    } catch (err: any) {
      console.error("Error parsing file:", err);
      setParsingError(err.message || "Failed to parse file.");
      setIsParsingFile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processUploadedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processUploadedFile(file);
  };

  // Add Source Submitter
  const handleAddSource = async () => {
    if (!activeNotebook) {
      alert("No active notebook selected.");
      return;
    }

    if (!newTitle.trim()) {
      alert("Please enter a title for the source.");
      return;
    }

    if (sourceType === 'file' && isParsingFile) {
      alert("Please wait until the file is fully parsed.");
      return;
    }

    if (sourceType === 'file' && parsingError) {
      if (!confirm(`The file parsing had an error: "${parsingError}". Do you still want to proceed with empty or partial content?`)) {
        return;
      }
    }

    const isImage = fileDetails?.type.startsWith('image/');
    let finalContent = newContent;

    if (sourceType === 'url') {
      if (!newUrl.trim()) {
        alert("Please enter a website URL.");
        return;
      }

      const trimmedUrl = newUrl.trim().toLowerCase();
      const isDuplicate = activeNotebook.sources.some(s => s.url && s.url.trim().toLowerCase() === trimmedUrl);
      if (isDuplicate) {
        const proceed = confirm("Warning: A research source with this exact URL already exists in this notebook. Do you still want to add it as a duplicate?");
        if (!proceed) {
          return;
        }
      }

      if (!newContent.trim()) {
        finalContent = `Content for website URL: ${newUrl}\n\n(No additional research notes added yet. Ask Plothole AI to read from general knowledge if details are missing.)`;
      }
    }

    const shaValue = await computeSHA256(finalContent + newTitle);

    const newSource: ResearchSource = {
      id: 'src_' + Date.now(),
      type: sourceType,
      title: newTitle.trim(),
      url: sourceType === 'url' ? newUrl.trim() : undefined,
      content: finalContent,
      fileName: sourceType === 'file' ? fileDetails?.name : undefined,
      fileType: sourceType === 'file' ? fileDetails?.type : undefined,
      addedAt: new Date().toISOString(),
      sha: shaValue,
      keyTakeaways: []
    };

    const updatedNotebooks = notebooks.map(nb => {
      if (nb.id === activeNotebook.id) {
        return {
          ...nb,
          sources: [newSource, ...nb.sources],
          lastEdited: new Date().toISOString()
        };
      }
      return nb;
    });

    // Reset fields and update UI state immediately (synchronously) to avoid delays/lag
    setSelectedSourceId(newSource.id);
    setActivePane('sources');
    setIsAddingSource(false);
    setNewTitle('');
    setNewUrl('');
    setNewContent('');
    setFileDetails(null);
    setIsParsingFile(false);
    setParsingError(null);

    await saveWithAutoSaveAndHistory(updatedNotebooks, `Source "${newSource.title}" added to notebook.`);
  };

  // Delete Source
  const handleDeleteSource = async (sourceId: string, force: boolean = false) => {
    if (!activeNotebook) return;
    if (!force) {
      setDeletingSourceId(sourceId);
      return;
    }
    const sourceToDelete = activeNotebook.sources.find(s => s.id === sourceId);
    const updatedNotebooks = notebooks.map(nb => {
      if (nb.id === activeNotebook.id) {
        return {
          ...nb,
          sources: nb.sources.filter(s => s.id !== sourceId),
          lastEdited: new Date().toISOString()
        };
      }
      return nb;
    });

    // Update selection state and clear deleting flag synchronously to keep UI snappy
    if (selectedSourceId === sourceId) {
      setSelectedSourceId(null);
    }
    setDeletingSourceId(null);

    await saveWithAutoSaveAndHistory(updatedNotebooks, `Source "${sourceToDelete?.title || 'Source'}" deleted.`);
  };

  // Save edits to an active source
  const handleSaveSourceEdits = async () => {
    if (!activeNotebook || !activeSource) return;
    const shaValue = await computeSHA256(editContentInput + editTitleInput);

    const updatedNotebooks = notebooks.map(nb => {
      if (nb.id === activeNotebook.id) {
        return {
          ...nb,
          sources: nb.sources.map(s => {
            if (s.id === activeSource.id) {
              return {
                ...s,
                title: editTitleInput.trim() || s.title,
                content: editContentInput,
                keyTakeaways: editTakeawaysInput,
                sha: shaValue
              };
            }
            return s;
          }),
          lastEdited: new Date().toISOString()
        };
      }
      return nb;
    });

    setIsEditingActiveSource(false);
    await saveWithAutoSaveAndHistory(updatedNotebooks, `Source "${editTitleInput}" auto-saved.`);
  };

  // Send AI Chat Message
  const handleSendMessage = async () => {
    if (!chatMessage.trim() || isChatLoading) return;
    const messageText = chatMessage;
    setChatMessage('');
    
    const userTurn = { role: 'user' as const, text: messageText };
    setChatHistory(prev => [...prev, userTurn]);
    setIsChatLoading(true);

    // Scroll chat bottom
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    try {
      const response = await fetch('/api/research/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sources: activeNotebook.sources,
          message: messageText,
          history: chatHistory.slice(-10) // Limit history context
        })
      });

      const data = await response.json();
      if (data.success && data.text) {
        setChatHistory(prev => [...prev, { role: 'model', text: data.text }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'model', text: `⚠️ Error parsing grounded answer: ${data.error || "Please verify server logs."}` }]);
      }
    } catch (e: any) {
      console.error(e);
      setChatHistory(prev => [...prev, { role: 'model', text: `❌ Network connection failed: ${e.message || "Please try again."}` }]);
    } finally {
      setIsChatLoading(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  // Construct markdown payload helper
  // Construct single file markdown payload helper using exact requested schema
  const buildNotebookMarkdown = () => {
    if (!activeNotebook) return `# Research Notes\n`;
    return buildSingleFileMarkdown(activeNotebook.sources, activeNotebook.name);
  };

  // Direct local file download helper
  const downloadMarkdownLocally = () => {
    const md = buildNotebookMarkdown();
    const filename = `Plothole_Research_${activeNotebook.name.replace(/\s+/g, '_')}.md`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Save Notebook to Google Drive
  const handleSyncToGoogleDrive = async (type: 'gdoc' | 'md') => {
    if (!driveToken) {
      onLoginRequest();
      return;
    }

    setIsExporting(true);
    setExportSuccessUrl(null);
    setExportType(type);

    try {
      if (type === 'gdoc') {
        const docRes = await createGoogleDocFromNotebook(driveToken, activeNotebook.name, activeNotebook.sources);
        setExportSuccessUrl(docRes.url);
      } else {
        const md = buildNotebookMarkdown();
        const filename = `Plothole_Research_${activeNotebook.name.replace(/\s+/g, '_')}.md`;
        
        // Trigger local file download immediately so the button is ultra responsive
        downloadMarkdownLocally();

        const uploadRes = await uploadToGoogleDrive(driveToken, filename, "text/markdown", md);
        if (uploadRes.webViewLink) {
          setExportSuccessUrl(uploadRes.webViewLink);
        } else {
          setExportSuccessUrl("https://drive.google.com");
        }
      }
    } catch (e: any) {
      console.error(e);
      alert(`Google Drive sync completed with local download, but Drive upload failed: ${e.message || e}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div id="research-library-workspace" className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:h-[750px] xl:min-h-[600px] min-h-[400px]">
      
      {/* LEFT CONTROL COLUMN: Notebooks and Source Index (Takes 4 cols on desktop) */}
      <div id="research-sidebar" className="xl:col-span-4 flex flex-col bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm h-[400px] xl:h-full">
        
        {/* Notebook header & selector */}
        <div className="p-4 border-b border-slate-200 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
              <BookOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Active Notebook: <strong className="text-slate-700 font-bold">{activeNotebook?.name} ({activeNotebook?.sources?.length || 0})</strong></span>
              <span className="bg-blue-50 text-blue-700 border border-blue-100 font-bold px-1.5 py-0.5 rounded-full text-[9px]">
                {activeNotebook?.sources?.length || 0} sources
              </span>
            </span>
            <button
              id="btn-create-notebook"
              onClick={() => setIsCreatingNotebook(!isCreatingNotebook)}
              className="text-xs text-blue-600 hover:text-blue-500 font-semibold cursor-pointer flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          {isCreatingNotebook ? (
            <div className="flex gap-2 animate-fade-in">
              <input
                id="input-notebook-name"
                type="text"
                value={notebookNameInput}
                onChange={(e) => setNotebookNameInput(e.target.value)}
                placeholder="Enter notebook title..."
                className="flex-1 px-3 py-1.5 text-xs border border-slate-300 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateNotebook()}
              />
              <button
                id="btn-confirm-notebook"
                onClick={handleCreateNotebook}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Create
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <select
                id="select-notebook"
                value={currentNotebookId || ''}
                onChange={(e) => setCurrentNotebookId(e.target.value)}
                className="flex-1 bg-white border border-slate-200 text-xs font-semibold px-3 py-2 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-sm"
              >
                {notebooks.map(nb => (
                  <option key={nb.id} value={nb.id}>
                    {nb.name} ({nb.sources?.length || 0})
                  </option>
                ))}
              </select>
              {deletingNotebookId === activeNotebook.id ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleDeleteNotebook(activeNotebook.id, true)}
                    className="px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer shadow-sm animate-pulse"
                    title="Confirm deletion"
                  >
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setDeletingNotebookId(null)}
                    className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold border border-slate-200 rounded-lg transition-all cursor-pointer shadow-sm"
                    title="Cancel"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  id="btn-delete-notebook"
                  onClick={() => handleDeleteNotebook(activeNotebook.id, false)}
                  title="Delete current notebook"
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-200 rounded-lg cursor-pointer bg-white shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sources list controller */}
        <div className="p-3 border-b border-slate-100 bg-white flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              id="search-sources"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sources by title or content..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            id="btn-open-add-source"
            onClick={() => {
              resetAddSourceFields();
              setIsAddingSource(true);
            }}
            className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer flex items-center gap-1 shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* List of active sources */}
        <div id="sources-list" className="flex-1 overflow-y-auto p-2 space-y-1 select-scrollbar">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Research Sources ({activeNotebook?.sources.length || 0})
            </span>
          </div>

          {filteredSources.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs px-4">
              {searchQuery ? "No matching sources found." : "Your library is empty. Click the '+' button above to add copied articles, website links, or research files."}
            </div>
          ) : (
            filteredSources.map(source => {
              const isSelected = selectedSourceId === source.id && activePane === 'sources';
              return (
                <div
                  key={source.id}
                  onClick={() => {
                    setSelectedSourceId(source.id);
                    setActivePane('sources');
                  }}
                  className={`group p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-white border-slate-100 hover:border-slate-300 text-slate-700 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className={`p-1.5 rounded-lg ${
                      source.type === 'text' ? 'bg-blue-50 text-blue-600' :
                      source.type === 'url' ? 'bg-amber-50 text-amber-600' : 'bg-purple-50 text-purple-600'
                    }`}>
                      {source.type === 'text' && <FileText className="w-4 h-4" />}
                      {source.type === 'url' && <Link className="w-4 h-4" />}
                      {source.type === 'file' && <File className="w-4 h-4" />}
                    </span>
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-bold truncate pr-1">{source.title}</h4>
                      <p className="text-[10px] text-slate-400 truncate">
                        {source.type === 'url' ? source.url : source.fileName || `${Math.round(source.content.length / 4)} tokens`}
                      </p>
                    </div>
                  </div>
                  {deletingSourceId === source.id ? (
                    <div className="flex items-center gap-1 shrink-0 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDeleteSource(source.id, true)}
                        className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold rounded transition-all cursor-pointer shadow-xs animate-pulse"
                        title="Confirm Delete"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeletingSourceId(null)}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[9px] font-semibold border border-slate-200 rounded transition-all cursor-pointer shadow-xs"
                        title="Cancel"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSource(source.id, false);
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all cursor-pointer shrink-0 ml-1"
                      title="Delete source"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Drive Synchronization & Export footer */}
        <div className="p-3 border-t border-slate-200 bg-white space-y-2">
          <div className="flex justify-between items-center text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <Share2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Sync Library</span>
            </span>
            <span className={driveToken ? "text-emerald-600 font-semibold flex items-center gap-1" : "text-amber-600 font-semibold flex items-center gap-1"}>
              <span className={`w-1.5 h-1.5 rounded-full ${driveToken ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{driveToken ? "Connected" : "Local-only"}</span>
            </span>
          </div>

          {driveToken ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSyncToGoogleDrive('md')}
                disabled={isExporting}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[10px] font-bold text-slate-700 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {isExporting && exportType === 'md' ? <Loader className="w-3 h-3 animate-spin text-slate-500" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Markdown (.md)</span>
              </button>
              <button
                onClick={() => handleSyncToGoogleDrive('gdoc')}
                disabled={isExporting}
                className="w-full py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[10px] font-bold text-blue-700 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {isExporting && exportType === 'gdoc' ? <Loader className="w-3 h-3 animate-spin text-blue-500" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Google Doc</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <button
                onClick={onLoginRequest}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Connect Google Drive to Sync</span>
              </button>
              <button
                onClick={downloadMarkdownLocally}
                className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[10px] font-bold text-slate-700 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Download Markdown (.md) Locally</span>
              </button>
            </div>
          )}

          {exportSuccessUrl && (
            <div className="p-2 border border-emerald-200 bg-emerald-50 rounded-lg text-[11px] text-emerald-800 flex items-center justify-between gap-1 animate-fade-in">
              <span className="truncate">Saved to your Google Drive!</span>
              <a
                href={exportSuccessUrl}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-950 font-bold hover:underline flex items-center gap-0.5 shrink-0"
              >
                <span>Open File</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT DISPLAY COLUMN: AI Grounded Q&A Chat OR Source Content Details (Takes 8 cols) */}
      <div id="research-main-pane" className="xl:col-span-8 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-[500px] xl:h-full">
        
        {/* Workspace views tabs & Auto-save / Undo Status bar */}
        <div className="flex flex-col sm:flex-row border-b border-slate-200 bg-slate-50/70 shrink-0 justify-between items-stretch">
          <div className="flex flex-1 overflow-x-auto select-scrollbar">
            <button
              onClick={() => setActivePane('chat')}
              className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activePane === 'chat'
                  ? 'border-blue-600 text-blue-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>AI Research Assistant</span>
            </button>

            <button
              onClick={() => {
                if (activeNotebook?.sources.length > 0 && !selectedSourceId) {
                  setSelectedSourceId(activeNotebook.sources[0].id);
                }
                setActivePane('sources');
              }}
              className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activePane === 'sources'
                  ? 'border-blue-600 text-blue-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4 text-blue-500" />
              <span>Source Viewer {activeSource ? `(${activeSource.title.slice(0, 16)}...)` : ''}</span>
            </button>

            <button
              onClick={() => setActivePane('markdown')}
              className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activePane === 'markdown'
                  ? 'border-blue-600 text-blue-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileCode className="w-4 h-4 text-emerald-600" />
              <span>Single-File Markdown (.md)</span>
            </button>
          </div>

          {/* Auto-save & Undo controls in header */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50/80 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-200">
            {saveStatus === 'saving' ? (
              <span className="flex items-center gap-1.5 text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-2xs">
                <Loader className="w-3 h-3 animate-spin text-blue-600" />
                <span>Saving...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-2xs">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                <span>Auto-saved {lastSavedTime ? `at ${lastSavedTime}` : ''}</span>
              </span>
            )}

            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              title="Undo last change (Ctrl+Z)"
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold border border-slate-200 rounded-lg hover:bg-white text-slate-700 disabled:opacity-40 transition-all cursor-pointer bg-slate-100 shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Undo ({undoStack.length})</span>
            </button>
          </div>
        </div>

        {/* WORKSPACE VIEWS PANELS */}
        <div className="flex-1 overflow-hidden relative min-h-0 flex flex-col">
          
          {/* VIEW A: AI RESEARCH CHAT */}
          {activePane === 'chat' && (
            <div id="ai-chat-workspace" className="flex-1 flex flex-col h-full min-h-0">
              
              {/* Grounded items ribbon */}
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2 shrink-0 overflow-x-auto select-scrollbar">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                  Grounded Mind Index:
                </span>
                {activeNotebook.sources.length === 0 ? (
                  <span className="text-[10px] text-slate-500 italic">No sources added. Grounding chat will fall back to general knowledge.</span>
                ) : (
                  <div className="flex items-center gap-1.5 overflow-x-auto select-scrollbar pr-2 py-0.5">
                    {activeNotebook.sources.map(s => (
                      <span key={s.id} className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-600 font-medium shrink-0 flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="max-w-[120px] truncate">{s.title}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Chat conversations trail */}
              <div id="chat-messages-container" className="flex-1 overflow-y-auto p-4 space-y-4 select-scrollbar min-h-0">
                {chatHistory.map((turn, index) => {
                  const isUser = turn.role === 'user';
                  return (
                    <div
                      key={index}
                      className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 h-8 w-8 flex items-center justify-center font-bold text-xs ${
                        isUser ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {isUser ? 'ME' : 'AI'}
                      </div>
                      <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-2 ${
                        isUser 
                          ? 'bg-blue-600 border-blue-700 text-white rounded-tr-none shadow-sm' 
                          : 'bg-slate-50 border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                      }`}>
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{turn.text}</p>
                        ) : (
                          <div className="markdown-body prose max-w-none text-slate-800">
                            <Markdown>{turn.text}</Markdown>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isChatLoading && (
                  <div className="flex gap-3 max-w-3xl mr-auto">
                    <div className="p-1.5 rounded-lg shrink-0 h-8 w-8 flex items-center justify-center bg-purple-100 text-purple-700 font-bold text-xs animate-pulse">
                      AI
                    </div>
                    <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-slate-500 text-xs flex items-center gap-2 shadow-sm rounded-tl-none">
                      <Loader className="w-4 h-4 animate-spin text-purple-600" />
                      <span>Plothole is analyzing grounding documents and drafting answer...</span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Suggestions prompt ribbon */}
              {activeNotebook.sources.length > 0 && chatHistory.length === 1 && (
                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/20 shrink-0">
                  <div className="flex gap-2 overflow-x-auto select-scrollbar py-1">
                    <button
                      onClick={() => {
                        setChatMessage("Provide a summarized structural synthesis of all my uploaded sources.");
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-600 cursor-pointer shadow-sm shrink-0"
                    >
                      💡 Summarize Sources
                    </button>
                    <button
                      onClick={() => {
                        setChatMessage("Explain any relational dynamics or character connections mentioned across these documents.");
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-600 cursor-pointer shadow-sm shrink-0"
                    >
                      👥 Mapping Relational Links
                    </button>
                    <button
                      onClick={() => {
                        setChatMessage("Outline a worldbuilding guide or key timeline details from my research.");
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-600 cursor-pointer shadow-sm shrink-0"
                    >
                      🌍 Extract Worldbuilding Specs
                    </button>
                  </div>
                </div>
              )}

              {/* Message composer input bar */}
              <div className="p-3 border-t border-slate-200 bg-white shrink-0 flex gap-2">
                <textarea
                  id="chat-message-input"
                  rows={1}
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={activeNotebook.sources.length === 0 ? "Add sources first to chat with grounding..." : "Ask your grounded notes partner anything..."}
                  className="flex-1 px-4 py-2.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none max-h-24 select-scrollbar"
                />
                <button
                  id="btn-send-message"
                  onClick={handleSendMessage}
                  disabled={!chatMessage.trim() || isChatLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer flex items-center justify-center shrink-0 shadow-sm disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* VIEW B: SOURCE DOCUMENT VIEWER */}
          {activePane === 'sources' && (
            <div id="source-detail-pane" className="flex-1 overflow-y-auto p-6 space-y-6 select-scrollbar">
              {!activeSource ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center space-y-2 py-16">
                  <FileText className="w-12 h-12 text-slate-300 stroke-1" />
                  <div>
                    <h4 className="font-bold text-slate-600 text-sm">No Source Document Selected</h4>
                    <p className="text-slate-400 mt-1 max-w-sm">Select a source card from the sidebar list to inspect or edit its content details.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  
                  {/* Source metadata header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          activeSource.type === 'text' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          activeSource.type === 'url' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-purple-50 text-purple-700 border border-purple-100'
                        }`}>
                          {activeSource.type}
                        </span>
                        <span className="text-[11px] text-slate-400">Added: {new Date(activeSource.addedAt).toLocaleString()}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono font-semibold border border-slate-200" title="Deterministic Source Hash">
                          SHA: {activeSource.sha || getFastSourceSHA(activeSource)}
                        </span>
                      </div>

                      {isEditingActiveSource ? (
                        <input
                          type="text"
                          value={editTitleInput}
                          onChange={(e) => setEditTitleInput(e.target.value)}
                          className="mt-2 w-full text-base font-bold text-slate-800 border border-blue-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <h3 className="text-lg font-bold text-slate-800 mt-1.5">{activeSource.title}</h3>
                      )}

                      {activeSource.url && (
                        <a
                          href={activeSource.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1 font-medium"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{activeSource.url}</span>
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isEditingActiveSource ? (
                        <>
                          <button
                            onClick={handleSaveSourceEdits}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-sm"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Edits</span>
                          </button>
                          <button
                            onClick={() => setIsEditingActiveSource(false)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-all border border-slate-200"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setIsEditingActiveSource(true)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 bg-white cursor-pointer transition-all shadow-2xs"
                        >
                          <Edit className="w-3.5 h-3.5 text-slate-500" />
                          <span>Edit Source</span>
                        </button>
                      )}

                      {deletingSourceId === activeSource.id ? (
                        <div className="flex items-center gap-1.5 shrink-0 animate-fade-in">
                          <button
                            onClick={() => handleDeleteSource(activeSource.id, true)}
                            className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm animate-pulse"
                            title="Confirm Deletion"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeletingSourceId(null)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 rounded-lg transition-all cursor-pointer shadow-sm"
                            title="Cancel Deletion"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDeleteSource(activeSource.id, false)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold border border-red-200 hover:border-red-300 rounded-lg hover:bg-red-50 text-red-600 bg-white transition-all cursor-pointer shrink-0"
                          title="Delete this research source"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Key Takeaways Section */}
                  <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Key Takeaways</span>
                      </span>
                    </div>

                    {isEditingActiveSource ? (
                      <div className="space-y-2">
                        {editTakeawaysInput.map((pt, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={pt}
                              onChange={(e) => {
                                const next = [...editTakeawaysInput];
                                next[i] = e.target.value;
                                setEditTakeawaysInput(next);
                              }}
                              className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => {
                                setEditTakeawaysInput(editTakeawaysInput.filter((_, idx) => idx !== i));
                              }}
                              className="text-red-500 hover:text-red-700 text-xs font-bold px-1.5 py-1 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newTakeawayInput}
                            onChange={(e) => setNewTakeawayInput(e.target.value)}
                            placeholder="Add key takeaway bullet point..."
                            className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newTakeawayInput.trim()) {
                                setEditTakeawaysInput([...editTakeawaysInput, newTakeawayInput.trim()]);
                                setNewTakeawayInput('');
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              if (newTakeawayInput.trim()) {
                                setEditTakeawaysInput([...editTakeawaysInput, newTakeawayInput.trim()]);
                                setNewTakeawayInput('');
                              }
                            }}
                            className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    ) : (
                      <ul className="space-y-1 pl-4 list-disc text-xs text-slate-700 leading-relaxed">
                        {(activeSource.keyTakeaways && activeSource.keyTakeaways.length > 0
                          ? activeSource.keyTakeaways
                          : extractKeyTakeaways(activeSource)
                        ).map((takeaway, idx) => (
                          <li key={idx}>{takeaway}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Document Content View / Editor */}
                  <div className="space-y-2">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Full Content Notes
                    </span>
                    
                    {isEditingActiveSource ? (
                      <textarea
                        rows={10}
                        value={editContentInput}
                        onChange={(e) => setEditContentInput(e.target.value)}
                        className="w-full bg-white border border-blue-300 p-4 rounded-xl font-serif text-slate-800 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 select-scrollbar"
                      />
                    ) : activeSource.fileType?.startsWith('image/') ? (
                      <div className="space-y-4">
                        <div className="max-w-md mx-auto border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-slate-50">
                          <img
                            src={activeSource.content}
                            alt={activeSource.title}
                            referrerPolicy="no-referrer"
                            className="w-full max-h-96 object-contain"
                          />
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Image Description / Notes:</span>
                          <p className="text-xs text-slate-700 font-serif leading-relaxed">{activeSource.fileName || "Uploaded research image source file."}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl font-serif text-slate-800 text-sm leading-relaxed select-scrollbar whitespace-pre-wrap">
                        {activeSource.content}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}

          {/* VIEW C: SINGLE-FILE MARKDOWN (.md) */}
          {activePane === 'markdown' && (
            <div id="single-markdown-workspace" className="flex-1 overflow-y-auto p-6 space-y-4 select-scrollbar flex flex-col bg-slate-900 text-slate-100">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3 shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-emerald-400" />
                    <span>Single-File Markdown Notebook Export</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">All research notes formatted into a unified file with SHA tags for AI processing.</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(buildNotebookMarkdown());
                      setIsCopiedMd(true);
                      setTimeout(() => setIsCopiedMd(false), 3000);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                  >
                    {isCopiedMd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{isCopiedMd ? 'Copied!' : 'Copy Raw Markdown'}</span>
                  </button>

                  <button
                    onClick={downloadMarkdownLocally}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Download .md</span>
                  </button>
                </div>
              </div>

              {/* Raw Code Block / Rendered Output */}
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-5 overflow-y-auto font-mono text-xs text-emerald-300 leading-relaxed whitespace-pre-wrap select-scrollbar">
                {buildNotebookMarkdown()}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* FLOATING TOAST NOTICE FOR UNDO AND NOTIFICATIONS */}
      {toastNotice && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 text-xs border border-slate-700 animate-bounce-in">
          <span className="font-medium text-slate-200">{toastNotice.message}</span>
          {toastNotice.actionLabel && toastNotice.onAction && (
            <button
              onClick={toastNotice.onAction}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{toastNotice.actionLabel}</span>
            </button>
          )}
        </div>
      )}

      {/* OVERLAY: ADD SOURCE MODAL */}
      {isAddingSource && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-800">Add New Research Source</h3>
                <p className="text-xs text-slate-500">Inject raw material to grow your grounded AI mind library.</p>
              </div>
              <button
                onClick={() => {
                  resetAddSourceFields();
                  setIsAddingSource(false);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Source type tabs */}
            <div className="flex bg-slate-50 border-b border-slate-100 p-1 shrink-0">
              <button
                onClick={() => { setSourceType('text'); setFileDetails(null); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg cursor-pointer ${
                  sourceType === 'text' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Copied Text
              </button>
              <button
                onClick={() => { setSourceType('url'); setFileDetails(null); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg cursor-pointer ${
                  sourceType === 'url' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Website Link
              </button>
              <button
                onClick={() => { setSourceType('file'); setFileDetails(null); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg cursor-pointer ${
                  sourceType === 'file' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Research File
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto select-scrollbar flex-1">
              
              {/* Common Title input */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Source Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={sourceType === 'text' ? "e.g. Character Motivations Draft" : sourceType === 'url' ? "e.g. YouTube - Plot Structure Masterclass" : "Title of your uploaded file..."}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              {/* COPIED TEXT INPUTS */}
              {sourceType === 'text' && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Research Material / Text</label>
                  <textarea
                    rows={8}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Paste your outlines, lore notes, transcription segments or text clips here..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-serif leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
              )}

              {/* WEB LINK INPUTS */}
              {sourceType === 'url' && (
                <>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Source URL</label>
                    <input
                      type="url"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      placeholder="e.g. https://wikipedia.org/wiki/... or https://blogs.scientificamerican.com/..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                    {newUrl.trim() && activeNotebook.sources.some(s => s.url && s.url.trim().toLowerCase() === newUrl.trim().toLowerCase()) && (
                      <p className="text-[10px] text-amber-600 font-semibold mt-1 bg-amber-50 border border-amber-200 rounded px-2 py-1 animate-fade-in flex items-center gap-1">
                        ⚠️ This URL is already in your active notebook sources.
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Article Content or Study Notes (Optional)</label>
                    <textarea
                      rows={5}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Paste details of the article text or study notes here to ground the AI's answers directly in them..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </>
              )}

              {/* RESEARCH FILE INPUTS */}
              {sourceType === 'file' && (
                <div className="space-y-4">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      isDragging 
                        ? 'border-blue-500 bg-blue-50/50' 
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".txt,.md,.png,.jpg,.jpeg,.webp,.pdf,.doc,.docx"
                    />
                    <FileUp className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                    <p className="text-xs font-bold text-slate-700">Drag & Drop file here or click to browse</p>
                    <p className="text-[10px] text-slate-400 mt-1.5">Supports text (.txt, .md), documents (.pdf, .doc, .docx) or image references (.png, .jpg, .webp)</p>
                  </div>

                  {fileDetails && (
                    <div className="p-3 bg-blue-50/30 border border-blue-100 rounded-lg flex items-center justify-between text-xs animate-fade-in">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="p-1 bg-blue-100 text-blue-700 rounded">
                          {fileDetails.type.startsWith('image/') ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </span>
                        <div className="overflow-hidden">
                          <p className="font-bold text-slate-700 truncate">{fileDetails.name}</p>
                          <p className="text-[10px] text-slate-400">{(fileDetails.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      
                      {isParsingFile ? (
                        <span className="text-blue-600 font-semibold flex items-center gap-1.5 animate-pulse">
                          <Loader className="w-3.5 h-3.5 animate-spin" />
                          <span>Parsing...</span>
                        </span>
                      ) : parsingError ? (
                        <span className="text-red-600 font-semibold flex items-center gap-0.5">
                          <span>Error Parsing</span>
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Ready</span>
                        </span>
                      )}
                    </div>
                  )}

                  {parsingError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 animate-fade-in">
                      <p className="font-semibold">Parsing Error:</p>
                      <p className="text-[10px] mt-1">{parsingError}</p>
                    </div>
                  )}
                </div>
              )}

            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => {
                  resetAddSourceFields();
                  setIsAddingSource(false);
                }}
                className="px-4 py-2 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSource}
                disabled={isParsingFile}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>Add to Notebook</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
