import React, { useState } from 'react';
import { CharacterProfile } from '../types';
import { Target, Link2, Quote, Compass, Tag, Clipboard, MessageSquare, ShieldAlert, Sparkles, Star, Download, Image as ImageIcon, Upload, X, Eye, Plus, User, Globe, Check } from 'lucide-react';
import { jsPDF } from 'jspdf';
import Markdown from 'react-markdown';

interface CharacterDetailViewProps {
  character: CharacterProfile;
  allCharacters: CharacterProfile[];
  onSelectCharacter: (char: CharacterProfile) => void;
  onUpdateCharacter: (updatedChar: CharacterProfile, changeDetails: string) => void;
  images?: Record<string, string>;
  onAddImage?: (path: string, dataUrl: string) => void;
  onRemoveImage?: (path: string) => void;
}

export default function CharacterDetailView({
  character,
  allCharacters,
  onSelectCharacter,
  onUpdateCharacter,
  images = {},
  onAddImage = () => {},
  onRemoveImage = () => {},
}: CharacterDetailViewProps) {
  
  const [previewMarkdown, setPreviewMarkdown] = useState(true);

  // Wikipedia search states
  const [wikiSearchQuery, setWikiSearchQuery] = useState('');
  const [wikiResults, setWikiResults] = useState<any[]>([]);
  const [isSearchingWiki, setIsSearchingWiki] = useState(false);
  const [isEnrichingWiki, setIsEnrichingWiki] = useState(false);
  const [showWikiModal, setShowWikiModal] = useState(false);

  // AI Portrait generation states
  const [showPortraitModal, setShowPortraitModal] = useState(false);
  const [portraitPrompt, setPortraitPrompt] = useState('');
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false);
  const [generatedPortraitUrl, setGeneratedPortraitUrl] = useState<string | null>(null);
  const [portraitError, setPortraitError] = useState<string | null>(null);

  // Helper to format raw snake_case "irl_" fields for professional display
  const formatFieldLabel = (key: string) => {
    let cleanKey = key;
    if (key.startsWith('irl_')) {
      cleanKey = key.slice(4);
    }
    return cleanKey
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const handleWikipediaSearch = async () => {
    setIsSearchingWiki(true);
    setWikiResults([]);
    setShowWikiModal(true);
    const query = character.core.name;
    setWikiSearchQuery(query);
    
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.query && data.query.search) {
        setWikiResults(data.query.search);
      } else {
        setWikiResults([]);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to Wikipedia API.");
    } finally {
      setIsSearchingWiki(false);
    }
  };

  const handleWikiSelect = async (result: any) => {
    const pageTitle = result.title;
    const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`;
    
    setIsEnrichingWiki(true);
    
    // Fetch summary
    let summary = '';
    const summaryUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&redirects=1&titles=${encodeURIComponent(pageTitle)}&format=json&origin=*`;
    try {
      const res = await fetch(summaryUrl);
      const data = await res.json();
      const pages = data.query?.pages;
      if (pages) {
        const pageId = Object.keys(pages)[0];
        if (pageId && pages[pageId]) {
          summary = pages[pageId].extract || '';
        }
      }
    } catch (err) {
      console.error("Failed to get summary", err);
    }

    let enrichedFields: Record<string, string> = {};
    if (summary) {
      try {
        const enrichRes = await fetch('/api/wikipedia-enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterName: character.core.name,
            existingProfile: character,
            wikipediaSummary: summary,
          }),
        });
        const enrichData = await enrichRes.json();
        if (enrichData.success && enrichData.irl_fields) {
          enrichedFields = enrichData.irl_fields;
        }
      } catch (err) {
        console.error("Failed to enrich biographical details from Wikipedia summary", err);
      }
    }

    const updatedNotes = summary 
      ? (character.metadata.notes 
          ? `${character.metadata.notes}\n\n[Wikipedia Summary of ${pageTitle}]: ${summary}`
          : `[Wikipedia Summary of ${pageTitle}]: ${summary}`)
      : character.metadata.notes;

    const currentTags = character.metadata.tags || [];
    const updatedTags = currentTags.includes('irl') ? currentTags : [...currentTags, 'irl'];

    const updated: CharacterProfile = {
      ...character,
      custom_fields: {
        ...character.custom_fields,
        ...enrichedFields,
      },
      metadata: {
        ...character.metadata,
        is_real_person: true,
        wikipedia_url: pageUrl,
        wikipedia_title: pageTitle,
        notes: updatedNotes,
        tags: updatedTags
      }
    };

    onUpdateCharacter(updated, `Connected ${character.core.name} to Wikipedia article "${pageTitle}" and enriched profile with real-life facts`);
    setIsEnrichingWiki(false);
    setShowWikiModal(false);
  };

  // Handler to call the Gemini Imagen 3 image generation API
  const handleGeneratePortrait = async () => {
    setIsGeneratingPortrait(true);
    setPortraitError(null);
    setGeneratedPortraitUrl(null);

    try {
      const response = await fetch('/api/generate-portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: portraitPrompt,
          name: character.core.name,
          role: character.core.role,
          description: character.content.description
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate portrait image.');
      }

      setGeneratedPortraitUrl(data.dataUrl);
    } catch (err: any) {
      console.error(err);
      setPortraitError(err.message || 'An unexpected error occurred during portrait generation.');
    } finally {
      setIsGeneratingPortrait(false);
    }
  };

  // Handler to apply the generated image as the primary character portrait
  const handleApplyPortrait = () => {
    if (!generatedPortraitUrl) return;

    // Generate a safe unique filename/path
    const characterSlug = character.core.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const uniqueId = Math.random().toString(36).substring(2, 8);
    const imagePath = `images/${characterSlug}_portrait_${uniqueId}.jpg`;

    // Save the image dataUrl globally (adds to the Record<string, string> state in App.tsx)
    onAddImage(imagePath, generatedPortraitUrl);

    // Add to the front of character gallery (index 0 makes it the default portrait)
    const existingGallery = character.gallery || [];
    const updatedGallery = [imagePath, ...existingGallery];

    const updatedChar: CharacterProfile = {
      ...character,
      gallery: updatedGallery,
    };

    onUpdateCharacter(
      updatedChar, 
      `Generated AI portrait for ${character.core.name} using prompt: "${portraitPrompt}"`
    );

    setShowPortraitModal(false);
    setGeneratedPortraitUrl(null);
  };

  // Find related character details to check if clicking on them is possible
  const getRelatedCharacter = (name: string) => {
    return allCharacters.find(
      (c) => c.core.name.toLowerCase() === name.toLowerCase() || 
             (c.core.nickname && c.core.nickname.toLowerCase() === name.toLowerCase())
    );
  };

  // Status color helper for high fidelity design
  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'alive') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (s === 'dead') return 'bg-rose-50 text-rose-800 border-rose-200';
    if (s === 'missing') return 'bg-amber-50 text-amber-800 border-amber-200';
    if (s === 'non-biological') return 'bg-blue-50 text-blue-800 border-blue-200';
    if (s === 'undead') return 'bg-purple-50 text-purple-800 border-purple-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const initials = character.core.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || '??';

  const generatePdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    let y = 20;

    const checkPageOverflow = (increment: number) => {
      if (y + increment > 270) {
        // Draw bottom footer for current page
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Universal Character Extractor - Confidential Report', 15, 285);
        doc.text(`Page ${doc.getNumberOfPages()}`, 195, 285, { align: 'right' });

        doc.addPage();
        y = 20;
        
        // Draw top header for new page
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Character Dossier: ${character.core.name}`, 15, 12);
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.line(15, 14, 195, 14);
        y = 22;
      }
    };

    // 1. TOP HEADER DECORATION
    // Blue header bar
    doc.setFillColor(30, 41, 59); // slate-900
    doc.rect(15, y, 180, 42, 'F');

    // Badge
    doc.setFillColor(37, 99, 235); // blue-600
    doc.rect(22, y + 8, 14, 14, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    // Initials in badge
    doc.text(initials, 29, y + 17, { align: 'center' });

    // Character Name
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    const nameText = character.core.name + (character.core.nickname ? ` (alias "${character.core.nickname}")` : '');
    doc.text(nameText, 42, y + 15);

    // Character Role
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text(character.core.role || 'Unspecified Role', 42, y + 21);

    // Metadata Row inside Header Bar
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    
    // Species
    doc.text(`SPECIES: ${character.core.species.toUpperCase()}`, 42, y + 30);
    
    // Status
    doc.text(`STATUS: ${character.core.living_status.toUpperCase()}`, 105, y + 30);

    // First appearance
    if (character.metadata.first_appearance) {
      doc.text(`INTRODUCED: ${character.metadata.first_appearance.toUpperCase()}`, 105, y + 36);
    }

    y += 48;

    // 2. DOSSIER & DESCRIPTION (Times font for narrative)
    checkPageOverflow(25);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // slate-900
    doc.text('CHARACTER DOSSIER & DESCRIPTION', 15, y);
    
    doc.setDrawColor(37, 99, 235); // blue-600
    doc.setLineWidth(0.5);
    doc.line(15, y + 2, 195, y + 2);
    y += 8;

    // Split and wrap narrative description
    doc.setFont('Times', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105); // slate-600
    const descLines = doc.splitTextToSize(character.content.description, 180);
    descLines.forEach((line: string) => {
      checkPageOverflow(6);
      doc.text(line, 15, y);
      y += 6;
    });
    y += 4;

    // 3. DYNAMIC ATTRIBUTES & WORLD CONTEXT
    if (character.custom_fields && Object.keys(character.custom_fields).length > 0) {
      checkPageOverflow(25);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59); // slate-900
      doc.text('DYNAMIC ATTRIBUTES & WORLD CONTEXT', 15, y);
      
      doc.setDrawColor(37, 99, 235);
      doc.line(15, y + 2, 195, y + 2);
      y += 8;

      Object.entries(character.custom_fields).forEach(([key, value]) => {
        if (!value) return;
        
        // Wrap custom field value if it's long
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139); // slate-500
        const label = `${key.toUpperCase()}:`;
        
        doc.setFont('Times', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        
        const valueLines = doc.splitTextToSize(value, 135);
        
        // Check overflow for label + first line
        checkPageOverflow(6);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(label, 15, y);
        
        doc.setFont('Times', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        
        valueLines.forEach((valLine: string, index: number) => {
          if (index > 0) {
            checkPageOverflow(6);
          }
          doc.text(valLine, 60, y);
          y += 6;
        });
        y += 2; // small gap
      });
      y += 4;
    }

    // 4. CORE GOALS & MOTIVATIONS
    if (character.content.goals && character.content.goals.length > 0) {
      checkPageOverflow(25);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text('CORE GOALS & MOTIVATIONS', 15, y);
      
      doc.setDrawColor(37, 99, 235);
      doc.line(15, y + 2, 195, y + 2);
      y += 8;

      character.content.goals.forEach((goal, i) => {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(37, 99, 235);
        const bullet = `${i + 1}.`;
        
        doc.setFont('Times', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        
        const goalLines = doc.splitTextToSize(goal, 170);
        
        checkPageOverflow(6);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(37, 99, 235);
        doc.text(bullet, 15, y);
        
        doc.setFont('Times', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        
        goalLines.forEach((line: string, index: number) => {
          if (index > 0) {
            checkPageOverflow(6);
          }
          doc.text(line, 22, y);
          y += 6;
        });
        y += 2;
      });
      y += 4;
    }

    // 5. INTERCONNECTED RELATIONSHIPS
    if (character.content.relationships && character.content.relationships.length > 0) {
      checkPageOverflow(25);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text('INTERCONNECTED RELATIONSHIPS', 15, y);
      
      doc.setDrawColor(37, 99, 235);
      doc.line(15, y + 2, 195, y + 2);
      y += 8;

      character.content.relationships.forEach((rel) => {
        checkPageOverflow(10);
        
        // Draw a subtle border or indentation line
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.2);
        doc.line(15, y - 1, 195, y - 1);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(rel.name, 15, y + 4);

        doc.setFont('Times', 'italic');
        doc.setFontSize(11);
        doc.setTextColor(71, 85, 105);
        doc.text(rel.relation, 75, y + 4);

        y += 8;
      });
      y += 4;
    }

    // 6. NOTABLE QUOTES & SPEECH
    if (character.content.quotes && character.content.quotes.length > 0) {
      checkPageOverflow(25);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text('NOTABLE QUOTES & SPEECH', 15, y);
      
      doc.setDrawColor(37, 99, 235);
      doc.line(15, y + 2, 195, y + 2);
      y += 8;

      character.content.quotes.forEach((quote) => {
        const quoteLines = doc.splitTextToSize(`"${quote}"`, 170);
        const quoteHeight = (quoteLines.length * 5.5) + 6;
        
        checkPageOverflow(quoteHeight);
        
        // Draw quote box left highlight line
        doc.setDrawColor(37, 99, 235); // blue-600
        doc.setLineWidth(0.8);
        doc.line(17, y, 17, y + (quoteLines.length * 5.5));

        doc.setFont('Times', 'italic');
        doc.setFontSize(11);
        doc.setTextColor(51, 65, 85); // slate-700
        
        quoteLines.forEach((line: string) => {
          doc.text(line, 22, y + 3.5);
          y += 5.5;
        });
        y += 6;
      });
      y += 4;
    }

    // 7. ANALYTICAL NOTES
    if (character.metadata.notes || (character.metadata.tags && character.metadata.tags.length > 0)) {
      checkPageOverflow(25);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text('METADATA & NOTES', 15, y);
      
      doc.setDrawColor(37, 99, 235);
      doc.line(15, y + 2, 195, y + 2);
      y += 8;

      if (character.metadata.tags && character.metadata.tags.length > 0) {
        checkPageOverflow(8);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('TAGS:', 15, y);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        const tagsString = character.metadata.tags.map(t => `#${t}`).join(', ');
        doc.text(tagsString, 30, y);
        y += 8;
      }

      if (character.metadata.notes) {
        checkPageOverflow(15);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('ANALYTICAL NOTES:', 15, y);
        y += 5;

        doc.setFont('Times', 'normal');
        doc.setFontSize(10.5);
        doc.setTextColor(51, 65, 85);
        const notesLines = doc.splitTextToSize(character.metadata.notes, 180);
        notesLines.forEach((line: string) => {
          checkPageOverflow(5.5);
          doc.text(line, 15, y);
          y += 5.5;
        });
      }
    }

    // DRAW FOOTER ON LAST PAGE
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Universal Character Extractor - Confidential Report', 15, 285);
    doc.text(`Page ${doc.getNumberOfPages()}`, 195, 285, { align: 'right' });

    // Save PDF file
    const safeName = character.core.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    doc.save(`dossier_${safeName}.pdf`);
  };

  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState<{ url: string; path: string } | null>(null);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDragOverUpload, setIsDragOverUpload] = useState(false);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index || !character.gallery) return;
    
    const newGallery = [...character.gallery];
    const [draggedItem] = newGallery.splice(draggedIndex, 1);
    newGallery.splice(index, 0, draggedItem);
    
    const updatedChar: CharacterProfile = {
      ...character,
      gallery: newGallery,
    };
    onUpdateCharacter(updatedChar, `Reordered ${character.core.name}'s visual gallery`);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDragOverUpload = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverUpload(true);
  };

  const handleDragLeaveUpload = () => {
    setIsDragOverUpload(false);
  };

  const handleDropUpload = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverUpload(false);
    
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    // Check if the file is a .heic image
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    if (fileExt === 'heic' || file.type === 'image/heic') {
      alert("HEIC image format is not supported. Please upload a standard image format (e.g. PNG, JPG, WEBP, GIF).");
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      alert("Only image files are accepted for the visual gallery.");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && typeof event.target.result === 'string') {
        const dataUrl = event.target.result;
        
        const characterSlug = character.core.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        const uniqueId = Math.random().toString(36).substring(2, 8);
        const imagePath = `images/${characterSlug}_${uniqueId}.${fileExt}`;
        
        onAddImage(imagePath, dataUrl);
        
        const updatedGallery = [...(character.gallery || []), imagePath];
        const updatedChar: CharacterProfile = {
          ...character,
          gallery: updatedGallery,
        };
        
        onUpdateCharacter(updatedChar, `Added photo to ${character.core.name}'s gallery: ${imagePath}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    // Check if the file is a .heic image
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    if (fileExt === 'heic' || file.type === 'image/heic') {
      alert("HEIC image format is not supported. Please upload a standard image format (e.g. PNG, JPG, WEBP, GIF).");
      e.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && typeof event.target.result === 'string') {
        const dataUrl = event.target.result;
        
        // Generate a safe unique filename/path
        const characterSlug = character.core.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        const uniqueId = Math.random().toString(36).substring(2, 8);
        const imagePath = `images/${characterSlug}_${uniqueId}.${fileExt}`;
        
        // Save the image dataUrl globally
        onAddImage(imagePath, dataUrl);
        
        // Add image to character gallery
        const updatedGallery = [...(character.gallery || []), imagePath];
        const updatedChar: CharacterProfile = {
          ...character,
          gallery: updatedGallery,
        };
        
        onUpdateCharacter(updatedChar, `Added photo to ${character.core.name}'s gallery: ${imagePath}`);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhoto = (imagePath: string) => {
    if (!character.gallery) return;
    const updatedGallery = character.gallery.filter((path) => path !== imagePath);
    const updatedChar: CharacterProfile = {
      ...character,
      gallery: updatedGallery,
    };
    
    onRemoveImage(imagePath);
    onUpdateCharacter(updatedChar, `Removed photo from ${character.core.name}'s gallery: ${imagePath}`);
  };

  // Editor states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(character.core.name);
  const [editNickname, setEditNickname] = useState(character.core.nickname || '');
  const [editRole, setEditRole] = useState(character.core.role);
  const [editSpecies, setEditSpecies] = useState(character.core.species);
  const [editLivingStatus, setEditLivingStatus] = useState(character.core.living_status);
  const [editDescription, setEditDescription] = useState(character.content.description);
  
  // Custom Fields
  const [editCustomFields, setEditCustomFields] = useState<[string, string][]>(
    Object.entries(character.custom_fields || {})
  );
  
  // Goals
  const [editGoals, setEditGoals] = useState<string[]>(character.content.goals || []);
  
  // Quotes
  const [editQuotes, setEditQuotes] = useState<string[]>(character.content.quotes || []);
  
  // Relationships
  const [editRelationships, setEditRelationships] = useState<{name: string, relation: string}[]>(
    character.content.relationships || []
  );
  
  // Metadata
  const [editFirstAppearance, setEditFirstAppearance] = useState(character.metadata.first_appearance || '');
  const [editNotes, setEditNotes] = useState(character.metadata.notes || '');
  const [editTags, setEditTags] = useState(character.metadata.tags.join(', '));

  React.useEffect(() => {
    setIsEditing(false);
    setEditName(character.core.name);
    setEditNickname(character.core.nickname || '');
    setEditRole(character.core.role);
    setEditSpecies(character.core.species);
    setEditLivingStatus(character.core.living_status);
    setEditDescription(character.content.description);
    setEditCustomFields(Object.entries(character.custom_fields || {}));
    setEditGoals(character.content.goals || []);
    setEditQuotes(character.content.quotes || []);
    setEditRelationships(character.content.relationships || []);
    setEditFirstAppearance(character.metadata.first_appearance || '');
    setEditNotes(character.metadata.notes || '');
    setEditTags(character.metadata.tags.join(', '));

    // Preset the custom portrait prompt based on the character's unique parameters
    const standardPrompt = `A high-quality, professional, beautiful character portrait of ${character.core.name}, who is a ${character.core.role}. Style: detailed digital art, cinematic lighting, 1:1 ratio. Details: ${character.content.description.slice(0, 400)}`;
    setPortraitPrompt(standardPrompt);
    setGeneratedPortraitUrl(null);
    setPortraitError(null);
  }, [character]);

  const handleSave = () => {
    const customFieldsObj: Record<string, string> = {};
    editCustomFields.forEach(([k, v]) => {
      if (k.trim()) {
        customFieldsObj[k.trim()] = v;
      }
    });

    const tagsArr = editTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const updated: CharacterProfile = {
      core: {
        name: editName.trim(),
        nickname: editNickname.trim() || null,
        role: editRole.trim(),
        species: editSpecies.trim(),
        living_status: editLivingStatus,
      },
      content: {
        description: editDescription.trim(),
        goals: editGoals.map((g) => g.trim()).filter((g) => g.length > 0),
        relationships: editRelationships.map((r) => ({
          name: r.name.trim(),
          relation: r.relation.trim(),
        })).filter((r) => r.name.length > 0),
        quotes: editQuotes.map((q) => q.trim()).filter((q) => q.length > 0),
      },
      custom_fields: customFieldsObj,
      metadata: {
        first_appearance: editFirstAppearance.trim() || null,
        tags: tagsArr,
        notes: editNotes.trim() || null,
      },
    };

    const changes: string[] = [];
    if (character.core.name !== updated.core.name) changes.push(`Name: "${character.core.name}" ➔ "${updated.core.name}"`);
    if (character.core.role !== updated.core.role) changes.push(`Role: "${character.core.role}" ➔ "${updated.core.role}"`);
    if (character.core.living_status !== updated.core.living_status) changes.push(`Status: "${character.core.living_status}" ➔ "${updated.core.living_status}"`);
    if (character.content.description !== updated.content.description) changes.push(`Description updated`);
    
    const changeDetails = changes.length > 0 
      ? `Edited ${character.core.name} (${changes.join(', ')})`
      : `Updated parameters for ${character.core.name}`;

    onUpdateCharacter(updated, changeDetails);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-fade-in" id="character-editor-view">
        {/* Editor Header */}
        <div className="bg-slate-900 text-slate-100 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold font-serif">Edit Character Profile</h2>
            <p className="text-xs text-slate-400 mt-1">Refine dossier parameters & synchronize with the system blueprint</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg border border-blue-500 shadow transition-all cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </div>

        {/* Editor Form Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto select-scrollbar text-sm">
          
          {/* Section 1: Core Parameters */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest border-b border-blue-50 pb-2">
              1. Core Parameters
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30 text-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Alias / Nickname</label>
                <input
                  type="text"
                  placeholder="e.g. Shadow-cat (Optional)"
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Role / Occupation</label>
                <input
                  type="text"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Species / Nature</label>
                <input
                  type="text"
                  value={editSpecies}
                  onChange={(e) => setEditSpecies(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Living Status</label>
                <select
                  value={editLivingStatus}
                  onChange={(e) => setEditLivingStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30 text-slate-800"
                >
                  <option value="Alive">Alive</option>
                  <option value="Dead">Dead</option>
                  <option value="Missing">Missing</option>
                  <option value="Unknown">Unknown</option>
                  <option value="Undead">Undead</option>
                  <option value="Non-biological">Non-biological</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">First Appearance</label>
                <input
                  type="text"
                  placeholder="e.g. Chapter 4 (Optional)"
                  value={editFirstAppearance}
                  onChange={(e) => setEditFirstAppearance(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30 text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Narrative Biography */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest border-b border-blue-50 pb-2">
              2. Narrative Biography
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Dossier Biography & Description</label>
              <textarea
                rows={4}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30 text-slate-800 font-serif text-sm leading-relaxed"
              />
            </div>
          </div>

          {/* Section 3: Dynamic World Context (Key Value Pairs) */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-blue-50 pb-2">
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                3. Dynamic Attributes & Custom Context
              </h3>
              <button
                type="button"
                onClick={() => setEditCustomFields([...editCustomFields, ['', '']])}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                + Add Attribute
              </button>
            </div>
            
            {editCustomFields.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No custom fields added yet. Add custom world metrics above.</p>
            ) : (
              <div className="space-y-2">
                {editCustomFields.map(([k, v], idx) => {
                  const isIrl = k.startsWith('irl_');
                  return (
                    <div key={idx} className="flex gap-2 items-center animate-fade-in">
                      <input
                        type="text"
                        placeholder="Attribute Name (e.g. Affiliation)"
                        value={k}
                        onChange={(e) => {
                          const next = [...editCustomFields];
                          next[idx][0] = e.target.value;
                          setEditCustomFields(next);
                        }}
                        className={`w-1/3 p-2 border rounded-lg font-mono text-xs ${
                          isIrl ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                      <input
                        type="text"
                        placeholder="Attribute Value"
                        value={v}
                        onChange={(e) => {
                          const next = [...editCustomFields];
                          next[idx][1] = e.target.value;
                          setEditCustomFields(next);
                        }}
                        className={`flex-1 p-2 border rounded-lg text-xs ${
                          isIrl ? 'bg-emerald-50/20 border-emerald-200 text-emerald-950 font-medium' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                      {isIrl && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold font-mono uppercase shrink-0">
                          IRL
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const next = editCustomFields.filter((_, i) => i !== idx);
                          setEditCustomFields(next);
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 text-xs font-semibold cursor-pointer shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 4: Goals and Objectives */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-blue-50 pb-2">
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                4. Goals & Motivations
              </h3>
              <button
                type="button"
                onClick={() => setEditGoals([...editGoals, ''])}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                + Add Goal
              </button>
            </div>
            
            {editGoals.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No goals added yet.</p>
            ) : (
              <div className="space-y-2">
                {editGoals.map((goal, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <span className="text-xs font-semibold text-slate-400 font-mono">#{idx+1}</span>
                    <input
                      type="text"
                      placeholder="Goal description..."
                      value={goal}
                      onChange={(e) => {
                        const next = [...editGoals];
                        next[idx] = e.target.value;
                        setEditGoals(next);
                      }}
                      className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = editGoals.filter((_, i) => i !== idx);
                        setEditGoals(next);
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1 text-xs font-semibold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: Interconnected Relationships */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-blue-50 pb-2">
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                5. Interconnected Relationships
              </h3>
              <button
                type="button"
                onClick={() => setEditRelationships([...editRelationships, {name: '', relation: ''}])}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                + Add Relationship
              </button>
            </div>
            
            {editRelationships.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No relationships mapped yet.</p>
            ) : (
              <div className="space-y-2">
                {editRelationships.map((rel, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Character Name"
                      value={rel.name}
                      onChange={(e) => {
                        const next = [...editRelationships];
                        next[idx] = { ...next[idx], name: e.target.value };
                        setEditRelationships(next);
                      }}
                      className="w-1/3 p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-semibold"
                    />
                    <input
                      type="text"
                      placeholder="Relationship Details (e.g. Loyal commander)"
                      value={rel.relation}
                      onChange={(e) => {
                        const next = [...editRelationships];
                        next[idx] = { ...next[idx], relation: e.target.value };
                        setEditRelationships(next);
                      }}
                      className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = editRelationships.filter((_, i) => i !== idx);
                        setEditRelationships(next);
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1 text-xs font-semibold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 6: Notable Quotes */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-blue-50 pb-2">
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                6. Notable Quotes & Speech
              </h3>
              <button
                type="button"
                onClick={() => setEditQuotes([...editQuotes, ''])}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                + Add Quote
              </button>
            </div>
            
            {editQuotes.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No quotes added yet.</p>
            ) : (
              <div className="space-y-2">
                {editQuotes.map((quote, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <span className="text-xs font-semibold text-slate-400 font-mono mt-2">"</span>
                    <textarea
                      rows={2}
                      placeholder="Quote content..."
                      value={quote}
                      onChange={(e) => {
                        const next = [...editQuotes];
                        next[idx] = e.target.value;
                        setEditQuotes(next);
                      }}
                      className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-serif italic"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = editQuotes.filter((_, i) => i !== idx);
                        setEditQuotes(next);
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1 text-xs font-semibold mt-1 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 7: Metadata, Tags & Notes */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest border-b border-blue-50 pb-2">
              7. Metadata & Analytical Notes
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tags (Comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. protagonist, scholar, noble"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30 text-slate-800 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Analytical Notes</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30 text-slate-800 font-serif text-xs"
                />
              </div>
            </div>
          </div>
          
        </div>

        {/* Editor Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-end gap-3">
          <button
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg border border-blue-500 shadow transition-all cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-fade-in" id="character-detail-view">
      {/* Profile Header Block */}
      <div className="bg-slate-900 text-slate-100 p-6 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-[0.03] pointer-events-none translate-x-10 translate-y-10">
          <BookOverlay />
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10 w-full">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 flex-1 min-w-0 w-full md:w-auto">
            {/* Large Initials Emblem or Profile Photo */}
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-blue-600 text-white font-bold flex items-center justify-center text-xl shrink-0 border border-blue-400 shadow-md">
              {character.gallery && character.gallery.length > 0 && images[character.gallery[0]] ? (
                <img
                  src={images[character.gallery[0]]}
                  alt={character.core.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                initials
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl font-serif font-semibold tracking-tight text-white">
                  {character.core.name}
                </h2>
                {character.core.nickname && (
                  <span className="text-blue-300 font-serif italic text-base">
                    (alias "{character.core.nickname}")
                  </span>
                )}
              </div>

              <p className="text-slate-300 text-sm font-medium mt-0.5">
                {character.core.role}
              </p>

              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  {character.core.species}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border ${getStatusStyle(character.core.living_status)}`}>
                  {character.core.living_status}
                </span>
                {character.metadata.first_appearance && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-normal bg-slate-800 text-slate-400 border border-slate-700/60 font-serif">
                    Introduced: {character.metadata.first_appearance}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 self-stretch md:self-auto">
            {/* AI Portrait Generation Button */}
            <button
              onClick={() => setShowPortraitModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 border border-indigo-500 shadow transition-all duration-200 shrink-0 justify-center cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>AI Portrait</span>
            </button>

            {/* Edit Character Button */}
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-2 border border-slate-700 shadow transition-all duration-200 shrink-0 justify-center cursor-pointer"
            >
              <Clipboard className="w-4 h-4 text-blue-400" />
              <span>Edit Dossier</span>
            </button>

            {/* Download Dossier PDF Button */}
            <button
              onClick={generatePdf}
              id="download-dossier-pdf-btn"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 border border-blue-400 shadow transition-all duration-200 shrink-0 justify-center cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Dossier Content */}
      <div className="p-6 space-y-6">
        {/* Description & Narrative */}
        <div className="space-y-2">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              Character Dossier & Description
            </h3>
            <button
              onClick={() => setPreviewMarkdown(!previewMarkdown)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-all cursor-pointer ${
                previewMarkdown
                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
              title="Toggle Markdown Preview mode"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{previewMarkdown ? 'Markdown Preview' : 'Plain Text'}</span>
            </button>
          </div>
          {previewMarkdown ? (
            <div className="text-slate-700 leading-relaxed text-sm font-serif antialiased bg-slate-50/30 p-4 rounded-lg border border-slate-100 italic space-y-3 animate-fade-in">
              <Markdown
                components={{
                  p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="mb-1 leading-relaxed">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  h1: ({ children }) => <h1 className="text-lg font-bold text-slate-900 mt-4 mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-bold text-slate-900 mt-3 mb-1.5">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-bold text-slate-900 mt-2 mb-1">{children}</h3>,
                }}
              >
                {character.content.description}
              </Markdown>
            </div>
          ) : (
            <p className="text-slate-700 leading-relaxed text-sm font-serif antialiased first-letter:text-3xl first-letter:font-bold first-letter:mr-1 first-letter:float-left first-letter:text-slate-900 bg-slate-50/30 p-4 rounded-lg border border-slate-100 italic animate-fade-in">
              {character.content.description}
            </p>
          )}
        </div>

        {/* Custom Fields Grid (Dynamic Details extracted from manuscript) */}
        {(() => {
          const customFieldsEntries = Object.entries(character.custom_fields || {});
          const fictionalFields = customFieldsEntries.filter(([key]) => !key.startsWith('irl_'));
          const irlFields = customFieldsEntries.filter(([key]) => key.startsWith('irl_'));
          
          return (
            <>
              {fictionalFields.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <Star className="w-3.5 h-3.5 text-blue-600" />
                    Dynamic Attributes & World Context
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3" id="custom-fields-grid">
                    {fictionalFields.map(([key, value]) => (
                      <div key={key} className="p-3 bg-slate-50 border border-slate-200/60 rounded-lg flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                          {key}
                        </span>
                        <span className="text-sm text-slate-800 mt-1 font-serif font-medium">
                          {value || 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {irlFields.length > 0 && (
                <div className="space-y-3 p-4 bg-emerald-50/20 border border-emerald-100/60 rounded-xl animate-fade-in" id="irl-wikipedia-details-container">
                  <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-1.5 border-b border-emerald-100 pb-2">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    Real-Life Details & Biographical Facts (Wikipedia IRL)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3" id="irl-fields-grid">
                    {irlFields.map(([key, value]) => (
                      <div key={key} className="p-3 bg-white border border-emerald-100/60 hover:border-emerald-200 rounded-lg flex flex-col justify-between shadow-xs transition-all">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider font-mono flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          {formatFieldLabel(key)}
                        </span>
                        <span className="text-sm text-slate-800 mt-1 font-serif font-medium">
                          {value || 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* Goals & Objectives */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Target className="w-3.5 h-3.5 text-blue-600" />
            Core Goals & Motivations
          </h3>
          {character.content.goals && character.content.goals.length > 0 ? (
            <ul className="space-y-2">
              {character.content.goals.map((goal, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700 font-serif">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-blue-50 border border-blue-200 text-blue-700 shrink-0 font-sans text-[11px] font-semibold mt-0.5">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 leading-tight">{goal}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs italic text-slate-400">No specific goals identified in this manuscript.</p>
          )}
        </div>

        {/* Interconnected Relationships Network */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Link2 className="w-3.5 h-3.5 text-blue-600" />
            Interconnected Relationships
          </h3>
          {character.content.relationships && character.content.relationships.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {character.content.relationships.map((rel, i) => {
                const targetChar = getRelatedCharacter(rel.name);
                return (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border flex items-center justify-between text-sm transition-all ${
                      targetChar
                        ? 'bg-blue-50/20 border-blue-100 hover:border-blue-300 cursor-pointer'
                        : 'bg-slate-50/50 border-slate-200'
                    }`}
                    onClick={() => targetChar && onSelectCharacter(targetChar)}
                    title={targetChar ? `View profile for ${targetChar.core.name}` : undefined}
                  >
                    <div className="min-w-0">
                      <span className={`font-semibold text-slate-900 block truncate ${targetChar ? 'hover:text-blue-900' : ''}`}>
                        {rel.name}
                      </span>
                      <span className="text-xs text-slate-500 font-serif italic mt-0.5 block truncate">
                        {rel.relation}
                      </span>
                    </div>
                    {targetChar && (
                      <span className="inline-block text-[10px] font-semibold uppercase bg-blue-100/60 text-blue-900 border border-blue-200 px-1.5 py-0.5 rounded tracking-wide shrink-0 font-mono scale-90">
                        Link
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs italic text-slate-400">No relationships documented in the text.</p>
          )}
        </div>

        {/* Quotes Block */}
        {character.content.quotes && character.content.quotes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Quote className="w-3.5 h-3.5 text-blue-600" />
              Notable Quotes & Speech
            </h3>
            <div className="space-y-3">
              {character.content.quotes.map((quote, i) => (
                <blockquote
                  key={i}
                  className="pl-4 py-1 border-l-2 border-blue-500 italic text-slate-700 text-sm font-serif leading-relaxed bg-slate-50/40 p-2.5 rounded-r"
                >
                  "{quote}"
                </blockquote>
              ))}
            </div>
          </div>
        )}

        {/* Visual Photo Gallery */}
        <div className="space-y-3 pt-2 border-t border-slate-100" id="character-visual-gallery">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
            Character Visual Gallery
          </h3>
          
          <div className="flex flex-wrap gap-3.5 items-start">
            {character.gallery && character.gallery.map((imagePath, index) => {
              const dataUrl = images[imagePath];
              if (!dataUrl) return null;
              return (
                <div
                  key={imagePath}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex flex-col items-center transition-all duration-200 ${
                    draggedIndex === index ? 'opacity-40 scale-95 border-blue-400' : ''
                  }`}
                >
                  <div
                    className="group relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50 flex items-center justify-center cursor-move select-none"
                    title="Drag to reorder, click to view"
                  >
                    <img
                      src={dataUrl}
                      alt={`${character.core.name} visual`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                      onClick={() => setLightboxImage({ url: dataUrl, path: imagePath })}
                    />
                    
                    {/* Action overlays */}
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setLightboxImage({ url: dataUrl, path: imagePath })}
                        className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors cursor-pointer"
                        title="View Photo"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(imagePath)}
                        className="p-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer"
                        title="Remove Photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Display Image URL/Path */}
                  <div className="w-24 sm:w-28 mt-1.5 px-1 bg-slate-50 border border-slate-200 rounded flex items-center justify-between gap-1 max-w-full">
                    <span className="font-mono text-[9px] text-slate-500 truncate select-all flex-1" title={imagePath}>
                      {imagePath.split('/').pop()}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(imagePath);
                        alert(`File path copied: ${imagePath}`);
                      }}
                      className="text-[9px] text-slate-400 hover:text-slate-700 font-sans cursor-pointer shrink-0"
                      title={`Copy path: ${imagePath}`}
                    >
                      <Clipboard className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            
            {/* Upload New Photo Card */}
            <label
              onDragOver={handleDragOverUpload}
              onDragLeave={handleDragLeaveUpload}
              onDrop={handleDropUpload}
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-xl border border-dashed transition-all flex flex-col items-center justify-center gap-1 cursor-pointer group text-center px-1.5 ${
                isDragOverUpload
                  ? 'border-blue-500 bg-blue-50/40 text-blue-600 scale-105 shadow-md'
                  : 'border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/20'
              }`}
            >
              <Upload className={`w-5 h-5 transition-colors ${isDragOverUpload ? 'text-blue-600 scale-110' : 'text-slate-400 group-hover:text-blue-500'}`} />
              <span className={`text-[10px] font-semibold transition-colors ${isDragOverUpload ? 'text-blue-600 font-bold' : 'text-slate-500 group-hover:text-blue-600'}`}>
                {isDragOverUpload ? 'Drop Here' : 'Add Photo'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>
          
          {(!character.gallery || character.gallery.length === 0) && (
            <p className="text-xs italic text-slate-400 mt-1">
              No photos uploaded to this character's gallery. Add photos to display visual profiles in the dossier.
            </p>
          )}
        </div>

        {/* Section: Real Person & Wikipedia Search */}
        <div className="p-4 bg-slate-50 border border-slate-200/65 rounded-xl space-y-3 pt-4 border-t border-slate-100" id="wikipedia-section">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Real-life Person Status</h4>
                <p className="text-[11px] text-slate-500 font-medium leading-normal">Mark if this character is a historical or living person, then query their details on Wikipedia.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const isReal = !character.metadata.is_real_person;
                const updated: CharacterProfile = {
                  ...character,
                  metadata: {
                    ...character.metadata,
                    is_real_person: isReal,
                  },
                };
                onUpdateCharacter(
                  updated,
                  `Marked ${character.core.name} as ${isReal ? 'Real-life Person' : 'Fictional Character'}`
                );
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
                character.metadata.is_real_person
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {character.metadata.is_real_person ? '✓ Marked as Real Person' : 'Mark as Real Person'}
            </button>
          </div>

          {character.metadata.is_real_person && (
            <div className="border-t border-slate-200/60 pt-3 flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleWikipediaSearch}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Search Wikipedia for "{character.core.name}"</span>
                </button>

                {character.metadata.wikipedia_url && (
                  <a
                    href={character.metadata.wikipedia_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <Globe className="w-3.5 h-3.5 text-blue-500" />
                    <span>View Connected Wikipedia Article</span>
                  </a>
                )}
              </div>

              {character.metadata.wikipedia_title && (
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1 text-slate-700">
                  <div className="flex items-center gap-1 text-slate-500 font-bold uppercase tracking-wide text-[10px] font-mono">
                    <Globe className="w-3 h-3 text-blue-500" />
                    <span>CONNECTED ARTICLE</span>
                  </div>
                  <p className="text-slate-800 font-serif italic text-sm">"{character.metadata.wikipedia_title}"</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tag Cloud & Descriptive Attributes */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
            <span className="text-xs font-semibold text-slate-400 mr-2 uppercase tracking-wide">Tags:</span>
            {character.metadata.tags.map((tag, i) => (
              <span
                key={i}
                className="inline-block text-xs bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded border border-slate-200/40 hover:bg-slate-200/50 cursor-default transition-colors"
              >
                #{tag}
              </span>
            ))}
          </div>
          {character.metadata.notes && (
            <div className="mt-3 p-3 bg-blue-50/20 border border-blue-100/40 rounded-lg text-xs text-slate-600 font-serif leading-relaxed">
              <span className="font-bold text-slate-700 block mb-1">Analytical Notes:</span>
              {previewMarkdown ? (
                <div className="markdown-body space-y-2 mt-1 animate-fade-in">
                  <Markdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                      li: ({ children }) => <li className="mb-0.5 leading-relaxed">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                    }}
                  >
                    {character.metadata.notes}
                  </Markdown>
                </div>
              ) : (
                <span className="animate-fade-in block">{character.metadata.notes}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal Overlay */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setLightboxImage(null)}
          id="lightbox-overlay"
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-full cursor-pointer transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-xl border border-slate-800 shadow-2xl relative flex flex-col bg-slate-950">
            <img
              src={lightboxImage.url}
              alt="Full size character visual"
              className="max-w-full max-h-[75vh] object-contain"
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="bg-slate-900 border-t border-slate-800 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-slate-400 font-mono shrink-0">File Path:</span>
                <span className="font-mono select-all bg-slate-950 px-2 py-1 rounded text-slate-200 border border-slate-800 truncate" title={lightboxImage.path}>
                  {lightboxImage.path}
                </span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(lightboxImage.path);
                  alert(`Copied path: ${lightboxImage.path}`);
                }}
                className="px-2.5 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 cursor-pointer flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Copy Path</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wikipedia Search Modal */}
      {showWikiModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-slate-900 text-slate-100 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">Wikipedia Research</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWikiModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-200 flex gap-2">
              <input
                type="text"
                value={wikiSearchQuery}
                onChange={(e) => setWikiSearchQuery(e.target.value)}
                placeholder="Search query..."
                className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={async () => {
                  setIsSearchingWiki(true);
                  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(wikiSearchQuery)}&format=json&origin=*`;
                  try {
                    const res = await fetch(url);
                    const data = await res.json();
                    if (data.query && data.query.search) {
                      setWikiResults(data.query.search);
                    } else {
                      setWikiResults([]);
                    }
                  } catch (e) {
                    alert("Search failed");
                  } finally {
                    setIsSearchingWiki(false);
                  }
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Search
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 select-scrollbar text-xs">
              {isEnrichingWiki ? (
                <div className="text-center py-12 flex flex-col items-center justify-center space-y-4">
                  <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-slate-800 font-bold text-sm">Scanning Wikipedia Article...</div>
                  <p className="text-slate-500 max-w-xs text-center leading-normal font-sans">
                    Gemini AI is analyzing the biography, matching facts against {character.core.name}'s dossier, and extracting missing real-life details.
                  </p>
                </div>
              ) : isSearchingWiki ? (
                <div className="text-center py-8 text-slate-400 font-medium animate-pulse">
                  Searching Wikipedia...
                </div>
              ) : wikiResults.length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-medium">
                  No Wikipedia matching entries found. Try a different search term.
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-slate-500 font-medium mb-2">Multiple matches found. Select the correct one:</p>
                  {wikiResults.map((res: any) => (
                    <div
                      key={res.pageid}
                      onClick={() => handleWikiSelect(res)}
                      className="p-3 border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-white rounded-lg cursor-pointer transition-all space-y-1 text-slate-700"
                    >
                      <h4 className="font-bold text-slate-950 font-serif text-sm flex items-center justify-between">
                        <span>{res.title}</span>
                        <span className="text-[10px] font-normal text-blue-600 hover:underline">Select & Connect ➔</span>
                      </h4>
                      <p
                        className="text-slate-600 leading-normal"
                        dangerouslySetInnerHTML={{ __html: res.snippet + '...' }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Portrait Generation Modal */}
      {showPortraitModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-slate-900 text-slate-100 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">AI Character Portrait Generator</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPortraitModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
              <p className="font-medium text-slate-800 mb-1">
                Generating portrait look for: <strong className="text-blue-600 font-serif">{character.core.name}</strong> ({character.core.role})
              </p>
              <p>
                This uses Gemini's Imagen 3 model to craft a custom face. The resulting picture will automatically become the character's primary portrait and default gallery image.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 select-scrollbar text-xs">
              {isGeneratingPortrait ? (
                <div className="text-center py-12 flex flex-col items-center justify-center space-y-4">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-slate-800 font-bold text-sm">Creating Character Portrait...</div>
                  <p className="text-slate-500 max-w-xs text-center leading-normal">
                    Gemini Imagen is rendering a high-fidelity visual matching the descriptive characteristics of {character.core.name}.
                  </p>
                </div>
              ) : generatedPortraitUrl ? (
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-emerald-700 font-bold flex items-center gap-1 mb-2">
                      <Check className="w-4 h-4" /> Portrait Rendered Successfully!
                    </p>
                    <div className="w-64 h-64 rounded-xl overflow-hidden border border-slate-300 shadow bg-slate-100 relative">
                      <img
                        src={generatedPortraitUrl}
                        alt="AI Generated Portrait"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-700">Prompt Used:</p>
                    <p className="italic text-slate-600 font-serif leading-normal">"{portraitPrompt}"</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setGeneratedPortraitUrl(null)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer border border-slate-200 transition-colors"
                    >
                      Regenerate
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyPortrait}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs cursor-pointer border border-indigo-500 shadow transition-all"
                    >
                      Save & Set Default
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Interactive Visual Prompt (Customize to tweak portrait style)
                    </label>
                    <textarea
                      rows={5}
                      value={portraitPrompt}
                      onChange={(e) => setPortraitPrompt(e.target.value)}
                      placeholder="Enter details, genre, photography parameters, or physical notes..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-serif leading-relaxed text-slate-800"
                    />
                  </div>

                  {portraitError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 space-y-1">
                      <p className="font-bold">Generation Failed:</p>
                      <p className="font-mono text-[11px] leading-normal">{portraitError}</p>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleGeneratePortrait}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow flex items-center justify-center gap-1.5 cursor-pointer border border-indigo-500 transition-all"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                      <span>Render Character Portrait</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Background book icon SVG placeholder
function BookOverlay() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-book-open">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
