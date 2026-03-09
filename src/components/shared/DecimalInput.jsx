import { useState, useEffect } from 'react';

export const DecimalInput = ({ value, onChange, className, precision = 4 }) => {
  const [localVal, setLocalVal] = useState(value?.toFixed(precision));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused && value !== undefined && value !== null) setLocalVal(value.toFixed(precision));
  }, [value, isFocused, precision]);

  const handleChange = (e) => {
    const val = e.target.value;
    if (/^\d*\.?\d*$/.test(val)) {
      setLocalVal(val);
      const num = parseFloat(val);
      if (!isNaN(num)) onChange(num);
    }
  };

  return (
    <input
      type="text"
      value={localVal}
      onChange={handleChange}
      onFocus={() => setIsFocused(true)}
      onBlur={() => { setIsFocused(false); if (value) setLocalVal(value.toFixed(precision)); }}
      className={className}
    />
  );
};
