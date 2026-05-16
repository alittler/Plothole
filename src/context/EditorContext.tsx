"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface EditorState {
  isOpen: boolean;
  filePath: string | null;
  jsonData: any | null;
}

interface EditorContextType extends EditorState {
  openEditor: (filePath: string, jsonData: any) => void;
  closeEditor: () => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EditorState>({
    isOpen: false,
    filePath: null,
    jsonData: null,
  });

  const openEditor = (filePath: string, jsonData: any) => {
    setState({ isOpen: true, filePath, jsonData });
  };

  const closeEditor = () => {
    setState({ isOpen: false, filePath: null, jsonData: null });
  };

  return (
    <EditorContext.Provider value={{ ...state, openEditor, closeEditor }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return context;
}
