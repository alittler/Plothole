import { ProjectData } from '../types';
import { generateId } from '../services/storageService';
import { LoreEntry, Artifact, TimelineEvent } from '../types';

export const getSampleProjectData = (id: string, title: string, author: string, shortName: string): ProjectData => {
  const ch1Content = `<!-- #CHAPTER_1 -->\n# Chapter 1: The Weight of Ink\n\nThe Great Archive was always cold. Arthur Penhaligon pulled his cloak tighter as he navigated the towering shelves of the Forbidden Wing.`;
  const ch2Content = `<!-- #CHAPTER_2 -->\n# Chapter 2: Shadows of the Spire\n\nThe Obsidian Spire pierced the gray clouds like a needle of dark glass.`;
  const ch3Content = `<!-- #CHAPTER_3 -->\n# Chapter 3: The Echo in the Wards\n\nElara Vane found Arthur Penhaligon exactly where she expected.`;

  const filler = "\n\nMemories are the threads of reality. In the Citadel, those threads were pulled and twisted until the pattern was lost.";
  const fullManuscript = `${ch1Content}\n\n${ch2Content}\n\n${ch3Content}${filler}`;
  const wordCountValue = fullManuscript.trim().split(/\s+/).length;

  const characters = [
    { id: 'CH-ARTHUR', name: 'Arthur Penhaligon', role: 'Protagonist', job: 'Junior Archivist', description: 'A curious and determined young man with an uncanny ability to read ancient scripts.', traits: ['Curious', 'Determined'], physical_description: 'Lean build, dark hair with premature silver streaks, pale from years in archives. Average height around 5\'10", sharp observant eyes that miss nothing.', style: 'Simple archival robes, ink-stained fingers, practical leather boots worn from navigating endless shelves.', strengths: 'Exceptional memory, pattern recognition, ability to decipher ancient texts, quick thinking under pressure.', weaknesses: 'Physically frail, inexperienced in combat, trusts too easily, struggles with social interaction outside academic circles.', age: 'Early 20s', source: 'manual' as const },
    { id: 'CH-VAELEN', name: 'Admin Vaelen', role: 'Antagonist', job: 'High Architect', description: 'The cold, calculating ruler of the Citadel.', traits: ['Cold', 'Calculating', 'Ruthless'], physical_description: 'Tall and imposing, silver-haired with aristocratic features. Sharp jawline, piercing gray eyes that seem to look through people. Well-maintained despite advanced age, suggesting access to memory enhancements.', style: 'Immaculate obsidian robes trimmed with gold, rare artifacts adorning his wrists. Every appearance is choreographed for maximum psychological impact.', strengths: 'Masterful political strategist, charismatic orator, centuries of experience (through stolen memories), ability to control information.', weaknesses: 'Disconnected from ordinary people\'s suffering, overconfident in his power, fears the truth more than weapons, becoming paranoid with age.', age: 'Appeared 60+, actual age unknown', source: 'manual' as const },
    { id: 'CH-ELARA', name: 'Elara Vane', role: 'Ally', job: 'Information Broker', description: 'A resourceful survivor from the Lower Wards.', traits: ['Resourceful', 'Cynical', 'Brave'], physical_description: 'Athletic build from years of navigating the Wards. Dark skin, shaved head revealing intricate memory tattoos along her scalp. Scars from street fights. Sharp-featured with intense dark eyes, stands about 5\'8".', style: 'Practical streetwear—patched cargo pants, layered tunics, heavy boots. Wears stolen jewelry from black market deals. Favors dark colors for moving undetected in shadows.', strengths: 'Street-smart, excellent at gathering intelligence, skilled negotiator, physically capable fighter, understands Lower Wards politics.', weaknesses: 'Limited formal education, struggles with trust despite outward confidence, carries guilt from past moral compromises.', age: 'Mid-30s', source: 'manual' as const },
    { id: 'CH-SILAS', name: 'Master Silas', role: 'Mentor', job: 'Senior Archivist', description: 'A wise and secretive mentor who knows the truth.', traits: ['Wise', 'Secretive', 'Patient'], physical_description: 'Elderly and stooped from decades hunched over manuscripts. White hair and beard, weathered face lined with worry. Soft brown eyes that carry the weight of hidden knowledge. Moves slowly but with purpose, around 5\'6" in current state.', style: 'Well-worn archival robes with hidden pockets for smuggled documents. Spectacles on a chain around his neck. Carries a wooden cane carved with ancient symbols.', strengths: 'Encyclopedic knowledge of archives, master code-breaker, strategic thinker, commands respect from the archival community.', weaknesses: 'Age and declining health, confined to the Archive (Vaelen\'s spy network), unable to act directly without suspicion, haunted by past regrets.', age: '70+', source: 'manual' as const },
    { id: 'CH-KESS', name: 'Kessandra Mohr', role: 'Ally', job: 'Memory Thief', description: 'A skilled operative who steals valuable memories for the black market. Torn between survival and morality.', traits: ['Cunning', 'Pragmatic', 'Conflicted'], physical_description: 'Lithe and graceful with an ethereal quality that makes people forget her presence. Pale skin with striking violet eyes—an unusual genetic anomaly. Shoulder-length white-blonde hair often concealed under hoods. Moves like smoke, around 5\'5".', style: 'Dark, form-fitting clothing designed for stealth. Multiple hidden compartments for memory vials. Wears silver rings—each one tied to a past "job" she\'s completed. A silver mask worn during operations.', strengths: 'Master thief, exceptional memory palace technique, can navigate locked vaults, understanding of black market networks, enhanced sensory perception.', weaknesses: 'Increasingly haunted by ethical concerns, difficulty forming stable relationships, dependent on stimulants to maintain focus, slowly becoming emotionally numb from repeated memory theft work.', age: 'Late 20s', source: 'manual' as const }
  ];

  const locations = [
    { id: 'LOC-GREAT-ARCHIVE', name: 'The Great Archive', description: 'The heart of the Obsidian Citadel, containing all recorded memories.', type: 'Library', source: 'manual' as const },
    { id: 'LOC-LOWER-WARDS', name: 'The Lower Wards', description: 'The smog-filled streets where the memory-less are cast aside.', type: 'District', source: 'manual' as const },
    { id: 'LOC-OBSIDIAN-SPIRE', name: 'The Obsidian Spire', description: 'Vaelen\'s seat of power, piercing the gray clouds.', type: 'Tower', source: 'manual' as const },
    { id: 'LOC-DEEP-VAULTS', name: 'The Deep Vaults', description: 'Ancient underground chambers rumored to contain pre-Plague knowledge and artifacts.', type: 'Underground', source: 'manual' as const },
    { id: 'LOC-MEMORY-MARKETS', name: 'Memory Markets', description: 'Bustling trading hub in the Lower Wards where memories and information exchange hands.', type: 'Marketplace', source: 'manual' as const }
  ];

  const artifacts = [
    { id: 'ART-CHRONOS-KEY', name: 'Chronos Key', description: 'A relic that can unlock memory vaults. Hums with a rhythmic pulse. Crafted before the Mnemonic Plague.', type: 'Artifact', significance: 'Crucial', source: 'manual' as const },
    { id: 'ART-MEMORY-VIAL', name: 'Golden Memory Vial', description: 'Vials containing memories from the First Age before the Plague. Glow with bioluminescent gold light.', type: 'Artifact', significance: 'Rare', source: 'manual' as const },
    { id: 'ART-LEXICON', name: 'Ancient Lexicon', description: 'A dictionary of the First Language containing codes that stabilize Echo-Walkers.', type: 'Artifact', significance: 'Critical', source: 'manual' as const },
    { id: 'ART-MEMORY-WEAVE', name: 'Memory Weave Pendant', description: 'Worn by high-ranking archivists, grants limited Echo-Walking ability and memory restoration.', type: 'Artifact', significance: 'Uncommon', source: 'manual' as const },
    { id: 'ART-TRUTH-SCROLL', name: 'The Founding Scroll', description: 'A hidden scroll revealing the truth about the Mnemonic Plague—that it was not a disaster but a weapon.', type: 'Artifact', significance: 'Legendary', source: 'manual' as const }
  ];

  const lore: LoreEntry[] = [
    { id: 'LORE-MNEMONIC-PLAGUE', term: 'The Mnemonic Plague', definition: 'Three centuries ago, a catastrophic event wiped the collective memory of civilization. Official records claim it was a natural disaster. In reality, it was engineered by the First High Architects as a tool to reshape society and eliminate dissent.', tags: ['History', 'Mystery'], category: 'Event', source: 'manual' as const },
    { id: 'LORE-ECHO-WALKERS', term: 'Echo-Walkers and the Void', definition: 'Echo-Walkers are individuals capable of entering others\' minds and experiencing their memories. Those untrained risk the Void—a state of complete memory loss that erases all sense of identity. The Chronos Key and ancient stabilization techniques can prevent this fate.', tags: ['Magic System', 'Danger'], category: 'Abilities', source: 'manual' as const },
    { id: 'LORE-THE-WEAVER', term: 'The Great Weaver', definition: 'A figure of legend from before the Plague who supposedly spun the first memory strings at the dawn of time. May have been the architect of the original society\'s memory system. Some believe The Weaver still exists in spectral form.', tags: ['Mythology', 'Speculation'], category: 'Mythology', source: 'manual' as const },
    { id: 'LORE-MNEMOS-CURRENCY', term: 'Mnemos: Memory as Currency', definition: 'In the post-Plague world, memories became the primary currency. Extracted memories of the elite are stored in vials and traded. Those with more memory strength (Mnemos) have greater social status and access to resources.', tags: ['Economy', 'Society'], category: 'Economy', source: 'manual' as const },
    { id: 'LORE-FIRST-AGE', term: 'The First Age Before Memory', definition: 'Largely lost to the Plague, the First Age was a world where civilization depended on a unified memory system. Records suggest advanced technology, complex social structures, and knowledge now considered impossible. Only fragments remain in the Deep Vaults.', tags: ['Lost Civilization', 'History'], category: 'History', source: 'manual' as const }
  ];

  const timeline: TimelineEvent[] = [
    { id: 'TL-FIRST-AGE', date: 'July 11, 2016', month: 7, day: 11, title: 'The First Age', description: 'Civilization at its height. Memory system operates perfectly. The Weaver constructs the foundational memory architecture.', charactersInvolved: ['The Weaver'], location: 'The World' },
    { id: 'TL-THE-PLAGUE', date: 'August 15, 2150', month: 8, day: 15, title: 'The Mnemonic Plague', description: 'A catastrophic event wipes the collective memory. Official history begins here. Survivors rebuild, creating the Citadel under the rule of the First High Architects.', charactersInvolved: ['The First Architects'], location: 'Global' },
    { id: 'TL-CITADEL-FOUNDED', date: 'September 20, 2155', month: 9, day: 20, title: 'Founding of the Citadel', description: 'The Great Archive is constructed. Memory becomes the foundation of society. The tiered class system emerges based on memory strength.', charactersInvolved: ['First High Architects'], location: 'Citadel' },
    { id: 'TL-GREAT-FIRE', date: 'October 5, 2440', month: 10, day: 5, title: 'The West Wing Burning', description: 'Vaelen orders the destruction of the West Wing of the Archive to eliminate knowledge of dissent and rebellion. Thousands of memories are lost forever.', charactersInvolved: ['Admin Vaelen'], location: 'The Great Archive' },
    { id: 'TL-PRESENT-DAY', date: 'December 25, 2450', month: 12, day: 25, title: 'The Echo Awakens', description: 'Arthur discovers the Chronos Key. The Echo manifests. The truth of the Founding begins to unravel. The Citadel\'s carefully constructed reality faces its greatest threat.', charactersInvolved: ['Arthur Penhaligon', 'The Echo'], location: 'The Citadel' }
  ];

  const proseDocuments = [
    { id: generateId(), title: 'Chapter 1: The Weight of Ink', content: ch1Content, lastModified: Date.now() },
    { id: generateId(), title: 'Chapter 2: Shadows of the Spire', content: ch2Content, lastModified: Date.now() },
    { id: generateId(), title: 'Chapter 3: The Echo in the Wards', content: ch3Content, lastModified: Date.now() }
  ];

  const chapters = [
    {
      id: generateId(), title: 'Chapter 1: The Weight of Ink', content: ch1Content, order: 1, status: 'Draft' as const, lastModified: Date.now(), wordCount: ch1Content.trim().split(/\s+/).length,
      scenes: [{ id: generateId(), title: 'Scene 1', content: ch1Content, wordCount: ch1Content.trim().split(/\s+/).length }]
    },
    {
      id: generateId(), title: 'Chapter 2: Shadows of the Spire', content: ch2Content, order: 2, status: 'Draft' as const, lastModified: Date.now(), wordCount: ch2Content.trim().split(/\s+/).length,
      scenes: [{ id: generateId(), title: 'Scene 1', content: ch2Content, wordCount: ch2Content.trim().split(/\s+/).length }]
    },
    {
      id: generateId(), title: 'Chapter 3: The Echo in the Wards', content: ch3Content, order: 3, status: 'Draft' as const, lastModified: Date.now(), wordCount: ch3Content.trim().split(/\s+/).length,
      scenes: [{ id: generateId(), title: 'Scene 1', content: ch3Content, wordCount: ch3Content.trim().split(/\s+/).length }]
    }
  ];

  const semanticDocuments = [
    { id: generateId(), title: 'Chapter 1: The Weight of Ink', content: ch1Content + '\n\n^anchor-ch1', lastModified: Date.now() },
    { id: generateId(), title: 'Chapter 2: Shadows of the Spire', content: ch2Content + '\n\n^anchor-ch2', lastModified: Date.now() },
    { id: generateId(), title: 'Chapter 3: The Echo in the Wards', content: ch3Content + '\n\n^anchor-ch3', lastModified: Date.now() }
  ];

  return {
    id,
    title,
    shortName,
    author,
    summary: 'In a world where memories are currency, a young archivist discovers a forgotten vault that could rewrite history—or erase it entirely.',
    lastModified: Date.now(),
    themes: ['Memory', 'Power', 'Legacy', 'Sacrifice'],
    entities: [
      { id: 'CH-ARTHUR', name: 'Arthur Penhaligon', tier: 1, species: 'Human', type: 'Character', description: 'A curious and determined young man with an uncanny ability to read ancient scripts.', motivation: 'Unlock the Forbidden Vault.', conflict: 'Loyalty to Silas vs. the Echo\'s truths.', aliases: ['Little Bird'], location_id: 'LOC-GREAT-ARCHIVE' },
      { id: 'CH-VAELEN', name: 'Admin Vaelen', tier: 1, species: 'Human', type: 'Character', description: 'The cold, calculating ruler of the Citadel.', motivation: 'Maintain total control of memory.', conflict: 'Fear of a second Mnemonic Plague.', location_id: 'LOC-OBSIDIAN-SPIRE' },
      { id: 'CH-ELARA', name: 'Elara Vane', tier: 2, species: 'Human', type: 'Character', primary_trait: 'Resourceful survivor and information broker.', location_id: 'LOC-LOWER-WARDS' },
      { id: 'CH-SILAS', name: 'Master Silas', tier: 2, species: 'Human', type: 'Character', primary_trait: 'Wise and secretive mentor.', location_id: 'LOC-GREAT-ARCHIVE' },
      { id: 'CH-KESS', name: 'Kessandra Mohr', tier: 2, species: 'Human', type: 'Character', primary_trait: 'Skilled operative caught between survival and morality.', location_id: 'LOC-MEMORY-MARKETS' },
      { id: 'CH-ECHO', name: 'The Echo', tier: 3, species: 'Spectral Entity', type: 'Character' },
      { id: 'LOC-GREAT-ARCHIVE', name: 'The Great Archive', tier: 1, species: 'Structure', type: 'Location', description: 'The heart of the Obsidian Citadel.' },
      { id: 'LOC-LOWER-WARDS', name: 'The Lower Wards', tier: 3, species: 'District', type: 'Location' },
      { id: 'LOC-OBSIDIAN-SPIRE', name: 'The Obsidian Spire', tier: 1, species: 'Structure', type: 'Location', description: 'Vaelen\'s seat of power.' },
      { id: 'LOC-DEEP-VAULTS', name: 'The Deep Vaults', tier: 2, species: 'Underground', type: 'Location', description: 'Ancient chambers beneath the Citadel.' },
      { id: 'LOC-MEMORY-MARKETS', name: 'Memory Markets', tier: 2, species: 'Marketplace', type: 'Location', description: 'Heart of trade in the Lower Wards.' }
    ],
    characters,
    locations,
    artifacts,
    lore,
    timeline,
    relationships: [],
    notes: [],
    manuscript: fullManuscript,
    history_diff: '',
    assets: [],
    latestManuscriptText: fullManuscript,
    wordCount: wordCountValue,
    charCount: fullManuscript.length,
    proseDocuments,
    semanticDocuments,
    chapters,
    lastProcessedManuscriptSha: '',
    lastProcessedPromptSha: ''
  };
};
