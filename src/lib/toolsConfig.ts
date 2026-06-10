export interface ToolParameters {
  [key: string]: string | number | boolean;
}

export interface Tool {
  type: string;
  parameters: ToolParameters;
}

export interface ToolsConfig {
  imageGeneration?: {
    model: string;
    aspectRatio: string;
  };
}

function parseToolsConfig(): ToolsConfig {
  const toolsJson = process.env.TOOLS || '[]';
  
  try {
    const tools: Tool[] = JSON.parse(toolsJson);
    const config: ToolsConfig = {};

    for (const tool of tools) {
      if (tool.type === 'openrouter:image_generation') {
        config.imageGeneration = {
          model: tool.parameters.model as string,
          aspectRatio: tool.parameters.aspect_ratio as string,
        };
      }
    }

    return config;
  } catch (error) {
    console.error('Failed to parse TOOLS configuration:', error);
    return {};
  }
}

export const toolsConfig = parseToolsConfig();

export function getImageGenerationConfig() {
  return toolsConfig.imageGeneration || {
    model: 'openai/gpt-5-image',
    aspectRatio: '16:9',
  };
}
