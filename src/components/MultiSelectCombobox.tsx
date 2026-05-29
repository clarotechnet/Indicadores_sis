import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiSelectComboboxProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

const MultiSelectCombobox: React.FC<MultiSelectComboboxProps> = ({
  options, selected, onChange, placeholder = 'Selecionar...'
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
    setSearch('');
    inputRef.current?.focus();
  };

  const removeTag = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((s) => s !== value));
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex min-h-10 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm ring-offset-background cursor-text",
          open && "ring-2 ring-ring ring-offset-2"
        )}
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
      >
        {selected.map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1 rounded bg-primary/10 text-primary px-1.5 py-0.5 text-xs font-medium max-w-[120px]"
          >
            <span className="truncate">{s}</span>
            <button
              type="button"
              onClick={(e) => removeTag(s, e)}
              className="hover:text-destructive shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[60px] bg-transparent outline-none placeholder:text-muted-foreground text-sm"
        />
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum resultado</div>
          ) : (
            filtered.map((option) => {
              const isSelected = selected.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggle(option)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-left",
                    isSelected && "bg-accent/50"
                  )}
                >
                  <div className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary",
                    isSelected && "bg-primary text-primary-foreground"
                  )}>
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <span className="truncate">{option}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelectCombobox;