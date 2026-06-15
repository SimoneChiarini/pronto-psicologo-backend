export interface TaxLeaf { code: string; label: string; }
export interface TaxSub  { label: string; leaves: TaxLeaf[]; }
export interface TaxMacro {
  code: string;
  label: string;
  subs?: TaxSub[];    // se presente, l'utente sceglie sub → poi foglie
  leaves?: TaxLeaf[]; // se presente (senza subs), l'utente sceglie direttamente le foglie
}

export const TAXONOMY: TaxMacro[] = [
  // ── Disturbi del Neurosviluppo ─────────────────────────────────────────────
  {
    code: 'neurosviluppo',
    label: 'Disturbi del Neurosviluppo',
    subs: [
      {
        label: 'Disabilità Intellettiva',
        leaves: [
          { code: 'di_disab',    label: 'Disabilità intellettiva' },
          { code: 'di_ritardo',  label: 'Ritardo globale dello sviluppo' },
          { code: 'di_ns',       label: 'Disabilità intellettiva non specificata' },
        ],
      },
      {
        label: 'Disturbi della Comunicazione',
        leaves: [
          { code: 'dc_linguaggio',  label: 'Disturbo del linguaggio' },
          { code: 'dc_fonetico',    label: 'Disturbo fonetico-fonologico' },
          { code: 'dc_balbuzie',    label: 'Balbuzie (disturbo della fluenza)' },
          { code: 'dc_pragmatica',  label: 'Disturbo della comunicazione sociale (pragmatica)' },
          { code: 'dc_ns',          label: 'Disturbo della comunicazione non specificato' },
        ],
      },
      {
        label: 'Disturbo dello Spettro dell\'Autismo',
        leaves: [
          { code: 'dsa_autismo', label: 'Disturbo dello spettro dell\'autismo' },
        ],
      },
      {
        label: 'Disturbo da Deficit di Attenzione/Iperattività (ADHD)',
        leaves: [
          { code: 'adhd_disattento',  label: 'Presentazione prevalentemente disattenta' },
          { code: 'adhd_iperattivo',  label: 'Presentazione prevalentemente iperattiva/impulsiva' },
          { code: 'adhd_combinato',   label: 'Presentazione combinata' },
        ],
      },
      {
        label: 'Disturbo Specifico dell\'Apprendimento',
        leaves: [
          { code: 'dsp_dislessia',   label: 'Con compromissione della lettura (dislessia)' },
          { code: 'dsp_scrittura',   label: 'Con compromissione dell\'espressione scritta' },
          { code: 'dsp_discalculia', label: 'Con compromissione del calcolo (discalculia)' },
        ],
      },
      {
        label: 'Disturbi del Movimento',
        leaves: [
          { code: 'dm_coordinazione',  label: 'Disturbo dello sviluppo della coordinazione' },
          { code: 'dm_stereotipie',    label: 'Disturbo da movimenti stereotipati' },
          { code: 'dm_tic',            label: 'Disturbi da tic' },
          { code: 'dm_tourette',       label: 'Sindrome di Tourette' },
          { code: 'dm_tic_persistente',label: 'Disturbo persistente da tic motori o vocali' },
          { code: 'dm_tic_provvisorio',label: 'Disturbo provvisorio da tic' },
        ],
      },
    ],
  },

  // ── Schizofrenia e Disturbi Psicotici ─────────────────────────────────────
  {
    code: 'schizo',
    label: 'Disturbi dello Spettro della Schizofrenia e Altri Disturbi Psicotici',
    leaves: [
      { code: 'schizo_delirante',    label: 'Disturbo delirante' },
      { code: 'schizo_breve',        label: 'Disturbo psicotico breve' },
      { code: 'schizo_forma',        label: 'Disturbo schizofreniforme' },
      { code: 'schizo_schizofrenia', label: 'Schizofrenia' },
      { code: 'schizo_schizoaff',    label: 'Disturbo schizoaffettivo' },
      { code: 'schizo_indotto',      label: 'Disturbo psicotico indotto da sostanze/farmaci' },
      { code: 'schizo_medico',       label: 'Disturbo psicotico dovuto ad altra condizione medica' },
      { code: 'schizo_catatonia',    label: 'Catatonia' },
    ],
  },

  // ── Disturbo Bipolare ──────────────────────────────────────────────────────
  {
    code: 'bipolare',
    label: 'Disturbo Bipolare e Disturbi Correlati',
    leaves: [
      { code: 'bip_i',          label: 'Disturbo bipolare I' },
      { code: 'bip_ii',         label: 'Disturbo bipolare II' },
      { code: 'bip_ciclotimico',label: 'Disturbo ciclotimico' },
      { code: 'bip_indotto',    label: 'Disturbo bipolare indotto da sostanze/farmaci' },
      { code: 'bip_medico',     label: 'Disturbo bipolare dovuto ad altra condizione medica' },
    ],
  },

  // ── Disturbi Depressivi ────────────────────────────────────────────────────
  {
    code: 'depressivi',
    label: 'Disturbi Depressivi',
    leaves: [
      { code: 'dep_maggiore',    label: 'Disturbo depressivo maggiore' },
      { code: 'dep_distimia',    label: 'Disturbo depressivo persistente (distimia)' },
      { code: 'dep_dirompente',  label: 'Disturbo da disregolazione dell\'umore dirompente' },
      { code: 'dep_disforico',   label: 'Disturbo disforico premestruale' },
      { code: 'dep_indotto',     label: 'Disturbo depressivo indotto da sostanze/farmaci' },
      { code: 'dep_medico',      label: 'Disturbo depressivo dovuto ad altra condizione medica' },
    ],
  },

  // ── Disturbi d'Ansia ──────────────────────────────────────────────────────
  {
    code: 'ansia',
    label: 'Disturbi d\'Ansia',
    leaves: [
      { code: 'anx_separazione', label: 'Disturbo d\'ansia da separazione' },
      { code: 'anx_mutismo',     label: 'Mutismo selettivo' },
      { code: 'anx_fobia_spec',  label: 'Fobia specifica' },
      { code: 'anx_fobia_soc',   label: 'Disturbo d\'ansia sociale (fobia sociale)' },
      { code: 'anx_panico',      label: 'Disturbo di panico' },
      { code: 'anx_agorafobia',  label: 'Agorafobia' },
      { code: 'anx_generalizzato',label: 'Disturbo d\'ansia generalizzato' },
      { code: 'anx_indotto',     label: 'Disturbo d\'ansia indotto da sostanze/farmaci' },
      { code: 'anx_medico',      label: 'Disturbo d\'ansia dovuto ad altra condizione medica' },
    ],
  },

  // ── Disturbo Ossessivo-Compulsivo ─────────────────────────────────────────
  {
    code: 'doc',
    label: 'Disturbo Ossessivo-Compulsivo e Disturbi Correlati',
    leaves: [
      { code: 'ocd_doc',           label: 'Disturbo ossessivo-compulsivo (DOC)' },
      { code: 'ocd_dismorfismo',   label: 'Disturbo da dismorfismo corporeo' },
      { code: 'ocd_accumulo',      label: 'Disturbo da accumulo' },
      { code: 'ocd_tricotillomania',label: 'Tricotillomania' },
      { code: 'ocd_escoriazione',  label: 'Disturbo da escoriazione (skin picking)' },
      { code: 'ocd_indotto',       label: 'DOC indotto da sostanze/farmaci' },
      { code: 'ocd_medico',        label: 'DOC dovuto ad altra condizione medica' },
    ],
  },

  // ── Trauma e Stress ───────────────────────────────────────────────────────
  {
    code: 'trauma',
    label: 'Disturbi Correlati a Trauma e Stress',
    leaves: [
      { code: 'tra_attaccamento', label: 'Disturbo reattivo dell\'attaccamento' },
      { code: 'tra_disinibito',   label: 'Disturbo da impegno sociale disinibito' },
      { code: 'tra_ptsd',         label: 'Disturbo da stress post-traumatico (PTSD)' },
      { code: 'tra_acuto',        label: 'Disturbo da stress acuto' },
      { code: 'tra_adattamento',  label: 'Disturbi dell\'adattamento' },
    ],
  },

  // ── Disturbi Dissociativi ─────────────────────────────────────────────────
  {
    code: 'dissociativo',
    label: 'Disturbi Dissociativi',
    leaves: [
      { code: 'dis_identita',           label: 'Disturbo dissociativo dell\'identità' },
      { code: 'dis_amnesia',            label: 'Amnesia dissociativa' },
      { code: 'dis_depersonalizzazione',label: 'Disturbo di depersonalizzazione/derealizzazione' },
    ],
  },

  // ── Disturbi da Sintomi Somatici ─────────────────────────────────────────
  {
    code: 'somatico',
    label: 'Disturbi da Sintomi Somatici e Disturbi Correlati',
    leaves: [
      { code: 'som_somatico',      label: 'Disturbo da sintomi somatici' },
      { code: 'som_ansia_malattia',label: 'Disturbo d\'ansia di malattia' },
      { code: 'som_conversione',   label: 'Disturbo di conversione' },
      { code: 'som_fittizio',      label: 'Disturbo fittizio' },
    ],
  },

  // ── Nutrizione e Alimentazione ────────────────────────────────────────────
  {
    code: 'alimentazione',
    label: 'Disturbi della Nutrizione e dell\'Alimentazione',
    leaves: [
      { code: 'ali_anoressia', label: 'Anoressia nervosa' },
      { code: 'ali_bulimia',   label: 'Bulimia nervosa' },
      { code: 'ali_binge',     label: 'Disturbo da alimentazione incontrollata (binge eating)' },
      { code: 'ali_arfid',     label: 'ARFID (disturbo evitante/restrittivo)' },
      { code: 'ali_pica',      label: 'Pica' },
      { code: 'ali_ruminazione',label: 'Disturbo da ruminazione' },
    ],
  },

  // ── Disturbi dell'Evacuazione ─────────────────────────────────────────────
  {
    code: 'evacuazione',
    label: 'Disturbi dell\'Evacuazione',
    leaves: [
      { code: 'eva_enuresi',   label: 'Enuresi' },
      { code: 'eva_encopresi', label: 'Encopresi' },
    ],
  },

  // ── Disturbi del Sonno-Veglia ─────────────────────────────────────────────
  {
    code: 'sonno',
    label: 'Disturbi del Sonno-Veglia',
    leaves: [
      { code: 'son_insonnia',    label: 'Disturbo da insonnia' },
      { code: 'son_ipersonnia',  label: 'Disturbo da ipersonnolenza' },
      { code: 'son_narcolessia', label: 'Narcolessia' },
      { code: 'son_circadiano',  label: 'Disturbi del ritmo circadiano sonno-veglia' },
      { code: 'son_respirazione',label: 'Disturbi del sonno correlati alla respirazione' },
      { code: 'son_nrem',        label: 'Disturbi dell\'arousal del sonno NREM' },
      { code: 'son_incubi',      label: 'Disturbo da incubi' },
      { code: 'son_rem',         label: 'Disturbo comportamentale del sonno REM' },
      { code: 'son_gambe',       label: 'Sindrome delle gambe senza riposo' },
    ],
  },

  // ── Disfunzioni Sessuali ──────────────────────────────────────────────────
  {
    code: 'sessuale',
    label: 'Disfunzioni Sessuali',
    leaves: [
      { code: 'ses_femm_interesse', label: 'Disturbo dell\'interesse/eccitazione sessuale femminile' },
      { code: 'ses_femm_orgasmo',   label: 'Disturbo dell\'orgasmo femminile' },
      { code: 'ses_dolore',         label: 'Disturbo del dolore genito-pelvico e della penetrazione' },
      { code: 'ses_erettile',       label: 'Disturbo erettile' },
      { code: 'ses_eiac_ritardata', label: 'Eiaculazione ritardata' },
      { code: 'ses_eiac_precoce',   label: 'Eiaculazione precoce' },
      { code: 'ses_desiderio_masc', label: 'Disturbo del desiderio sessuale ipoattivo maschile' },
    ],
  },

  // ── Disforia di Genere ────────────────────────────────────────────────────
  {
    code: 'genere',
    label: 'Disforia di Genere',
    leaves: [
      { code: 'gen_bambini',       label: 'Disforia di genere nei bambini' },
      { code: 'gen_adolescenti',   label: 'Disforia di genere negli adolescenti e adulti' },
    ],
  },

  // ── Disturbi del Comportamento Dirompente ─────────────────────────────────
  {
    code: 'dirompente',
    label: 'Disturbi del Comportamento Dirompente, del Controllo degli Impulsi e della Condotta',
    leaves: [
      { code: 'dir_oppositivo',  label: 'Disturbo oppositivo provocatorio' },
      { code: 'dir_esplosivo',   label: 'Disturbo esplosivo intermittente' },
      { code: 'dir_condotta',    label: 'Disturbo della condotta' },
      { code: 'dir_antisociale', label: 'Disturbo antisociale di personalità' },
      { code: 'dir_piromania',   label: 'Piromania' },
      { code: 'dir_cleptomania', label: 'Cleptomania' },
    ],
  },

  // ── Disturbi Correlati a Sostanze ─────────────────────────────────────────
  {
    code: 'sostanze',
    label: 'Disturbi Correlati a Sostanze e Disturbi da Addiction',
    subs: [
      {
        label: 'Disturbi da Uso di Sostanze',
        leaves: [
          { code: 'uso_alcol',       label: 'Alcol' },
          { code: 'uso_caffeina',    label: 'Caffeina' },
          { code: 'uso_cannabis',    label: 'Cannabis' },
          { code: 'uso_allucinogeni',label: 'Allucinogeni' },
          { code: 'uso_inalanti',    label: 'Inalanti' },
          { code: 'uso_oppioidi',    label: 'Oppioidi' },
          { code: 'uso_sedativi',    label: 'Sedativi, ipnotici e ansiolitici' },
          { code: 'uso_stimolanti',  label: 'Stimolanti' },
          { code: 'uso_tabacco',     label: 'Tabacco' },
          { code: 'uso_altre',       label: 'Altre sostanze' },
        ],
      },
      {
        label: 'Disturbi Comportamentali da Addiction',
        leaves: [
          { code: 'add_gioco', label: 'Disturbo da gioco d\'azzardo' },
        ],
      },
    ],
  },

  // ── Disturbi Neurocognitivi ───────────────────────────────────────────────
  {
    code: 'neurocognitivo',
    label: 'Disturbi Neurocognitivi',
    subs: [
      {
        label: 'Disturbo Neurocognitivo Maggiore e Lieve',
        leaves: [
          { code: 'nc_alzheimer',    label: 'Malattia di Alzheimer' },
          { code: 'nc_frontotemp',   label: 'Demenza frontotemporale' },
          { code: 'nc_lewy',         label: 'Demenza a corpi di Lewy' },
          { code: 'nc_vascolare',    label: 'Demenza vascolare' },
          { code: 'nc_trauma',       label: 'Trauma cranico' },
          { code: 'nc_parkinson',    label: 'Morbo di Parkinson' },
          { code: 'nc_hiv',          label: 'HIV' },
          { code: 'nc_huntington',   label: 'Malattia di Huntington' },
          { code: 'nc_prioni',       label: 'Malattia da prioni' },
          { code: 'nc_altre',        label: 'Altre condizioni mediche' },
        ],
      },
    ],
  },

  // ── Disturbi di Personalità ───────────────────────────────────────────────
  {
    code: 'personalita',
    label: 'Disturbi di Personalità',
    subs: [
      {
        label: 'Cluster A',
        leaves: [
          { code: 'pa_paranoide',   label: 'Disturbo paranoide di personalità' },
          { code: 'pa_schizoide',   label: 'Disturbo schizoide di personalità' },
          { code: 'pa_schizotipico',label: 'Disturbo schizotipico di personalità' },
        ],
      },
      {
        label: 'Cluster B',
        leaves: [
          { code: 'pb_antisociale', label: 'Disturbo antisociale di personalità' },
          { code: 'pb_borderline',  label: 'Disturbo borderline di personalità' },
          { code: 'pb_istrionico',  label: 'Disturbo istrionico di personalità' },
          { code: 'pb_narcisistico',label: 'Disturbo narcisistico di personalità' },
        ],
      },
      {
        label: 'Cluster C',
        leaves: [
          { code: 'pc_evitante',  label: 'Disturbo evitante di personalità' },
          { code: 'pc_dipendente',label: 'Disturbo dipendente di personalità' },
          { code: 'pc_ocd',       label: 'Disturbo ossessivo-compulsivo di personalità' },
        ],
      },
    ],
  },

  // ── Disturbi Parafilici ───────────────────────────────────────────────────
  {
    code: 'parafilico',
    label: 'Disturbi Parafilici',
    leaves: [
      { code: 'par_voyeuristico',     label: 'Disturbo voyeuristico' },
      { code: 'par_esibizionistico',  label: 'Disturbo esibizionistico' },
      { code: 'par_frotteuristico',   label: 'Disturbo frotteuristico' },
      { code: 'par_masochismo',       label: 'Disturbo da masochismo sessuale' },
      { code: 'par_sadismo',          label: 'Disturbo da sadismo sessuale' },
      { code: 'par_pedofilico',       label: 'Disturbo pedofilico' },
      { code: 'par_feticistico',      label: 'Disturbo feticistico' },
      { code: 'par_travestitismo',    label: 'Disturbo da travestitismo' },
    ],
  },

  // ── Altre Condizioni ──────────────────────────────────────────────────────
  {
    code: 'altre',
    label: 'Altre Condizioni Clinicamente Rilevanti',
    leaves: [
      { code: 'alt_relazionale', label: 'Problemi relazionali' },
      { code: 'alt_familiare',   label: 'Problemi familiari' },
      { code: 'alt_scolastico',  label: 'Problemi scolastici' },
      { code: 'alt_lavorativo',  label: 'Problemi lavorativi' },
      { code: 'alt_abitativo',   label: 'Problemi abitativi' },
      { code: 'alt_economico',   label: 'Problemi economici' },
      { code: 'alt_attenzione',  label: 'Condizioni oggetto di attenzione clinica' },
    ],
  },

  // ── Fascia d'età ──────────────────────────────────────────────────────────
  {
    code: 'fascia_eta',
    label: 'Fascia d\'età',
    leaves: [
      { code: 'eta_infanzia',    label: 'Infanzia' },
      { code: 'eta_adolescenza', label: 'Adolescenza' },
      { code: 'eta_adulta',      label: 'Età adulta' },
      { code: 'eta_terza',       label: 'Terza età' },
    ],
  },

  // ── Percorsi Relazionali e Familiari ──────────────────────────────────────
  {
    code: 'relazionale',
    label: 'Percorsi Relazionali e Familiari',
    leaves: [
      { code: 'rel_genitorialita', label: 'Genitorialità' },
      { code: 'rel_coppia',        label: 'Coppia' },
      { code: 'rel_famiglia',      label: 'Famiglia' },
      { code: 'rel_gruppi',        label: 'Gruppi' },
    ],
  },

  // ── Crescita Personale ────────────────────────────────────────────────────
  {
    code: 'crescita',
    label: 'Crescita Personale',
    leaves: [
      { code: 'cre_autostima',   label: 'Autostima e fiducia in sé' },
      { code: 'cre_emotiva',     label: 'Consapevolezza emotiva' },
      { code: 'cre_emozioni',    label: 'Gestione delle emozioni' },
      { code: 'cre_stress',      label: 'Gestione dello stress' },
      { code: 'cre_assertivita', label: 'Assertività e comunicazione efficace' },
      { code: 'cre_personale',   label: 'Crescita personale' },
    ],
  },
];

// Mappa piatta code → label per lookup rapido
export const TAG_LABEL_MAP = new Map<string, string>(
  TAXONOMY.flatMap(m =>
    m.subs
      ? m.subs.flatMap(s => s.leaves.map(l => [l.code, l.label] as [string, string]))
      : (m.leaves ?? []).map(l => [l.code, l.label] as [string, string])
  )
);
