import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";

type Props = {
  name: string;
  label: string;
  options: string[];
  defaultValue?: string[];
  value?: string[];
  onChange?: (value: string[]) => void;
  showSelectedStrip?: boolean;
};

export function TagSelect({ name, label, options, defaultValue = [], value, onChange, showSelectedStrip = false }: Props) {
  const [internalSelected, setInternalSelected] = useState(() => new Set(defaultValue));
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => new Set(value ?? [...internalSelected]), [internalSelected, value]);
  const selectedValues = [...selected];
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return normalizedQuery
      ? options.filter((option) => option.toLowerCase().includes(normalizedQuery))
      : options;
  }, [options, query]);

  function toggle(option: string) {
    const next = new Set(selected);
    if (next.has(option)) {
      next.delete(option);
    } else {
      next.add(option);
    }
    const nextValues = [...next];

    if (value !== undefined) {
      onChange?.(nextValues);
    } else {
      setInternalSelected(next);
      onChange?.(nextValues);
    }
    setQuery("");
  }

  function removeSelected(option: string) {
    const next = new Set(selected);
    next.delete(option);
    const nextValues = [...next];

    if (value !== undefined) {
      onChange?.(nextValues);
    } else {
      setInternalSelected(next);
      onChange?.(nextValues);
    }
  }

  function renderSelectedStrip(className = "auth-skill-selected-strip", emptyText = "No selected items") {
    return (
      <div className={className}>
        {selectedValues.length > 0 ? selectedValues.map((selectedValue) => (
          <button type="button" key={selectedValue} onClick={() => removeSelected(selectedValue)}>
            {selectedValue}
            <X size={13} />
          </button>
        )) : <span>{emptyText}</span>}
      </div>
    );
  }

  function updateMenuPosition() {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const gap = 8;
    const padding = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(rect.width, viewportWidth - padding * 2);
    const left = Math.min(Math.max(rect.left, padding), viewportWidth - width - padding);
    const spaceBelow = viewportHeight - rect.bottom - gap - padding;
    const spaceAbove = rect.top - gap - padding;
    const maxAvailable = Math.max(spaceBelow, spaceAbove, 180);
    const maxHeight = Math.min(300, Math.max(180, maxAvailable));
    const menuHeight = Math.min(menuRef.current?.offsetHeight ?? maxHeight, maxHeight);
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const top = openUp
      ? Math.max(padding, rect.top - gap - menuHeight)
      : Math.min(rect.bottom + gap, viewportHeight - padding - menuHeight);

    setMenuStyle({ left, top, width, maxHeight });
  }

  useLayoutEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
  }, [isOpen, query, selectedValues.length]);

  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setIsOpen(false);
    }

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    document.addEventListener("pointerdown", handleOutsideClick);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <fieldset className="tag-select auth-skill-select">
      <legend>{label}</legend>
      <div className={`auth-skill-input ${isOpen ? "active" : ""}`} ref={triggerRef}>
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !query && selectedValues.length > 0) {
              toggle(selectedValues[selectedValues.length - 1]);
            }
          }}
          placeholder={selectedValues.length ? `${selectedValues.length} selected` : label}
        />
        <button type="button" onClick={() => setIsOpen((open) => !open)} aria-label={`Toggle ${label} list`} aria-expanded={isOpen}>
          <ChevronDown size={16} />
        </button>
      </div>
      {showSelectedStrip && renderSelectedStrip("tag-select-selected-row", "No selected items")}
      {isOpen && createPortal(
        <div className="auth-skill-menu" ref={menuRef} style={menuStyle}>
          {renderSelectedStrip()}
          <div className="auth-skill-option-list">
            {filteredOptions.map((option) => {
              const isSelected = selected.has(option);
              return (
                <button
                  key={option}
                  type="button"
                  className={isSelected ? "selected" : ""}
                  onClick={() => toggle(option)}
                  aria-pressed={isSelected}
                >
                  {option}
                </button>
              );
            })}
            {filteredOptions.length === 0 && <span className="auth-skill-empty">No matching items</span>}
          </div>
        </div>,
        document.body
      )}
      {selectedValues.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
    </fieldset>
  );
}
