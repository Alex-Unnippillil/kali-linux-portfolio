import { ACCENT_OPTIONS } from "../../../hooks/useSettings";
import { getAccessibleTextColor } from "../../../utils/color";

type Props = {
  value: string;
  onChange: (accent: string) => void;
};

const AccentPicker = ({ value, onChange }: Props) => {
  return (
    <fieldset className="w-full max-w-xl">
      <legend className="mb-3 text-sm font-semibold uppercase tracking-wide text-ubt-grey">
        Accent color
      </legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {ACCENT_OPTIONS.map((option) => {
          const isSelected = option.value === value;
          return (
            <label
              key={option.id}
              className="flex cursor-pointer flex-col items-center gap-2 text-xs text-ubt-grey"
            >
              <input
                type="radio"
                name="accent-color"
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                className="peer sr-only"
                aria-label={`select-accent-${option.id}`}
              />
              <span
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-transparent transition-all duration-200 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--color-focus-ring)] peer-focus-visible:outline-offset-2"
                style={{
                  backgroundColor: option.value,
                  borderColor: isSelected ? "#ffffff" : "transparent",
                  boxShadow: isSelected
                    ? `0 0 0 4px ${option.value}40`
                    : "none",
                }}
              >
                {isSelected && (
                  <span
                    className="text-sm font-semibold"
                    style={{ color: getAccessibleTextColor(option.value) }}
                  >
                    ✓
                  </span>
                )}
              </span>
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};

export default AccentPicker;
