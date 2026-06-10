import Markdoc, { nodes } from '@markdoc/markdoc';

/**
 * Markdoc configuration with custom tags and functions
 * for advanced narrative and worldbuilding processing
 */
/**
 * Markdoc configuration with custom tags and functions
 * for advanced narrative and worldbuilding processing
 */
export const config = {
  nodes: {
    document: {
      render: undefined,
    },
    heading: {
      render: 'Heading',
      attributes: {
        level: { type: Number, required: true, default: 1 },
      },
    },
    paragraph: {
      render: 'Paragraph',
    },
    code: {
      render: 'CodeBlock',
      attributes: {
        content: { type: String },
        language: { type: String },
      },
    },
    fence: {
      render: 'Fence',
      attributes: {
        language: { type: String },
        content: { type: String },
      },
    },
    list: {
      render: 'List',
      attributes: {
        ordered: { type: Boolean, default: false },
      },
    },
    item: {
      render: 'Item',
    },
    table: {
      render: 'Table',
    },
    th: {
      render: 'Th',
    },
    tr: {
      render: 'Tr',
    },
    td: {
      render: 'Td',
    },
    image: {
      render: 'Image',
      attributes: {
        src: { type: String },
        alt: { type: String },
        title: { type: String },
      },
    },
    link: {
      render: 'Link',
      attributes: {
        href: { type: String },
        title: { type: String },
      },
    },
    hr: {
      render: 'Hr',
    },
    blockquote: {
      render: 'Blockquote',
    },
    ...nodes,
  },
  tags: {
    // Character definition tag
    character: {
      render: 'Character',
      attributes: {
        name: { type: String, required: true },
        role: { type: String, default: 'supporting' },
        tier: { type: Number, default: 2 },
        id: { type: String },
      },
      selfClosing: false,
    },

    // Location/setting tag
    location: {
      render: 'Location',
      attributes: {
        name: { type: String, required: true },
        type: { type: String, default: 'unknown' },
        id: { type: String },
      },
      selfClosing: false,
    },

    // Plot point/event tag
    event: {
      render: 'PlotEvent',
      attributes: {
        title: { type: String, required: true },
        type: { type: String, default: 'other' },
        significance: { type: String, default: 'major' },
        id: { type: String },
      },
      selfClosing: false,
    },

    // Worldbuilding/lore tag
    lore: {
      render: 'Lore',
      attributes: {
        term: { type: String, required: true },
        type: { type: String, default: 'concept' },
        tier: { type: String, default: 'moderate' },
        id: { type: String },
      },
      selfClosing: false,
    },

    // Theme/motif tag
    theme: {
      render: 'Theme',
      attributes: {
        name: { type: String, required: true },
        description: { type: String },
        id: { type: String },
      },
      selfClosing: false,
    },

    // Narrative note/annotation
    note: {
      render: 'NarrativeNote',
      attributes: {
        type: { type: String, default: 'info' }, // info, warning, important, question
        title: { type: String },
      },
      selfClosing: false,
    },

    // Dialogue/quote block
    dialogue: {
      render: 'DialogueBlock',
      attributes: {
        character: { type: String, required: true },
        emotion: { type: String },
      },
      selfClosing: false,
    },

    // Scene break
    break: {
      render: 'SceneBreak',
      attributes: {
        type: { type: String, default: 'scene' },
      },
      selfClosing: true,
    },

    // Callout/highlight
    callout: {
      render: 'Callout',
      attributes: {
        type: { type: String, default: 'info' },
        title: { type: String },
      },
      selfClosing: false,
    },

    // Spoiler alert
    spoiler: {
      render: 'Spoiler',
      attributes: {
        label: { type: String, default: 'Spoiler' },
      },
      selfClosing: false,
    },

    // References/connections
    reference: {
      render: 'Reference',
      attributes: {
        type: { type: String, required: true }, // character, location, event, artifact
        id: { type: String, required: true },
        display: { type: String },
      },
      selfClosing: true,
    },

    // Tab component for toggled content
    tabs: {
      render: 'Tabs',
      selfClosing: false,
    },

    tab: {
      render: 'Tab',
      attributes: {
        label: { type: String, required: true },
      },
      selfClosing: false,
    },
  },
};

/**
 * Validation rules for narrative content
 */
export const validation = {
  character: {
    requiresName: true,
    requiresRole: false,
  },
  event: {
    requiresTitle: true,
    requiresType: false,
  },
  lore: {
    requiresTerm: true,
    requiresType: false,
  },
};
