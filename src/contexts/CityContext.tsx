import React, { createContext, useContext, useState } from 'react';
import type { Cidade, } from '@/types/database';
import { CIDADES } from '@/types/database';

interface CityContextType {
  selectedCity: Cidade | null;
  setSelectedCity: (city: Cidade | null) => void;
}

const CityContext = createContext<CityContextType | undefined>(undefined);

const getStoredCity = (): Cidade | null => {
  try {
    const stored = localStorage.getItem('technet_selected_city');
    if (stored && (CIDADES as readonly string[]).includes(stored)) {
      return stored as Cidade;
    }
  } catch {}
  return null;
};

export const CityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCity, setSelectedCityState] = useState<Cidade | null>(getStoredCity);

  const setSelectedCity = (city: Cidade | null) => {
    setSelectedCityState(city);
    try {
      if (city) {
        localStorage.setItem('technet_selected_city', city);
      } else {
        localStorage.removeItem('technet_selected_city');
      }
    } catch {}
  };

  return (
    <CityContext.Provider value={{ selectedCity, setSelectedCity }}>
      {children}
    </CityContext.Provider>
  );
};

export const useCity = () => {
  const context = useContext(CityContext);
  if (!context) throw new Error('useCity must be used within CityProvider');
  return context;
};
