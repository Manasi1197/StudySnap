import React from 'react';
import { Languages } from 'lucide-react';
import { SUPPORTED_LANGUAGES, getLanguageFlag } from '../lib/lingo';

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (languageCode: string) => void;
  className?: string;
  showFlag?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageChange,
  className = '',
  showFlag = true
}) => {
  const currentLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === selectedLanguage);

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center space-x-2">
        <Languages className="w-4 h-4 text-gray-500" />
        <select
          value={selectedLanguage}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
        >
          {SUPPORTED_LANGUAGES.map((language) => (
            <option key={language.code} value={language.code}>
              {showFlag ? `${language.flag} ${language.name}` : language.name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Custom dropdown arrow */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};

export default LanguageSelector;