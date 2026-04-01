// Single source of truth for ZUS rates 2026
// Update ZUS_RATES_UPDATED when rates change

export const ZUS_RATES_UPDATED = "2026-03"
export const ZUS_BASE_2026 = 5203.89 // zł — podstawa wymiaru (60% prognozowanego wynagrodzenia)

export const ZUS_SPOLECZNE_PELNY = {
  emerytalna:   { rate: 0.1952, amount: 1015.78 },
  rentowa:      { rate: 0.0800, amount: 416.30  },
  chorobowa:    { rate: 0.0245, amount: 127.49  },
  wypadkowa:    { rate: 0.0167, amount: 86.90   }, // domyślna, bez pracowników
  funduszPracy: { rate: 0.0245, amount: 127.49  },
  total: 1773.96,
}

// Zdrowotna — dynamiczna, nie stała
export function calculateZdrowotna(
  dochod: number,
  forma: "skala" | "liniowy" | "ryczalt",
  ryczaltPrzychod?: number
): number {
  const MIN = 314.96
  if (forma === "skala")   return Math.max(dochod * 0.09, MIN)
  if (forma === "liniowy") return Math.max(dochod * 0.049, MIN)
  if (forma === "ryczalt") {
    if (!ryczaltPrzychod) return MIN
    if (ryczaltPrzychod <= 60000)  return 461.66
    if (ryczaltPrzychod <= 300000) return 769.43
    return 1384.97
  }
  return MIN
}

export const ZUS_PREFERENCYJNY = {
  // pierwsze 6 mies lub mały ZUS plus
  emerytalna:   { rate: 0.1952, amount: 200.38 }, // podstawa 30% minpay
  rentowa:      { rate: 0.0800, amount: 82.08  },
  chorobowa:    { rate: 0.0245, amount: 25.14  },
  wypadkowa:    { rate: 0.0167, amount: 17.13  },
  funduszPracy: { rate: 0.0000, amount: 0      }, // brak FP na preferencyjnym
  total: 324.73,
}

export function calculateZUS(
  dochod: number,
  typ: "pelny" | "preferencyjny",
  forma: "skala" | "liniowy" | "ryczalt",
  ryczaltPrzychod?: number
) {
  const spoleczne = typ === "pelny"
    ? ZUS_SPOLECZNE_PELNY
    : ZUS_PREFERENCYJNY
  const zdrowotna = calculateZdrowotna(dochod, forma, ryczaltPrzychod)
  return {
    spoleczne,
    zdrowotna,
    total: spoleczne.total + zdrowotna,
  }
}
