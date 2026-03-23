"use client";
import { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronUp, AlertTriangle, Info, BookOpen } from "lucide-react";

interface KnowledgeItem {
  term: string;
  definition: string;
  warning?: string;
  tip?: string;
}

interface KnowledgeSection {
  id: string;
  emoji: string;
  title: string;
  items: KnowledgeItem[];
}

const SECTIONS: KnowledgeSection[] = [
  {
    id: "podstawy",
    emoji: "📊",
    title: "Podstawy finansowe JDG",
    items: [
      {
        term: "Przychód vs dochód vs zysk",
        definition: "**Przychód** to wszystkie pieniądze, które wpłynęły na konto z tytułu sprzedaży (faktury, umowy). **Dochód** to przychód pomniejszony o koszty uzyskania przychodu — to podstawa opodatkowania PIT. **Zysk** to dochód po odliczeniu podatków i składek ZUS — to co faktycznie zostaje w kieszeni.",
        tip: "Przykład: przychód 10 000 zł, koszty 3 000 zł → dochód 7 000 zł. Po ZUS (1 600 zł) i PIT (19%) → zysk ok. 4 070 zł.",
      },
      {
        term: "Cashflow vs zysk — dlaczego firma zarabia ale nie ma kasy",
        definition: "**Zysk** to liczba w arkuszu kalkulacyjnym — różnica przychodów i kosztów. **Cashflow** to rzeczywisty przepływ pieniędzy przez konto. Firma może wykazywać zysk ale mieć ujemny cashflow, gdy klienci nie płacą faktur w terminie, gdy poniosła duże wydatki z góry lub gdy wydatki i przychody są przesunięte w czasie.",
        warning: "Najczęstsza przyczyna upadku firm to nie brak zysku, lecz brak płynności finansowej (ujemny cashflow).",
        tip: "Monitoruj nie tylko zysk, ale też saldo konta i terminy płatności faktur.",
      },
      {
        term: "Koszt uzyskania przychodu — co można odliczyć",
        definition: "**Koszt uzyskania przychodu (KUP)** to wydatek poniesiony w celu osiągnięcia, zabezpieczenia lub zachowania przychodu. Odliczamy go od przychodu przed naliczeniem podatku. Przykłady: sprzęt komputerowy, oprogramowanie, biuro, telefon służbowy, szkolenia zawodowe, materiały biurowe, usługi zewnętrzne, paliwo do auta firmowego.",
        tip: "Wydatek musi być udokumentowany fakturą lub rachunkiem. Zachowaj wszystkie dokumenty przez 5 lat.",
      },
      {
        term: "Koszty mieszane — auto 75%, telefon 50%",
        definition: "**Koszty mieszane** to wydatki używane zarówno do celów służbowych jak i prywatnych. Urząd skarbowy pozwala odliczać tylko część proporcjonalną do użytku firmowego. Standardowe wskaźniki: **samochód osobowy = 75%** odliczenia (od 2019), **telefon = 50%** jeśli używany prywatnie, **laptop/sprzęt = 50-100%** zależnie od użytkowania.",
        warning: "Auto osobowe: max 75% VAT i kosztów. Jeśli prowadzisz ewidencję przebiegu pojazdu i auto jest wyłącznie firmowe — możesz odliczać 100%.",
      },
    ],
  },
  {
    id: "opodatkowanie",
    emoji: "📋",
    title: "Formy opodatkowania",
    items: [
      {
        term: "Skala podatkowa (12%/32%)",
        definition: "**Skala podatkowa** to progresywny podatek dochodowy. Próg I: 12% od dochodu do 120 000 zł rocznie. Próg II: 32% od nadwyżki powyżej 120 000 zł. **Kwota wolna od podatku: 30 000 zł** rocznie — oznacza to, że od pierwszych 30 000 zł dochodu nie płacisz PIT. Możliwość łączenia dochodów z małżonkiem (wspólne rozliczenie). Możliwość korzystania z ulg podatkowych (prorodzinna, IKZE, nowe technologie).",
        tip: "Dla osób z niskim dochodem (poniżej 85 000 zł rocznie) skala jest zwykle korzystniejsza niż liniowy ze względu na kwotę wolną.",
      },
      {
        term: "Liniowy 19% — stała stawka, bez kwoty wolnej",
        definition: "**Podatek liniowy** to stała stawka 19% niezależnie od wysokości dochodu. Brak kwoty wolnej od podatku. Brak możliwości wspólnego rozliczenia z małżonkiem. Ograniczone ulgi — brak ulgi prorodzinnej. Możliwe odliczenie składek ZUS i IKZE. Korzystny gdy roczny dochód przekracza ok. 120 000 zł (omijasz 32%).",
        tip: "Przy dochodzie 200 000 zł: skala = ok. 43 200 zł PIT, liniowy = 38 000 zł PIT. Różnica ok. 5 200 zł na korzyść liniowego.",
      },
      {
        term: "Ryczałt — stawki od 2% do 17%, brak odliczenia kosztów",
        definition: "**Ryczałt od przychodów ewidencjonowanych** to uproszczona forma opodatkowania przychodów (bez odliczania kosztów). Stawki zależne od rodzaju działalności: **2%** — handel towarami, **3%** — usługi gastronomiczne, **5.5%** — roboty budowlane, **8.5%** — działalność usługowa, **12%** — usługi IT (programowanie, software), **15%** — wolne zawody, pośrednictwo, **17%** — najem prywatny powyżej limitu. Korzystny gdy masz niskie koszty (poniżej 30-40% przychodu).",
        warning: "Na ryczałcie nie odliczasz kosztów. Jeśli Twoje koszty to ponad 40% przychodu, ryczałt może być droższy niż skala lub liniowy.",
      },
      {
        term: "Jak wybrać formę opodatkowania",
        definition: "Wybór formy opodatkowania zależy od: poziomu przychodów, wysokości kosztów, rodzaju działalności. **Ryczałt 12%** jest korzystny dla programistów i usług IT z niskimi kosztami (dochód = przychód × (1 - 0.12) = 88% przychodu). **Liniowy 19%** opłaca się gdy roczny dochód > 120 000 zł i masz duże koszty do odliczenia. **Skala** jest zwykle najlepsza dla niskich dochodów (do 85 000 zł) lub gdy korzystasz z ulg rodzinnych.",
        tip: "Użyj symulatora podatków w aplikacji — wpisz swój szacowany przychód i koszty, a system pokaże różnicę dla każdej formy.",
      },
    ],
  },
  {
    id: "zus",
    emoji: "🏛️",
    title: "ZUS i składki",
    items: [
      {
        term: "Ulga na start — pierwsze 6 miesięcy",
        definition: "**Ulga na start** przysługuje nowym przedsiębiorcom przez 6 pełnych miesięcy od pierwszego dnia działalności. W tym okresie **nie płacisz składek społecznych ZUS** (emerytalnej, rentowej, wypadkowej, chorobowej). Płacisz tylko **składkę zdrowotną**. Warunek: nie prowadziłeś działalności w ciągu ostatnich 60 miesięcy i nie świadczysz usług dla byłego pracodawcy.",
        tip: "Ulga na start to oszczędność ok. 900-1 400 zł miesięcznie na składkach społecznych przez pół roku.",
      },
      {
        term: "Mały ZUS — następne 24 miesiące",
        definition: "Po uldze na start możesz przez **24 miesiące** płacić obniżone składki społeczne ZUS. Podstawa wymiaru = **30% minimalnego wynagrodzenia** (w 2025 r. ok. 1 260 zł). Składki społeczne wynoszą ok. 420-500 zł miesięcznie (zamiast ~1 600 zł przy pełnym ZUS). Plus składka zdrowotna naliczana od przychodu lub ryczałtowo.",
        tip: "Łącznie Ulga na start + Mały ZUS dają Ci 30 miesięcy preferencyjnych składek od startu działalności.",
      },
      {
        term: "Mały ZUS Plus — po spełnieniu warunków dochodowych",
        definition: "**Mały ZUS Plus** to kolejna ulga po Małym ZUS, dostępna przez **36 miesięcy** (3 lata). Podstawa wymiaru zależy od dochodu z poprzedniego roku — min. 30% minimalnego, max. 60% prognozowanego wynagrodzenia. Warunek dochodowy: roczny dochód z działalności nie przekroczył 120 000 zł w poprzednim roku. Nie mogą z niej korzystać rozliczający się na karcie podatkowej.",
        warning: "Mały ZUS Plus obniża emerytury w przyszłości — płacisz mniej teraz, ale masz niższe świadczenie emerytalne.",
      },
      {
        term: "Pełny ZUS — od podstawy 5 203,80 zł",
        definition: "**Pełny ZUS** to standardowe składki dla przedsiębiorców po wyczerpaniu ulg. Podstawa wymiaru = **60% prognozowanego przeciętnego wynagrodzenia** (w 2025 r. ok. 5 203,80 zł). Składki: emerytalna (19,52%), rentowa (8%), wypadkowa (1,67%), chorobowa opcjonalnie (2,45%), Fundusz Pracy (2,45%). Łącznie ok. 1 600-1 800 zł miesięcznie bez zdrowotnej.",
      },
      {
        term: "Składka zdrowotna — 4,9%, 9% lub ryczałtowa",
        definition: "**Składka zdrowotna** zależy od formy opodatkowania: **Liniowy 19%**: 4,9% dochodu (min. 9% minimalnego wynagrodzenia). **Skala podatkowa**: 9% dochodu (min. 9% minimalnego wynagrodzenia). **Ryczałt**: stawka ryczałtowa zależna od poziomu przychodu — 3 progi: do 60 000 zł, 60 000-300 000 zł, powyżej 300 000 zł. Składka zdrowotna NIE jest już odliczalna od podatku (od 2022 r.) — z wyjątkiem częściowego odliczenia na ryczałcie (50%) i liniowym (do limitu).",
        warning: "Od 2022 r. zniesiono możliwość odliczenia składki zdrowotnej od podatku na skali. To zwiększyło faktyczne obciążenie o kilkaset złotych miesięcznie.",
      },
      {
        term: "Terminy ZUS — do 20. każdego miesiąca",
        definition: "Składki ZUS za dany miesiąc należy zapłacić **do 20. dnia następnego miesiąca**. Przykład: składki za styczeń → płatne do 20 lutego. Jeśli 20. wypada w weekend lub święto, termin przesuwa się na następny dzień roboczy. Opóźnienie skutkuje naliczeniem odsetek ustawowych (od 2024 r. 8% w skali roku).",
        tip: "Ustaw stałe zlecenie w banku na 18. każdego miesiąca — masz bufor na wypadek weekendu lub błędnego numeru rachunku.",
      },
    ],
  },
  {
    id: "faktury",
    emoji: "🧾",
    title: "Faktury i VAT",
    items: [
      {
        term: "Kiedy wystawiać fakturę — co musi zawierać",
        definition: "Fakturę wystawiasz gdy dokonujesz sprzedaży towarów lub usług. Termin: do **15. dnia miesiąca następnego** po miesiącu, w którym powstał obowiązek podatkowy. Obowiązkowe elementy faktury: data wystawienia, kolejny numer, dane sprzedawcy (nazwa, adres, NIP), dane nabywcy, data dokonania/zakończenia dostawy, nazwa towaru/usługi, ilość, cena netto, stawka VAT, kwota VAT, kwota brutto.",
        tip: "Możesz wystawiać faktury w aplikacji CashFlow — sekcja Kontrahenci → wybierz klienta → Wystaw fakturę.",
      },
      {
        term: "Termin płatności — standardowy 14/30 dni",
        definition: "Standardowy termin płatności to **30 dni** od daty wystawienia faktury (dla transakcji B2B). W transakcjach z podmiotami publicznymi max. 30 dni. Możesz ustalić dowolny termin — 7, 14, 60, 90 dni. Od 2020 r. tzw. **ulga za złe długi** pozwala zmniejszyć przychód o niezapłacone faktury po 90 dniach od upływu terminu płatności.",
      },
      {
        term: "Faktura przeterminowana — co robić",
        definition: "Gdy klient nie płaci: (1) wyślij przypomnienie e-mailem po upływie terminu, (2) po 14 dniach zadzwoń, (3) po 30 dniach wyślij oficjalne wezwanie do zapłaty z odsetkami ustawowymi, (4) po 90 dniach możesz zastosować **ulgę za złe długi** i zmniejszyć podstawę opodatkowania, (5) sprawa sądowa lub windykacja. Odsetki ustawowe za opóźnienie w transakcjach handlowych w 2025 r.: 11,75% w skali roku.",
        warning: "Nie czekaj zbyt długo — po 3 latach roszczenie ulega przedawnieniu.",
      },
      {
        term: "VAT-owiec vs zwolniony — progi i deklaracje",
        definition: "**Zwolnienie z VAT** przysługuje gdy obrót nie przekroczył 200 000 zł w roku poprzednim (lub proporcjonalnie w roku pierwszym). Będąc zwolnionym: nie doliczasz VAT do faktur, nie odliczasz VAT od zakupów, wystawiasz faktury bez VAT (FVZ). **VAT-owiec**: rejestracja do VAT (VAT-R), wystawiasz faktury z VAT, składasz deklarację VAT-7 (miesięcznie) lub VAT-7K (kwartalnie), odliczasz VAT od zakupów firmowych.",
        tip: "Często warto zarejestrować się do VAT nawet przed przekroczeniem limitu — możesz odliczyć VAT od zakupów sprzętu i usług.",
      },
      {
        term: "KSeF — elektroniczne faktury od 2026",
        definition: "**KSeF (Krajowy System e-Faktur)** to obowiązkowy system elektronicznych faktur. Obowiązek dla VAT-owców: **od 1 lutego 2026 r.** (dla firm z obrotem powyżej 200 mln zł w 2025 r. od 1 listopada 2025 r.). Faktury wystawiane i otrzymywane przez rządy platformę. Korzyści: szybszy zwrot VAT (15 dni zamiast 60), automatyczne rozliczenia, mniejsze ryzyko kontroli.",
        tip: "Aplikacja CashFlow obsługuje KSeF — możesz importować faktury bezpośrednio z systemu rządowego.",
      },
    ],
  },
  {
    id: "wskazniki",
    emoji: "📈",
    title: "Wskaźniki finansowe",
    items: [
      {
        term: "Runway — ile miesięcy przeżyjesz bez przychodu",
        definition: "**Runway** = stan kasy (gotówka + płynne aktywa) ÷ miesięczny burn rate (koszty). Wynik podawany w miesiącach. Pokazuje jak długo firma może działać bez nowych przychodów.",
        warning: "Poniżej 3 miesięcy: ALARM — pilnie działaj. 3-6 miesięcy: ostrzeżenie, buduj poduszkę. Powyżej 6 miesięcy: bezpieczny poziom.",
        tip: "Buduj poduszkę finansową na co najmniej 3 miesiące kosztów. Najlepiej trzymać ją na koncie oszczędnościowym lub lokacie overnight.",
      },
      {
        term: "Burn rate — miesięczne spalanie pieniędzy",
        definition: "**Burn rate** to łączna suma wydatków w miesiącu — czyli jak szybko 'spalasz' pieniądze. Gross burn rate = wszystkie wydatki. Net burn rate = wydatki minus przychody (może być ujemny = firma zarabia). Kluczowy wskaźnik dla startupów i freelancerów do planowania budżetu i oceny trwałości modelu biznesowego.",
      },
      {
        term: "Zmienność cashflow — odchylenie standardowe",
        definition: "**Zmienność cashflow** = (odchylenie standardowe miesięcznego cashflow ÷ średni cashflow) × 100%. Mierzy jak bardzo Twoje dochody i wydatki 'skaczą' miesiąc do miesiąca. Niska zmienność = przewidywalny biznes. Wysoka zmienność = trudniejsze planowanie i większe ryzyko.",
        warning: "Zmienność powyżej 60% to sygnał ryzyka — masz zbyt mało przewidywalnych przychodów lub zbyt sezonowe koszty.",
      },
      {
        term: "Koncentracja przychodów — ryzyko uzależnienia od klienta",
        definition: "**Koncentracja przychodów** = (przychód od jednego klienta ÷ łączny przychód) × 100%. Mierzy jak bardzo zależysz od jednego lub kilku klientów. Im wyższy procent, tym większe ryzyko utraty całego biznesu przy odejściu klienta.",
        warning: "Powyżej 70% przychodów od jednego klienta to ryzyko krytyczne. Dywersyfikuj portfel klientów — cel to maks. 30% od jednego klienta.",
      },
      {
        term: "Break-even — punkt rentowności",
        definition: "**Break-even** = suma stałych kosztów miesięcznie = minimalne przychody pokrywające koszty. Poniżej break-even generujesz stratę. Powyżej — zysk. Formuła: Break-even = Koszty stałe ÷ (1 - Koszty zmienne / Przychód). Dla freelancera lub usług: Break-even ≈ suma wszystkich kosztów stałych (ZUS, czynsz, subskrypcje, inne stałe).",
        tip: "Znając break-even wiesz jaka minimalna liczba godzin/projektów/zleceń miesięcznie jest Ci potrzebna do wyjścia na zero.",
      },
      {
        term: "Trend (nachylenie) — kierunek zmian w czasie",
        definition: "**Trend** to kierunek, w którym zmierza dany wskaźnik finansowy. Obliczany metodą regresji liniowej na serii danych miesięcznych. Pozytywny trend przychodów = rosnąca sprzedaż. Negatywny trend zysku przy rosnących przychodach = rosnące koszty szybciej niż sprzedaż (sygnał ostrzegawczy).",
      },
      {
        term: "Marża netto — ile zostaje z każdej złotówki",
        definition: "**Marża netto** = (zysk netto ÷ przychód) × 100%. Pokazuje ile procent przychodu zostaje po pokryciu wszystkich kosztów i podatków. Przykład: przychód 10 000 zł, zysk 3 500 zł → marża netto = 35%. Dla freelancerów i JDG typowa marża netto to 30-55% (zależnie od kosztów i formy opodatkowania).",
        tip: "Jeśli Twoja marża spada z miesiąca na miesiąc, szukaj rosnących kosztów lub spadających stawek.",
      },
    ],
  },
  {
    id: "raporty",
    emoji: "🔍",
    title: "Jak czytać raporty",
    items: [
      {
        term: "Raport miesięczny — interpretacja",
        definition: "**Raport miesięczny** podsumowuje przychody, koszty i zysk za dany miesiąc. Kluczowe elementy: całkowite przychody, koszty podzielone na kategorie, zysk brutto (przed ZUS i PIT), szacunkowe zobowiązania podatkowe, porównanie do poprzedniego miesiąca (delta), porównanie do planu/budżetu.",
        tip: "Sprawdzaj raport do 5. każdego miesiąca — masz jeszcze czas na korektę wydatków przed kolejnym cyklem.",
      },
      {
        term: "Wykres cashflow — słupki dochodów vs wydatków",
        definition: "**Wykres cashflow** pokazuje przychody (zielone słupki) i wydatki (czerwone słupki) w układzie miesięcznym. Gdy zielone słupki są wyższe od czerwonych — jesteś na plusie. Linia trendu pokazuje ogólny kierunek. Sezonowość widoczna jako regularny wzorzec w określonych miesiącach roku.",
      },
      {
        term: "Top kategorie — pie chart wydatków",
        definition: "**Wykres kołowy kategorii** pokazuje strukturę kosztów — co pochłania największą część budżetu. Pozwala szybko zidentyfikować kategorie do optymalizacji. Typowe dominujące kategorie dla JDG: ZUS i podatki (20-40%), biuro i sprzęt (10-20%), marketing (5-15%), podwykonawcy (0-40%).",
      },
      {
        term: "Trend rok do roku (YoY)",
        definition: "**Porównanie rok do roku (YoY)** zestawia bieżący okres z analogicznym w poprzednim roku. Uwzględnia sezonowość — porównujesz np. marzec tego roku do marca zeszłego roku. Wzrost YoY to sygnał rozwoju firmy. Spadek YoY to sygnał do analizy przyczyn.",
      },
    ],
  },
  {
    id: "pit",
    emoji: "📆",
    title: "Rozliczenie roczne",
    items: [
      {
        term: "PIT-36 (skala) i PIT-36L (liniowy) — terminy",
        definition: "**PIT-36** składasz przy opodatkowaniu na zasadach ogólnych (skala podatkowa). **PIT-36L** przy podatku liniowym. Termin złożenia: **do 30 kwietnia** roku następnego (za rok 2025 → do 30 kwietnia 2026). Możesz złożyć wcześniej — wtedy ewentualny zwrot podatku dostaniesz szybciej (zwykle w ciągu 45 dni). Złożenie przez internet (e-Urząd Skarbowy): termin ten sam, ale automatyczne potwierdzenie.",
        tip: "Przy ryczałcie składasz PIT-28 (do 30 kwietnia) i ewentualnie PIT-36 jeśli masz inne dochody.",
      },
      {
        term: "Składka zdrowotna — rozliczenie roczne",
        definition: "**Roczne rozliczenie składki zdrowotnej** wprowadzono od 2022 r. dla przedsiębiorców na skali i liniowym. Po zakończeniu roku obliczasz rzeczywistą składkę od faktycznego dochodu. Jeśli w ciągu roku płaciłeś za mało — dopłacasz różnicę. Jeśli za dużo — nadpłata przepada (NIE jest zwracana, z wyjątkiem niektórych sytuacji). Termin: do 31 maja roku następnego.",
        warning: "Nadpłata składki zdrowotnej nie jest zwracana — planuj wpłaty tak, żeby nie przepłacać.",
      },
      {
        term: "Co przygotować do rocznego rozliczenia",
        definition: "Do rozliczenia rocznego przygotuj: (1) **potwierdzenia wpłat ZUS** — wydruk z ZUS lub konto PUE, (2) **faktury kosztowe** — dowody poniesionych kosztów, (3) **faktury przychodowe** — lista wystawionych faktur, (4) **wyciągi bankowe** — potwierdzenie transakcji, (5) **KPiR lub ewidencja ryczałtu** — księga z całego roku, (6) **umowy** — umowy zlecenia, o dzieło, B2B.",
      },
      {
        term: "Ulgi podatkowe dla JDG",
        definition: "Dostępne ulgi dla przedsiębiorców: **IKZE** (Indywidualne Konto Zabezpieczenia Emerytalnego) — odliczenie wpłat od dochodu, limit 2024: 9 388,80 zł, **darowizny** — odliczenie do 6% dochodu, **ulga na nowe technologie** — 50% odliczenia kosztów nabycia nowej technologii (aplikacje, systemy), **ulga B+R** — na badania i rozwój, **ulga na zatrudnienie innowacyjnych pracowników**, **ulga na ekspansję** (nowi klienci za granicą).",
        tip: "IKZE to podwójna korzyść: odliczenie podatkowe teraz + oszczędności emerytalne. Przy liniowym 19% = natychmiastowy zwrot 19% wpłaty.",
      },
    ],
  },
  {
    id: "ksiegowosc",
    emoji: "📚",
    title: "Podstawy księgowości JDG",
    items: [
      {
        term: "KPiR — Książka Przychodów i Rozchodów",
        definition: "**KPiR (Podatkowa Księga Przychodów i Rozchodów)** to podstawowy dokument ewidencji dla JDG opodatkowanej na zasadach ogólnych lub liniowo. Każdy przychód i koszt wpisujesz chronologicznie. Kolumny: data, nr dowodu, kontrahent, opis, przychód ze sprzedaży, pozostałe przychody, zakup towarów, koszty uboczne zakupu, wynagrodzenia, inne wydatki, uwagi. Możesz prowadzić ją elektronicznie (np. w aplikacji księgowej).",
        tip: "CashFlow JDG nie zastępuje KPiR — skonsultuj się z księgowym jak eksportować dane do Twojej ewidencji.",
      },
      {
        term: "Ewidencja ryczałtu",
        definition: "Na **ryczałcie** prowadzisz uproszczoną ewidencję przychodów (nie kosztów). Nie musisz dokumentować wydatków dla celów podatkowych (choć warto dla własnej kontroli). Ewidencja zawiera: datę wpisu, nr dowodu, kwotę przychodu, stawkę ryczałtu, wyliczony podatek. Prowadzona chronologicznie, odrębnie dla każdej stawki ryczałtu.",
      },
      {
        term: "Amortyzacja — środki trwałe powyżej 10 000 zł",
        definition: "**Amortyzacja** to rozliczanie w czasie kosztu zakupu składników majątku firmowego (środków trwałych). Środek trwały: wartość > 10 000 zł netto, używany ponad rok, dla celów firmowych. Przykłady i stawki amortyzacji: komputer/laptop 30% rocznie, samochód osobowy 20% rocznie, oprogramowanie 50% rocznie, meble biurowe 20% rocznie. Poniżej 10 000 zł → jednorazowo w koszty.",
        tip: "Możliwa jednorazowa amortyzacja do 100 000 zł (de minimis) lub 50 000 EUR — korzystne dla nowo zakupionych maszyn i sprzętu.",
      },
      {
        term: "Archiwizacja dokumentów — 5 lat",
        definition: "Dokumenty firmowe musisz przechowywać przez **5 lat od końca roku podatkowego**, którego dotyczą. Dokumenty: faktury, umowy, KPiR, wyciągi bankowe, deklaracje podatkowe, potwierdzenia ZUS, ewidencja środków trwałych. Możesz przechowywać w formie elektronicznej (skan) jeśli jest czytelny i autentyczny. Rok podatkowy 2024 → dokumenty przechowujesz do końca 2029 r.",
        warning: "Zniszczenie dokumentów przed upływem 5 lat może skutkować problemami przy kontroli skarbowej — kara finansowa lub utrata prawa do kosztów.",
      },
      {
        term: "Biuro rachunkowe vs samodzielna księgowość",
        definition: "**Biuro rachunkowe** (koszt: 200-800 zł/mies. dla JDG): prowadzi KPiR lub ewidencję ryczałtu, składa deklaracje podatkowe i ZUS, doradza w kwestiach podatkowych, odpowiada za błędy. **Samodzielna księgowość**: niższy koszt (aplikacje 50-150 zł/mies.), pełna kontrola, wymaga znajomości przepisów, ryzyko błędów na własną odpowiedzialność. **Hybryd**: aplikacja do bieżącego śledzenia finansów + raz w roku konsultacja z księgowym do rozliczenia.",
        tip: "Na początku działalności warto korzystać z biura rachunkowego — poznasz przepisy i unikniesz kosztownych błędów.",
      },
    ],
  },
];

const QUICK_GLOSSARY = [
  { term: "KUP", def: "Koszt Uzyskania Przychodu — wydatek odliczany od dochodu" },
  { term: "Runway", def: "Ile miesięcy firma przeżyje bez przychodu" },
  { term: "Burn rate", def: "Miesięczne wydatki firmy" },
  { term: "YTD", def: "Year To Date — od początku roku do dziś" },
  { term: "B2B", def: "Business to Business — sprzedaż firmom" },
  { term: "KPiR", def: "Książka Przychodów i Rozchodów" },
  { term: "VAT-7", def: "Miesięczna deklaracja VAT" },
  { term: "PIT-36L", def: "Roczne zeznanie przy podatku liniowym" },
  { term: "KSeF", def: "Krajowy System e-Faktur — elektroniczne faktury" },
  { term: "Break-even", def: "Punkt rentowności — minimalne przychody na pokrycie kosztów" },
  { term: "YoY", def: "Year over Year — porównanie rok do roku" },
  { term: "IKZE", def: "Indywidualne Konto Zabezpieczenia Emerytalnego — ulga podatkowa" },
];

function renderDefinition(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function AccordionSection({ section, isOpen, onToggle, searchQuery }: {
  section: KnowledgeSection;
  isOpen: boolean;
  onToggle: () => void;
  searchQuery: string;
}) {
  const filteredItems = useMemo(() => {
    if (!searchQuery) return section.items;
    const q = searchQuery.toLowerCase();
    return section.items.filter(
      (item) =>
        item.term.toLowerCase().includes(q) ||
        item.definition.toLowerCase().includes(q) ||
        item.tip?.toLowerCase().includes(q) ||
        item.warning?.toLowerCase().includes(q)
    );
  }, [section.items, searchQuery]);

  if (searchQuery && filteredItems.length === 0) return null;

  return (
    <div className="glass rounded-2xl overflow-hidden border border-white/10">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{section.emoji}</span>
          <span className="font-semibold text-base">{section.title}</span>
          <span className="text-xs text-muted-foreground bg-white/10 px-2 py-0.5 rounded-full">
            {filteredItems.length} {filteredItems.length === 1 ? "temat" : "tematów"}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-white/10 divide-y divide-white/5">
          {filteredItems.map((item) => (
            <div key={item.term} className="px-5 py-4">
              <h3 className="font-semibold text-sm mb-2 text-foreground">{item.term}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                {renderDefinition(item.definition)}
              </p>
              {item.warning && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400 leading-relaxed">{item.warning}</p>
                </div>
              )}
              {item.tip && (
                <div className="flex items-start gap-2 bg-primary/10 border border-primary/20 rounded-xl p-3">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-primary/90 leading-relaxed">{item.tip}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function KnowledgeClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(["podstawy"]));

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setOpenSections(new Set(SECTIONS.map((s) => s.id)));
  const collapseAll = () => setOpenSections(new Set());

  // Auto-expand all when searching
  const effectiveOpen = searchQuery
    ? new Set(SECTIONS.map((s) => s.id))
    : openSections;

  const totalItems = SECTIONS.reduce((sum, s) => sum + s.items.length, 0);

  const filteredSections = useMemo(() => {
    if (!searchQuery) return SECTIONS;
    const q = searchQuery.toLowerCase();
    return SECTIONS.filter((section) =>
      section.title.toLowerCase().includes(q) ||
      section.items.some(
        (item) =>
          item.term.toLowerCase().includes(q) ||
          item.definition.toLowerCase().includes(q) ||
          item.tip?.toLowerCase().includes(q) ||
          item.warning?.toLowerCase().includes(q)
      )
    );
  }, [searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold gradient-text">Baza wiedzy</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {totalItems} tematów finansowych dostosowanych do JDG — podatki, ZUS, wskaźniki, księgowość
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/20 text-muted-foreground hover:bg-white/10 transition-colors"
          >
            Rozwiń wszystkie
          </button>
          <button
            onClick={collapseAll}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/20 text-muted-foreground hover:bg-white/10 transition-colors"
          >
            Zwiń wszystkie
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Szukaj pojęcia, wskaźnika, przepisu..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 glass rounded-2xl border border-white/20 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors text-xs"
          >
            ✕ Wyczyść
          </button>
        )}
      </div>

      {/* Results count when searching */}
      {searchQuery && (
        <div className="text-sm text-muted-foreground">
          Wyniki dla: <strong>&quot;{searchQuery}&quot;</strong> — znaleziono w {filteredSections.length} sekcjach
        </div>
      )}

      {/* Sections */}
      <div className="space-y-3">
        {filteredSections.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <div className="font-semibold mb-1">Nie znaleziono wyników</div>
            <div className="text-sm text-muted-foreground">Spróbuj innego hasła lub przeglądaj sekcje poniżej</div>
          </div>
        ) : (
          filteredSections.map((section) => (
            <AccordionSection
              key={section.id}
              section={section}
              isOpen={effectiveOpen.has(section.id)}
              onToggle={() => toggleSection(section.id)}
              searchQuery={searchQuery}
            />
          ))
        )}
      </div>

      {/* Quick Glossary */}
      {!searchQuery && (
        <div className="glass rounded-2xl p-5 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">⚡</span>
            <h2 className="font-semibold">Szybki słowniczek</h2>
            <span className="text-xs text-muted-foreground bg-white/10 px-2 py-0.5 rounded-full">
              {QUICK_GLOSSARY.length} pojęć
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {QUICK_GLOSSARY.map((item) => (
              <div key={item.term} className="flex items-start gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md shrink-0 mt-0.5">
                  {item.term}
                </span>
                <span className="text-xs text-muted-foreground leading-snug">{item.def}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer note */}
      <div className="text-xs text-muted-foreground text-center pb-4">
        Informacje mają charakter edukacyjny. W sprawach podatkowych skonsultuj się z księgowym lub doradcą podatkowym.
      </div>
    </div>
  );
}
