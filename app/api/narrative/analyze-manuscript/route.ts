import { NextRequest, NextResponse } from 'next/server';

const MANUSCRIPT_ANALYSIS_PROMPT = `# Role & Objective
You are an expert literary analysis AI and database architect. Your task is to ingest the provided manuscript text and extract all characters into a highly structured, clean dataset using specific data types and schema formatting. 

Carefully read the text and build a character registry categorized into three distinct importance tiers.

---

# Data Schema & Formatting Rules

For every character identified, you must strictly extract and format the following parameters:

1. **Full Name / Surnames**: [String] Legal or formal names found in text.
2. **Nicknames**: [Short String] Common aliases, diminutive names, or playful titles. (Put "None" if none exist).
3. **Tier**: [Integer: 1, 2, or 3] 
   - *Tier 1 (Main)*: Core narrative drivers with deep internal goals and heavy presence.
   - *Tier 2 (Secondary)*: Supporting cast, vital world-builders, or plot catalysts.
   - *Tier 3 (Third-Tier/Background)*: Background figures, historical ghosts, or mentioned-only entities.
4. **Species**: [Dropdown Enum] Must be exactly one of the following: \`Human\`, \`Animal Companion\`, or \`Mythological / Spiritual Entity\`.
5. **Age Category**: [Dropdown Enum] Assign based on their life stage in the text: \`Child / Youth\`, \`Youth / Oblate\`, \`Adult\`, \`Elder\`, or \`Deceased / Historical\`.
6. **Status / Role**: [Comma-Separated Tags] Their structural function or social occupation (e.g., \`Academic\`, \`Monastic Staff\`, \`Royalty\`, \`Familiar\`).
7. **Goals**: [Long String / Bullet Points] Clear, concise breakdown of their narrative motivations, desires, or primary purpose in the text.
8. **Relationships**: [Key-Value Pairs] Formatted as \`Relationship Title: CHARACTER_NAME\`.
9. **Locations**: [Sequenced Array] Traced chronological order of physical spaces they occupy in the text, formatted as \`[Location A, Location B, Location C]\`.
10. **First Appearance**: [Structural Anchor] Formatted exactly as \`# Era/Year # -> Section Title -> Subsection Title\`.
11. **Last Appearance**: [Structural Anchor] Formatted exactly as \`# Era/Year # -> Section Title -> Subsection Title\`.
12. **Notes List**: [Adjustable Object Array] Leave exactly two blank, pre-formatted bullet points for user editing, like this:
    - *Note 1:* [ Leave brainstorming, continuity details, or draft ideas here ]
    - *Note 2:* [ Leave brainstorming, continuity details, or draft ideas here ]

---

# Output Layout Requirement

Group the final output by Tier. 

For **Tier 1 and Tier 2** characters, output them using this exact Markdown layout:

### [Character Name]
*   **Full Name / Surnames:** 
*   **Nicknames:** 
*   **Tier:** 
*   **Species:** 
*   **Age Category:** 
*   **Status / Role:** 
*   **Goals:** 
*   **Relationships:** 
*   **Locations:** 
*   **First Appearance:** 
*   **Last Appearance:** 
*   **Notes List:**
    - *Note 1:* [ Leave brainstorming, continuity details, or draft ideas here ]
    - *Note 2:* [ Leave brainstorming, continuity details, or draft ideas here ]

For **Tier 3** characters, condense them into a clean, space-saving inline list or table using the same parameters:

### [Character Name]
*   **Tier:** 3 | **Species:** | **Age Category:** 
*   **Status / Role:** 
*   **Goals:** 
*   **Relationships:** 
*   **First Appearance:** 
*   **Last Appearance:** 
*   **Notes List:**
    - *Note 1:* [ Leave notes here ]

---

# Execution Instruction
Analyze the following manuscript text. Do not summarize the plot; focus purely on scanning, extracting, and rendering the character data according to the structural rules above.`;

export async function POST(request: NextRequest) {
  try {
    const { manuscriptText } = await request.json();

    if (!manuscriptText || typeof manuscriptText !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid manuscriptText' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    console.log('[ManuscriptAnalyzer] Sending analysis request to OpenRouter...');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://plothole.click',
        'X-Title': 'Plothole - Manuscript Analysis',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: `${MANUSCRIPT_ANALYSIS_PROMPT}\n\nManuscript Text:\n\n${manuscriptText}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[ManuscriptAnalyzer] API Error:', errorData);
      return NextResponse.json(
        { error: `Analysis API Error (${response.status}): ${JSON.stringify(errorData)}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const analysisContent = data.choices[0].message.content;
    console.log('[ManuscriptAnalyzer] Analysis complete');
    console.log('[ManuscriptAnalyzer] First 500 chars of analysis:', analysisContent.substring(0, 500));

    // Parse character data from markdown (extract ### Character Name entries)
    const characters: any[] = [];
    const characterRegex = /^### (.+?)$/gm;
    let match;
    
    while ((match = characterRegex.exec(analysisContent)) !== null) {
      const characterName = match[1].trim();
      if (characterName) {
        console.log('[ManuscriptAnalyzer] Extracted character:', characterName);
        characters.push({
          id: `char-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          name: characterName,
          role: 'Character',
          tier: 1,
          aliases: [],
          traits: [],
          motivation: '',
          description: '',
          physical_description: '',
          source: 'ai_generated',
          field_notes: []
        } as any);
      }
    }
    
    console.log('[ManuscriptAnalyzer] Total characters extracted:', characters.length);

    return NextResponse.json({
      analysis: analysisContent,
      characters: characters,
      success: true,
    });
  } catch (error) {
    console.error('[ManuscriptAnalyzer] Error:', error);
    return NextResponse.json(
      { error: `Analysis Error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
