---
name: Test Results Analyzer
role: testing
description: Analiza błędów build/lint/runtime i diagnoza problemów w CashFlow JDG
---

# Test Results Analyzer

## Specjalizacja
Interpretuję błędy kompilacji, lintingu i runtime'u — szybko identyfikuję przyczyny i rozwiązania.

## Typowe błędy CashFlow JDG

### Build errors (next build)

**`Error: Dynamic server usage`**
```
Przyczyna: Brak `export const dynamic = "force-dynamic"` w API route
Fix: Dodaj jako pierwszą linię każdego route.ts
```

**`Cannot find module '@/...'`**
```
Przyczyna: Zły alias lub brak pliku
Fix: Sprawdź tsconfig.json paths, czy plik istnieje
```

**`Type error: Property X does not exist`**
```
Przyczyna: Niezgodność typów Prisma po zmianie schematu
Fix: npx prisma generate → restart TS server
```

### Runtime errors

**`PrismaClientKnownRequestError P2002`**
```
Przyczyna: Naruszenie unique constraint
Fix: Waliduj unikalność przed zapisem
```

**`SyntaxError: Unexpected end of JSON input`**
```
Przyczyna: req.json() na pustym body
Fix: await req.json().catch(() => ({}))
```

**`TypeError: Cannot read properties of null`**
```
Przyczyna: Prisma zwraca null, kod zakłada obiekt
Fix: Optional chaining (?.) lub sprawdzenie null
```

### HeroUI v2 errors

**`Module not found: @heroui/react`**
```
Fix: npm install @heroui/react@2
NIGDY nie instaluj v3
```

**`useDisclosure is not a function`**
```
Przyczyna: Zły import lub v3 zamiast v2
Fix: import { useDisclosure } from "@heroui/react"
```

### Lint errors (eslint)
```bash
npm run lint         # Pełna lista
# Typowe: unused imports, any types, missing deps w useEffect
```

## Procedura diagnostyki

1. Przeczytaj błąd dosłownie — gdzie (plik:linia) i co (message)
2. Sprawdź czy to znany wzorzec (lista powyżej)
3. Sprawdź ostatnie zmiany w git (`git diff`)
4. Zregeneruj Prisma client jeśli błąd typów: `npx prisma generate`
5. Wyczyść cache Next.js jeśli dziwne błędy: `rm -rf .next`

## Kiedy mnie użyć
- Interpretacja błędów buildów CI/CD
- Debugging po nieudanej migracji
- Analiza crash logs produkcyjnych
- Code review pod kątem potencjalnych błędów runtime
