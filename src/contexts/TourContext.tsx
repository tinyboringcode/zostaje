"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface TourStep {
  id: string;
  href: string;
  title: string;
  description: string;
  tip: string;
}

export const TOUR_STEPS: TourStep[] = [
  { id: "welcome", href: "/", title: "Witaj w CashFlow JDG!", description: "To Twój finansowy panel kontrolny. Wszystkie kluczowe dane firmy w jednym miejscu — przychody, koszty, podatki, faktury i prognozy.", tip: "Zacznij od skonfigurowania ustawień — kliknij ikonę koła zębatego w menu." },
  { id: "transactions", href: "/transactions", title: "Transakcje", description: "Tu dodajesz wszystkie przychody i wydatki. Każda transakcja trafia do raportu i wpływa na obliczenia podatkowe i wskaźniki.", tip: "Możesz szybko dodać transakcję przyciskiem + w prawym dolnym rogu ekranu." },
  { id: "import", href: "/import", title: "Import", description: "Importuj transakcje z pliku CSV, KSeF (e-faktury) lub folderu z plikami. Oszczędzasz czas na ręcznym wpisywaniu.", tip: "Obsługujemy formaty CSV z większości banków — PKO, mBank, ING, Santander." },
  { id: "historia", href: "/historia", title: "Historia finansowa", description: "Masz już działalność? Zaimportuj dotychczasową historię transakcji, aby raporty i wskaźniki były od razu dokładne.", tip: "Możesz importować po roku lub kwartale — system nie duplikuje danych." },
  { id: "contractors", href: "/contractors", title: "Kontrahenci", description: "Zarządzaj klientami i dostawcami. Wystawiaj faktury, śledź terminy płatności, sprawdzaj NIP w rejestrze MF.", tip: "Po dodaniu NIP system automatycznie pobierze nazwę i adres firmy z rejestru VAT." },
  { id: "categories", href: "/categories", title: "Kategorie", description: "Porządkuj wydatki w kategorie (marketing, IT, biuro, auto…). Dla kosztów mieszanych ustaw % odliczenia (np. auto = 75%).", tip: "Kategorie z ikoną 🏠 lub 🚗 często mają koszt mieszany — ustaw % w ustawieniach kategorii." },
  { id: "budgets", href: "/budgets", title: "Budżety", description: "Ustal limity wydatków dla każdej kategorii. System powiadomi Cię e-mailem gdy przekroczysz próg (domyślnie 80%).", tip: "Budżety liczone są miesięcznie. Alerty e-mail konfigurujesz w Ustawieniach." },
  { id: "reports", href: "/reports", title: "Raporty", description: "Szczegółowe raporty miesięczne i roczne: przychody, koszty wg kategorii, wykresy, eksport PDF i CSV.", tip: "Raport roczny przyda się przy rozliczeniu PIT — zawiera podsumowanie YTD." },
  { id: "wskazniki", href: "/wskazniki", title: "Wskaźniki finansowe", description: "Zaawansowane KPI: runway (ile miesięcy przeżyjesz bez przychodu), burn rate, prognoza 3-miesięczna, koncentracja klientów.", tip: "Runway poniżej 3 miesięcy to sygnał ostrzegawczy — zbuduj poduszkę finansową." },
  { id: "podatki", href: "/podatki", title: "Podatki i ZUS", description: "Obliczenia ZUS, zaliczek PIT i składki zdrowotnej na podstawie Twoich transakcji. Symulator porównuje skala vs liniowy vs ryczałt.", tip: "Przed wyborem formy opodatkowania uruchom symulator — różnica może być kilka tysięcy zł rocznie!" },
  { id: "cykl", href: "/cykl", title: "Cykl finansowy", description: "Algorytmiczna analiza wzorców wydatków: trendy, sezonowość, koszty cykliczne, zmienność cashflow. Bez AI — czysta matematyka.", tip: "Rosnące koszty i wysoka zmienność cashflow to najczęstsze ostrzeżenia — sprawdź je regularnie." },
  { id: "ai-demo", href: "/ai-demo", title: "Demo AI", description: "Interaktywny symulator pokazuje jak AI może prognozować finanse. Dodaj lokalny model Ollama, aby włączyć analizę AI na prawdziwych danych.", tip: "Ollama to darmowe, lokalne AI — dane nigdy nie opuszczają Twojego komputera." },
  { id: "wiedza", href: "/wiedza", title: "Baza wiedzy", description: "Kompendium pojęć finansowych, podstaw księgowości i opisu wszystkich wskaźników. Nie wiesz co oznacza 'burn rate'? Sprawdź tutaj.", tip: "Baza wiedzy jest zawsze dostępna bez logowania i zawiera wyjaśnienia dostosowane do JDG." },
  { id: "settings", href: "/settings", title: "Ustawienia", description: "Skonfiguruj dane firmy, formę opodatkowania, etap ZUS, VAT, powiadomienia e-mail, numerację faktur i podłącz Ollama AI.", tip: "Uzupełnij NIP i datę założenia firmy — pozwoli to dokładnie obliczyć składki ZUS i zobowiązania." },
];

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  step: TourStep | null;
  start: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  activeHref: string | null;
}

const TourContext = createContext<TourContextType>({
  isActive: false, currentStep: 0, totalSteps: TOUR_STEPS.length,
  step: null, start: () => {}, stop: () => {}, next: () => {}, prev: () => {}, goTo: () => {}, activeHref: null,
});

export function TourProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem("tour-completed");
    if (!seen) {
      // Small delay so page renders first
      setTimeout(() => setIsActive(true), 1500);
    }
  }, []);

  const start = () => { setCurrentStep(0); setIsActive(true); };
  const stop = () => { setIsActive(false); localStorage.setItem("tour-completed", "1"); };
  const next = () => {
    if (currentStep < TOUR_STEPS.length - 1) setCurrentStep((s) => s + 1);
    else stop();
  };
  const prev = () => { if (currentStep > 0) setCurrentStep((s) => s - 1); };
  const goTo = (i: number) => setCurrentStep(i);
  const step = isActive ? TOUR_STEPS[currentStep] : null;
  const activeHref = step?.href ?? null;

  return (
    <TourContext.Provider value={{ isActive, currentStep, totalSteps: TOUR_STEPS.length, step, start, stop, next, prev, goTo, activeHref }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() { return useContext(TourContext); }
