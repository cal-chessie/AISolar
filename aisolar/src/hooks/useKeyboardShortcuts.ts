import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  callback: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Escape to still work in inputs
      if (event.key !== 'Escape') {
        return;
      }
    }

    for (const shortcut of shortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrlKey ? (event.ctrlKey || event.metaKey) : true;
      const metaMatch = shortcut.metaKey ? event.metaKey : true;
      const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;

      if (keyMatch && ctrlMatch && metaMatch && shiftMatch) {
        event.preventDefault();
        shortcut.callback();
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Common shortcuts helper
export function useGlobalShortcuts({
  onSearch,
  onNewLead,
  onEscape,
}: {
  onSearch?: () => void;
  onNewLead?: () => void;
  onEscape?: () => void;
}) {
  const shortcuts: ShortcutConfig[] = [];

  if (onSearch) {
    shortcuts.push({
      key: 'k',
      ctrlKey: true,
      callback: onSearch,
      description: 'Open search',
    });
  }

  if (onNewLead) {
    shortcuts.push({
      key: 'n',
      ctrlKey: true,
      callback: onNewLead,
      description: 'New lead',
    });
  }

  if (onEscape) {
    shortcuts.push({
      key: 'Escape',
      callback: onEscape,
      description: 'Close modal',
    });
  }

  useKeyboardShortcuts(shortcuts);
}
