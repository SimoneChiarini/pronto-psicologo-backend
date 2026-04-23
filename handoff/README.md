# prontoPsicologo — Design Handoff

Handoff package per implementare il design **Variante B — Denso & Clinico** nell'app prontoPsicologo.

## Come usarlo con Claude Code

1. Copia questa cartella `handoff/` nella root del tuo progetto.
2. Apri il terminale dove usi Claude Code.
3. Incolla questo prompt:

```
Leggi la cartella handoff/ nel progetto. Contiene il design system e le specifiche
per la UI di prontoPsicologo (variante "Denso & Clinico"). In particolare:

- handoff/DESIGN_SYSTEM.md — tokens di colore, tipografia, spacing, componenti
- handoff/COMPONENTS.md   — specifiche dettagliate per sidebar, topbar, tabelle,
                             stat cards, bottoni, form
- handoff/PAGES.md         — layout delle pagine principali (Dashboard, Pazienti,
                             Conversazioni, ecc.)
- handoff/reference/       — screenshot di riferimento

Task: applica questo design al mio codebase esistente. Prima esplora il
codice per capire lo stack (framework, CSS, componenti esistenti), poi
proponi un piano di implementazione prima di modificare file.
Rispetta i token esatti — colori, font-size, spacing — come specificati.
```

## Cosa contiene

| File | Contenuto |
|------|-----------|
| `DESIGN_SYSTEM.md` | Tokens: colori, tipografia, spacing, border-radius, ombre |
| `COMPONENTS.md` | Specifiche dei componenti UI con proprietà esatte |
| `PAGES.md` | Layout e struttura delle pagine principali |
| `tokens.css` | Variabili CSS pronte da importare |
| `tokens.json` | Stessi token in JSON (per Tailwind config, styled-components, ecc.) |
| `reference/` | Screenshot di riferimento visivo |

## Filosofia del design

**Denso & Clinico** — strumento professionale per psicologi:
- Alta densità informativa (molti dati a colpo d'occhio)
- Palette rigorosamente monocromatica (bianco · nero · grigi)
- Font monospace per dati numerici e timestamp (sensazione di precisione)
- Rail laterale stretto con icone per navigazione primaria
- Sub-navigazione testuale per filtri/sotto-sezioni
- Tabelle strutturate come elemento centrale
- Zero decorazioni superflue — ogni pixel ha una funzione

Ispirazione: Linear, Height, strumenti clinici professionali.
