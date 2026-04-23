# Design System — prontoPsicologo (Variante B · Denso & Clinico)

## Filosofia

Palette rigorosamente monocromatica. Ogni elemento deve giustificare la propria presenza. Densità alta ma leggibile. Font monospace per dati numerici e timestamp.

---

## 1. Colori

Tutto costruito su scale di grigi. Nessun colore d'accento — il nero è l'accento.

| Token | Valore | Uso |
|-------|--------|-----|
| `--color-bg` | `#ffffff` | Sfondo principale (content area) |
| `--color-bg-subtle` | `#fafafa` | Topbar, header tabelle, row hover |
| `--color-bg-panel` | `#f7f7f7` | Sub-navigazione sinistra |
| `--color-bg-inverse` | `#0a0a0a` | Rail icone (sidebar principale), bottoni primari |
| `--color-bg-inverse-hover` | `#232323` | Item attivo sul rail |
| `--color-border` | `#e5e5e5` | Bordi principali (card, tabelle, separatori forti) |
| `--color-border-subtle` | `#ececec` | Bordi divisori interni |
| `--color-border-faint` | `#f2f2f2` | Righe di tabella |
| `--color-border-input` | `#d4d4d4` | Bordo bottoni secondari |
| `--color-text` | `#111111` | Testo primario |
| `--color-text-strong` | `#0a0a0a` | Titoli, numeri primari |
| `--color-text-muted` | `#666666` | Testo secondario, descrizioni |
| `--color-text-faint` | `#888888` | Label, metadata, timestamp |
| `--color-text-inverse` | `#ffffff` | Testo su sfondo scuro |
| `--color-text-placeholder` | `#999999` | Placeholder, testo disabilitato |

**Regola**: non introdurre colori d'accento (blu, verde, rosso) nemmeno per stati. Gli stati si distinguono con **peso tipografico**, **bordi**, e **sfondi grigi**. Solo l'indicatore "urgente/non letto" può usare un pallino nero solido.

---

## 2. Tipografia

### Famiglie

```css
--font-sans: "Söhne", "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif;
--font-mono: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
```

Se "Söhne" non è disponibile (è commerciale), usa **Inter** come fallback primario. Il design è testato con entrambi.

### Scala

| Token | Size | Line-height | Uso |
|-------|------|-------------|-----|
| `--text-xs` | 10.5px | 1.3 | Label uppercase, badge |
| `--text-sm` | 11.5px | 1.4 | Metadata, timestamp |
| `--text-base` | 12.5px | 1.5 | Body primario, tabelle |
| `--text-md` | 13.5px | 1.45 | Bottoni |
| `--text-lg` | 14px | 1.4 | Header di card |
| `--text-xl` | 18px | 1.25 | Titoli di pagina |
| `--text-2xl` | 20px | 1.2 | Numeri principali (stat cards) |
| `--text-3xl` | 22px | 1.15 | H1 rari |

### Pesi

- `400` — body
- `500` — titoli di pagina, nomi paziente in tabella, item attivo in navigazione
- `600` — header card, label maiuscole forti

### Feature monospace

Usa `font-variant-numeric: tabular-nums` su **tutti** i numeri in tabella (orari, date, durate, metriche). Usa direttamente il font monospace per:
- orari (`09:30`)
- date brevi (`22/04`)
- ID e versioni (`v2.4.1`)
- metriche nei KPI (`42`, `94%`, `€3.840`)
- shortcut da tastiera (`⌘K`)

### Letter-spacing

- Titoli: `-0.01em`
- Body: default (`0`)
- Label uppercase: `0.06em`

---

## 3. Spacing

Scala 4px-based.

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 14px;   /* padding orizzontale standard delle celle */
--space-5: 16px;   /* padding content area */
--space-6: 20px;
--space-8: 28px;
--space-10: 40px;
```

**Padding standard**:
- Celle di tabella: `9px 14px`
- Header di tabella: `8px 14px`
- Pulsanti: `4px 10px`
- Card header: `10px 14px`
- Content area principale: `16px`

---

## 4. Border-radius

Rigorosi e piccoli. Niente angoli troppo morbidi — va contro il tono "clinico".

| Token | Valore | Uso |
|-------|--------|-----|
| `--radius-sm` | `3px` | Badge, mini-pill |
| `--radius-md` | `5px` | Bottoni |
| `--radius-lg` | `6px` | Card principali, input |
| `--radius-pill` | `7px` | Icone rail (sidebar sinistra) |
| `--radius-full` | `50%` | Avatar |

---

## 5. Ombre

**Nessuna ombra.** Tutto si separa con bordi `1px solid var(--color-border)`. Se serve profondità in un menu/dropdown, usa al massimo:

```css
--shadow-menu: 0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04);
```

---

## 6. Dimensioni fisse chiave

- Rail icone (sidebar principale): **56px** di larghezza
- Sub-navigazione: **220px** di larghezza
- Topbar: **40px** di altezza
- Icona nel rail: **16px**, bottone 36x36
- Avatar: 22px (in tabella), 30px (sidebar), ecc.

---

## 7. Iconografia

- Stroke 1.5px
- Size di default 16px (14px in elementi compatti)
- `currentColor` per stroke, così ereditano il colore dal testo
- Set: Lucide o Tabler (entrambi funzionano)
- **Mai** icone colorate o con gradiente

---

## 8. Micro-interazioni

- Hover su riga tabella: `background: var(--color-bg-subtle)` (0.12s ease)
- Hover su bottone: scurire di 10%
- Focus: `outline: 2px solid var(--color-text-strong); outline-offset: 1px;`
- Transizioni max 120-150ms — deve sembrare "veloce" e "preciso"

---

## 9. Regole finali

1. **Zero gradienti.**
2. **Zero emoji** nell'interfaccia.
3. **Zero colori d'accento.** Gli stati si distinguono tipograficamente.
4. **Zero angoli arrotondati sopra 7px** (salvo avatar).
5. **Dati numerici sempre in mono** con `tabular-nums`.
6. **Le label UPPERCASE** hanno sempre `letter-spacing: 0.06em` e size 10.5-11px.
