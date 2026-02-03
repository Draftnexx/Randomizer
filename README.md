# Chaos Portal Randomizer

Frontend-only Mini-Game, das aus einer Optionsliste ein deterministisches Multiversum erzeugt und nach dem Kollaps ein finales Ergebnis festschreibt.

## Lokales Starten

```bash
npm install
npm run dev
```

## MVP-Funktion (Phasen)

- **IDLE**: Optionen eingeben, mindestens zwei Einträge.
- **COLLECTING**: Entropie wird gesammelt, Eingabe gesperrt.
- **SPINNING**: 12 Universen rotieren deterministisch, Wechsel asynchron.
- **FINAL**: Kollaps abgeschlossen, Ergebnis stabil angezeigt.

## Arbeitsweise im Repo

Vite + React + TypeScript, keine zusätzlichen Dependencies. Der State folgt strikt der definierten State-Machine.
