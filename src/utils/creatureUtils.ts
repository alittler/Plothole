
export const getAlignmentColor = (alignment: string): string => {
  const normalized = alignment.toLowerCase().trim();
  switch (normalized) {
    case 'benevolent': return '#10b981'; // Green (emerald-500)
    case 'malicious': return '#ef4444'; // Red (rose-500)
    case 'ambivalent': return '#f59e0b'; // Amber (amber-500)
    case 'neutral': return '#64748b'; // Slate (slate-500)
    default: return '#64748b';
  }
};

export const getCategoryColor = (category: string): string => {
  const normalized = category.toLowerCase().trim();
  switch (normalized) {
    case 'dragons': return '#ef4444'; // Red (rose-500)
    case 'anthromorphic':
    case 'anthropomorphic': return '#8b5cf6'; // Purple (violet-500)
    case 'zoomorphic': return '#10b981'; // Green (emerald-500)
    case 'hybrids of human and animal': return '#f59e0b'; // Amber (amber-500)
    case 'hybrid animals': return '#3b82f6'; // Blue (blue-500)
    default: return '#64748b'; // Slate (slate-500)
  }
};

export const getCreatureIconUrl = (category: string): string => {
  const normalizedCategory = category.toLowerCase().trim();
  switch (normalizedCategory) {
    case 'dragons': return '/assets/map-icons/dragon.png';
    case 'hybrid animals': return '/assets/map-icons/chimera.png';
    case 'hybrids of human and animal': return '/assets/map-icons/minotaur.png';
    case 'anthromorphic':
    case 'anthropomorphic': return '/assets/map-icons/cyclops.png';
    case 'zoomorphic': return '/assets/map-icons/bear.png';
    default: return '';
  }
};

export const getCreatureIconHtml = (category: string, alignment: string, size: number = 32): string => {
  const bgColor = getCategoryColor(category);
  const borderColor = getAlignmentColor(alignment);
  const iconUrl = getCreatureIconUrl(category);
  const innerSize = Math.round(size * 0.65);
  
  const iconContent = iconUrl 
    ? `<img src="${iconUrl}" style="width: ${innerSize}px; height: ${innerSize}px; object-fit: contain; filter: brightness(0) invert(1);" />`
    : `<span style="font-size: ${Math.round(size * 0.5)}px;">👹</span>`;

  return `<div style="background-color: ${bgColor}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2.5px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3); position: relative;">
    ${iconContent}
  </div>`;
};
