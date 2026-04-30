import React, { createContext, useContext, useState, useCallback } from 'react';

export interface EditModalState {
  isOpen: boolean;
  data: any;
  entityType: string;
  entityId: string;
  title?: string;
}

export interface EditModalContextType {
  modalState: EditModalState;
  openEditor: (data: any, entityType: string, entityId: string, title?: string) => void;
  closeEditor: () => void;
  isOpen: boolean;
}

const EditModalContext = createContext<EditModalContextType | undefined>(undefined);

export const EditModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<EditModalState>({
    isOpen: false,
    data: null,
    entityType: '',
    entityId: '',
    title: '',
  });

  const openEditor = useCallback(
    (data: any, entityType: string, entityId: string, title?: string) => {
      setModalState({
        isOpen: true,
        data,
        entityType,
        entityId,
        title: title || `Edit ${entityType}`,
      });
    },
    []
  );

  const closeEditor = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const value: EditModalContextType = {
    modalState,
    openEditor,
    closeEditor,
    isOpen: modalState.isOpen,
  };

  return (
    <EditModalContext.Provider value={value}>
      {children}
    </EditModalContext.Provider>
  );
};

export const useEditModal = (): EditModalContextType => {
  const context = useContext(EditModalContext);
  if (!context) {
    throw new Error('useEditModal must be used within EditModalProvider');
  }
  return context;
};
