function getStepPrecision(step) {
  const text = String(step);
  const dotIndex = text.indexOf(".");
  if (dotIndex === -1) {
    return 0;
  }

  return text.length - dotIndex - 1;
}

function normalizeNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

export default function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
  compact = false,
  className = "",
  inputClassName = "",
  inputAriaLabel = "Sayi degeri",
  increaseAriaLabel = "Arttir",
  decreaseAriaLabel = "Azalt",
  placeholder
}) {
  const hasMin = Number.isFinite(Number(min));
  const hasMax = Number.isFinite(Number(max));
  const safeMin = hasMin ? Number(min) : undefined;
  const safeMax = hasMax ? Number(max) : undefined;
  const safeStep = Math.max(0.1, Number(step) || 1);
  const precision = getStepPrecision(safeStep);

  function clamp(nextValue) {
    let output = Number.isFinite(nextValue) ? nextValue : hasMin ? safeMin : 0;

    if (hasMin) {
      output = Math.max(safeMin, output);
    }

    if (hasMax) {
      output = Math.min(safeMax, output);
    }

    return Number(output.toFixed(precision));
  }

  const baseValue = clamp(normalizeNumber(value, hasMin ? safeMin : 0));

  function emit(nextValue) {
    onChange(clamp(nextValue));
  }

  return (
    <div className={`number-stepper ${compact ? "number-stepper-compact" : ""} ${className}`.trim()}>
      <input
        className={`number-stepper-input ${inputClassName}`.trim()}
        type="number"
        value={baseValue}
        min={hasMin ? safeMin : undefined}
        max={hasMax ? safeMax : undefined}
        step={safeStep}
        placeholder={placeholder}
        aria-label={inputAriaLabel}
        disabled={disabled}
        onChange={(event) => {
          const raw = event.target.value;
          emit(raw === "" ? (hasMin ? safeMin : 0) : Number(raw));
        }}
      />

      <div className="number-stepper-actions">
        <button
          type="button"
          className="number-stepper-btn"
          aria-label={increaseAriaLabel}
          disabled={disabled || (hasMax && baseValue >= safeMax)}
          onClick={() => emit(baseValue + safeStep)}
        >
          +
        </button>
        <button
          type="button"
          className="number-stepper-btn"
          aria-label={decreaseAriaLabel}
          disabled={disabled || (hasMin && baseValue <= safeMin)}
          onClick={() => emit(baseValue - safeStep)}
        >
          -
        </button>
      </div>
    </div>
  );
}
