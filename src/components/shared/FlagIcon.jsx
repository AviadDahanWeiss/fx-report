import { Globe } from 'lucide-react';
import { CURRENCY_TO_COUNTRY } from '../../constants/currencies';

export const FlagIcon = ({ code, className = "w-5 h-auto rounded-[2px]" }) => {
  const countryCode = CURRENCY_TO_COUNTRY[code];
  if (!countryCode) return <Globe size={14} className="text-gray-400" />;
  return (
    <img
      src={`https://flagcdn.com/w40/${countryCode}.png`}
      srcSet={`https://flagcdn.com/w80/${countryCode}.png 2x`}
      alt={code}
      crossOrigin="anonymous"
      className={`${className} shadow-sm object-cover`}
    />
  );
};
