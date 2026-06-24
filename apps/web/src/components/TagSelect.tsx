import { useState } from "react";

type Props = {
  name: string;
  label: string;
  options: string[];
  defaultValue?: string[];
};

export function TagSelect({ name, label, options, defaultValue = [] }: Props) {
  const [selected, setSelected] = useState(() => new Set(defaultValue));

  function toggle(option: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(option)) {
        next.delete(option);
      } else {
        next.add(option);
      }
      return next;
    });
  }

  const selectedValues = [...selected];

  return (
    <fieldset className="tag-select">
      <legend>{label}</legend>
      <div className="tag-select-grid">
        {options.map((option) => {
          const isSelected = selected.has(option);
          return (
            <button
              key={option}
              type="button"
              className={isSelected ? "selected" : ""}
              onClick={() => toggle(option)}
              aria-pressed={isSelected}
            >
              <span>{option}</span>
            </button>
          );
        })}
      </div>
      {selectedValues.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
    </fieldset>
  );
}
