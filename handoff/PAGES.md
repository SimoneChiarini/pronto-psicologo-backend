# Pagine principali — Layout e struttura

Ogni pagina vive nella "content area" (a destra della sub-nav). Tutte condividono:
- Topbar (40px)
- Padding content: `16px`
- Gap verticale tra sezioni: `12-14px`

---

## 1. Dashboard

**Header pagina** (flex, space-between):
- Sinistra: titolo `Panoramica clinica` (18px, 600) + sottotitolo `2026-04-22 · aggiornato alle 09:14` (11.5px, mono per la data)
- Destra: bottoni [Filtri] [Esporta] [+ Nuovo] (ultimo primario)

**Striscia KPI** (6 colonne): Pazienti attivi · Sedute settimana · Tasso presenza · Ore cliniche · Msg pendenti · Fatturato mese

**Due colonne uguali**:
- Sinistra — **Agenda · Oggi** (card con header)
  - Header mostra contatore `06 / 06` a destra (mono)
  - Righe: orario (mono, 54px) + nome + tipo + mode (badge) + durata (mono, right-aligned)
- Destra — **Attività recente** (card con header)
  - Righe a 3 colonne: timestamp (mono, 80px) + evento + dettaglio
  - Es: `09:14 | Nota clinica aggiunta | Giulia R.`

---

## 2. Pazienti

**Toolbar**:
- Sinistra: `Pazienti 42` (18px, mono per il numero)
- Destra: [Cerca] [Filtri · 2] [+ Aggiungi paziente]

**Tabella** (8 colonne):
| Avatar | Nome | Percorso | Sedute | Ultima | Prossima | Stato | ⋯ |
|--------|------|----------|--------|--------|----------|-------|---|
| GR | Giulia Rossi | CBT · Ansia generalizzata | 14 | 15/04 | 24/04 | Attivo | ⋯ |

- Date in mono
- "Prossima" vuota: `—` color `#bbb`
- Stato: badge (vedi COMPONENTS.md § 8)

**Sub-nav per questa sezione**:
- Tutti (42) · Attivi (38) · In pausa (3) · Archiviati (1)
- Separatore "— ETICHETTE —"
- Ansia (14) · Depressione (9) · Coppia (6) · Adolescenti (4)

---

## 3. Conversazioni

**Layout a 2 colonne dentro il content**:
- Lista (280px) a sinistra
- Thread a destra

**Lista**:
- Header: "Conversazioni" (16px, 600) + search "Cerca paziente…"
- Item: nome + timestamp (piccolo, destra) + ultima riga (troncata)
- Non letti: nome in 600, ultima riga in colore primario, badge contatore nero piccolo

**Thread**:
- Header thread: avatar + nome + metadata ("Paziente dal 2024 · Online ora")
- Azioni destra: calendario, nota, more (icone)
- Messaggi: bubble massimo 72% width
  - Ricevuti: `background: #f2f2f2; color: #0a0a0a`
  - Inviati: `background: #0a0a0a; color: #fff`
  - Corner rounded con una coda (bottom-right-radius: 3px per inviati, bottom-left-radius: 3px per ricevuti)
- Input bar in basso: icona attach + textarea grigia + pulsante send (quadrato nero 32×32)

---

## 4. Domande & Risposte

**Toolbar**:
- Titolo `Domande dalla community` (18px, 600)
- Sottotitolo: "Domande anonime inviate dai visitatori della piattaforma. Rispondere è volontario..."

**Filter chips** (riga di pill): Tutte · Senza risposta · Ansia · Lutto · Relazioni · Infanzia
- Prima attiva: `background: #1a1a1a; color: #fff`
- Altre: `background: #fff; border: 1px solid #ececea`

**Lista domande** (separate da `border-top: 1px solid #ececea`):
- Categoria (label-upper) + tempo (`2h fa`)
- Domanda (titolo, 20px font-weight 500)
- Footer: autore · N risposte · `Rispondi →` a destra (font-weight 500)

---

## 5. Psicologi (team)

**Toolbar**:
- Titolo `Il team` + sottotitolo "5 professionisti · 144 pazienti seguiti"
- Destra: [Inviti] [+ Aggiungi collega]

**Griglia 2×N di card**:
- Padding 24px, border 1px, border-radius 12px
- Flex: avatar 56×56 a sinistra (iniziali, background #ececea) + info a destra
- Info: nome (17px, 500) + specializzazione (12.5px #888)
- Sotto: 3 stat inline — Pazienti · Rating · Stato (con `● Attivo`)

---

## 6. Appuntamenti

Calendario settimanale o giornaliero. Non disegnato in dettaglio — seguire stessa tabella/card logic:
- Colonna per giorno della settimana
- Slot 30-50 min come card piccole con nome + tipo + modalità

---

## 7. Note cliniche

Editor documento classico. Toolbar minimal (bold, italic, lista) in testo, nessuna icona colorata. Font sans per il testo delle note. Pannello destro con info paziente e ultime 5 note.

---

## 8. Impostazioni

Lista a sinistra (account, team, fatturazione, integrazioni, sicurezza) + pannello a destra. Form con label sopra input, divisori `border-top: 1px solid var(--color-border-subtle)`.
