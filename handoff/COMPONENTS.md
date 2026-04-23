# Componenti UI — Variante B

Specifiche dettagliate di ogni componente. I valori fanno riferimento ai token in `tokens.css`.

---

## 1. Layout generale dell'app

```
┌──────┬────────────┬─────────────────────────────────┐
│      │            │  Topbar (breadcrumb + azioni)   │
│ Rail │  Sub-nav   ├─────────────────────────────────┤
│ 56px │   220px    │                                 │
│      │            │       Content area              │
│      │            │                                 │
└──────┴────────────┴─────────────────────────────────┘
```

- **Rail**: navigazione primaria (icone + tooltip)
- **Sub-nav**: navigazione secondaria (filtri, categorie della sezione corrente)
- **Topbar**: breadcrumb + azioni contestuali
- **Content**: pagina vera e propria

---

## 2. Rail (sidebar primaria)

- Larghezza: `56px`
- Background: `var(--color-bg-inverse)` (#0a0a0a)
- Padding verticale: `14px`
- Allineamento: icone centrate, gap `2px` tra item

**Item**:
- 36×36px, `border-radius: 7px`
- Colore icona default: `#777`
- Item attivo: colore icona `#fff`, background `#232323`
- Badge "non letto": pallino bianco 6px in alto a destra dell'icona (`top: 6px; right: 6px`)

**In alto**: logo quadrato 30×30, fondo bianco, border-radius 7px, lettera "p" nera bold 13px.
**In basso** (margin-top: auto): avatar circolare 30px con iniziali utente.

---

## 3. Sub-navigazione

- Larghezza: `220px`
- Background: `var(--color-bg-panel)` (#f7f7f7)
- Border-right: `1px solid var(--color-border)`
- Padding verticale: `14px`

**Titolo** (in alto): `font-size: 14px; font-weight: 600; padding: 0 16px 12px; border-bottom: 1px solid var(--color-border); margin-bottom: 8px;`

**Voci**:
- Padding: `5px 16px`, `padding-left: 14px` (compensato dal bordo)
- Font-size: `12.5px`
- Border-left: `2px solid transparent` di default, `2px solid #0a0a0a` se attivo
- Attivo: `font-weight: 600; color: #0a0a0a`
- Contatori inline (es. "Tutti (42)")

**Separatore di gruppo**: testo "— ETICHETTE —" stile label upper (10.5px, uppercase, letter-spacing 0.06em, color #999)

---

## 4. Topbar

- Altezza: `40px`
- Padding orizzontale: `16px`
- Background: `var(--color-bg-subtle)` (#fafafa)
- Border-bottom: `1px solid var(--color-border)`
- Font-size: `12px`

**Sinistra — breadcrumb**:
- "Workspace / Sezione / Sottofiltro"
- Slash `/` in colore `#ccc`
- Ultimo segmento: `color: #0a0a0a; font-weight: 500`

**Destra** (margin-left: auto):
- Shortcut `⌘K` in monospace
- Icona notifiche (bell, 14px)
- Versione app in testo piccolo

---

## 5. Stat cards (griglia KPI)

Griglia orizzontale di 6 card in una singola striscia bordata.

- Container: `border: 1px solid var(--color-border); border-radius: 6px;`
- Ogni cella: `padding: 12px 14px; border-left: 1px solid #ececec` (salvo la prima)
- **Label**: label-upper `10.5px`, color `#888`, margin-bottom `6px`
- **Valore**: mono, `20px`, font-weight 500 (es. `42`, `94%`, `€3.840`)
- **Delta**: mono, `10.5px`, color `#666`, margin-top `3px` (es. `+3`, `+12%`, `—`, `⚠`)

---

## 6. Card con header

Usata per "Agenda oggi", "Attività recente", ecc.

- Container: `border: 1px solid var(--color-border); border-radius: 6px; overflow: hidden;`
- Header:
  - Padding: `10px 14px`
  - Border-bottom: `1px solid var(--color-border)`
  - Background: `var(--color-bg-subtle)`
  - Display: `flex; justify-content: space-between`
  - Titolo: `12px`, font-weight 600, **UPPERCASE**
  - Azione a destra: colore `#888`, regular

---

## 7. Tabella dati (componente centrale)

Layout a griglia CSS, non `<table>` classico.

**Header**:
```css
display: grid;
grid-template-columns: 24px 1.3fr 0.9fr 0.7fr 0.9fr 0.7fr 0.8fr 60px;
padding: 8px 14px;
background: var(--color-bg-subtle);
border-bottom: 1px solid var(--color-border);
font-size: 10.5px;
text-transform: uppercase;
letter-spacing: 0.06em;
font-weight: 600;
color: #666;
gap: 10px;
```

**Riga**:
- Stesso `grid-template-columns`
- Padding: `9px 14px`
- Border-bottom: `1px solid var(--color-border-faint)` (#f2f2f2)
- Font-size: `12px`
- Background hover: `var(--color-bg-subtle)` (#fafafa)

**Celle**:
- Avatar: 22×22, border-radius 50%, background `#ececec`, iniziali `10px` font-weight 600
- Nome: font-weight 500
- Metadata (percorso terapeutico): color `#666`
- Numeri/date: font-mono con `tabular-nums`
- Date vuote: `—` color `#bbb`
- Ultima cella (azioni): icona `more` (3 pallini orizzontali) in color `#888`, allineata a destra

---

## 8. Status badge

Piccola pill di stato dentro le tabelle.

```css
font-size: 10.5px;
padding: 1px 7px;
border-radius: 3px;
```

Varianti:
- **Attivo**: `background: #ececec; color: #444`
- **Nuovo**: `background: #0a0a0a; color: #fff` (inverso)
- **In pausa / Chiuso**: `background: #f7f7f7; color: #444; border: 1px solid #ddd`

---

## 9. Bottoni

**Secondario (default)**:
```css
padding: 4px 10px;
border: 1px solid var(--color-border-input);
border-radius: 5px;
background: #fff;
font-size: 12px;
display: flex;
align-items: center;
gap: 5px;
```

**Primario (dark)**:
```css
padding: 4px 10px;
background: var(--color-bg-inverse);
color: #fff;
border-radius: 5px;
font-size: 12px;
```

Icona interna: 12px.

---

## 10. Input/search

- Padding: `6px 10px`
- Border: `1px solid #e8e8e8`
- Background: `#fafafa`
- Border-radius: `7px`
- Font-size: `12.5px`
- Placeholder color: `#999`
- Icona search a sinistra (13px)
- Opzionale: tasto shortcut `⌘K` a destra in pill grigia

---

## 11. Griglia di azioni (toolbar di pagina)

Sopra una tabella o pagina:
- Sinistra: titolo `18px` font-weight 600 + contatore mono `14px` color `#888` a fianco (es. "Pazienti **42**")
- Destra: gruppo di bottoni `gap: 6px`
  - Cerca (secondario)
  - Filtri · N (secondario, con icona)
  - Azione primaria (dark, es. "+ Aggiungi paziente")
