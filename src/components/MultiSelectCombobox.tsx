import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiSelectComboboxProps {
  id?: string;
  'aria-label'?: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

const MultiSelectCombobox: React.FC<MultiSelectComboboxProps> = ({
  id,
  'aria-label': ariaLabel,
  options,
  selected,
  onChange,
  placeholder = 'Selecionar...',
  disabled = false,
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (value: string) => {
    if (disabled) return;

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
    if (disabled) return;

    onChange(selected.filter((s) => s !== value));
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm ring-offset-background cursor-text transition-colors hover:border-primary/40",
          disabled && "cursor-not-allowed bg-muted/50 hover:border-input",
          open && !disabled && "border-ring ring-2 ring-ring/25"
        )}
        onClick={() => {
          if (disabled) return;
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        {selected.map((s) => (
          <span
            key={s}
            className="inline-flex max-w-[130px] items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary"
          >
            <span className="truncate">{s}</span>
            {!disabled && (
              <button
                type="button"
                aria-label={`Remover ${s}`}
                onClick={(e) => removeTag(s, e)}
                className="shrink-0 cursor-pointer rounded-sm hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-3" />
              </button>
            )}
          </span>
        ))}
        <input
          id={id}
          ref={inputRef}
          value={search}
          onChange={(e) => {
            if (disabled) return;
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          placeholder={selected.length === 0 ? placeholder : ''}
          aria-label={ariaLabel ?? placeholder}
          aria-expanded={open}
          disabled={disabled}
          className="min-w-[72px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && !disabled && "rotate-180")} />
      </div>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg">
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
                    "flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-accent/50"
                  )}
                >
                  <div className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-sm border border-primary",
                    isSelected && "bg-primary text-primary-foreground"
                  )}>
                    {isSelected && <Check className="size-3" />}
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
