import { useState, useEffect } from 'react';
import { formatNumber } from '../../utils/formatters';

export const FormattedInput = ({ value, onChange, className }) => {
  const [displayVal, setDisplayVal] = useState(formatNumber(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) setDisplayVal(formatNumber(value));
  }, [value, isFocused]);

  const handleChange = (e) => {
    const val = e.target.value;
    setDisplayVal(val);
    const rawValue = val.replace(/,/g, '');
    if (!isNaN(rawValue) && rawValue !== '') onChange(rawValue);
    else if (rawValue === '') onChange(0);
  };

  return (
    <input
      type="text"
      value={displayVal}
      onChange={handleChange}
      onFocus={() => { setIsFocused(true); setDisplayVal(value ? value.toString() : ''); }}
      onBlur={() => { setIsFocused(false); setDisplayVal(formatNumber(value)); }}
      className={className}
    />
  );
};
