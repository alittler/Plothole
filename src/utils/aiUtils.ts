import { Chapter, TimelineEvent, ProjectData, ContinuityError } from '../types';

export async function auditPlotThreads(chapters: Chapter[], timeline: TimelineEvent[]): Promise<any[]> {
  console.warn('auditPlotThreads is currently a stub');
  return [];
}

export async function scanForContinuityErrors(manuscript: string, projectData: ProjectData): Promise<ContinuityError[]> {
  console.warn('scanForContinuityErrors is currently a stub');
  return [];
}

export async function chatWithAssistant(message: string, systemPrompt: string | null, history: any[], context?: any): Promise<string> {
  console.warn('chatWithAssistant is currently a stub');
  return "I'm sorry, I'm currently unable to chat as the AI service is being maintained.";
}

export async function performOCR(file: File | string): Promise<string> {
  console.warn('performOCR is currently a stub');
  return "OCR processing is currently unavailable.";
}

export async function notebookLMProcess(content: string, type?: string): Promise<any> {
  console.warn('notebookLMProcess is currently a stub');
  return { success: false, message: "NotebookLM processing is currently unavailable.", markdown: "", metadata: {} };
}

export async function smartExtractSources(content: string): Promise<any[]> {
  console.warn('smartExtractSources is currently a stub');
  return [];
}

export async function generateSourceGuideAi(content: string): Promise<string> {
  console.warn('generateSourceGuideAi is currently a stub');
  return "Source guide generation is currently unavailable.";
}
