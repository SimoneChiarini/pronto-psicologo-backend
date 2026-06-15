import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Pulizia dati derivati...');

  // Elimina solo i dati derivati (rispettando le FK), utenti e psicologi restano intatti
  await prisma.appointment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.review.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.answer.deleteMany();
  await prisma.question.deleteMany();
  await prisma.post.deleteMany();

  console.log('✅ Dati derivati puliti');

  // ── Recupera utenti e psicologi esistenti ────────────────────
  const marco   = await prisma.user.findUniqueOrThrow({ where: { email: 'marco@test.com' } });
  const sofia   = await prisma.user.findUniqueOrThrow({ where: { email: 'sofia@test.com' } });
  const luca    = await prisma.user.findUniqueOrThrow({ where: { email: 'luca@test.com' } });
  const anna    = await prisma.user.findUniqueOrThrow({ where: { email: 'anna@test.com' } });

  const pVerdi   = await prisma.psychologist.findUniqueOrThrow({ where: { alboCode: 'OPL-11234' } });
  const pMarino  = await prisma.psychologist.findUniqueOrThrow({ where: { alboCode: 'OPL-22345' } });
  const pCosta   = await prisma.psychologist.findUniqueOrThrow({ where: { alboCode: 'OPL-33456' } });
  const pFontana = await prisma.psychologist.findUniqueOrThrow({ where: { alboCode: 'OPL-44567' } });
  const pPratesi = await prisma.psychologist.findUniqueOrThrow({ where: { alboCode: 'OPL-55678' } });

  // ── DOMANDE ──────────────────────────────────────────────────
  const [q1, q2, q3, q4, q5, q6, q7, q8] = await Promise.all([
    prisma.question.create({ data: {
      userId: marco.id,
      title: 'Come smettere di procrastinare?',
      content: 'Rimando continuamente le cose importanti. Inizio a lavorare su qualcosa e dopo 10 minuti mi distraggo con il telefono o con qualsiasi altra cosa. Di sera mi sento in colpa ma il giorno dopo ricomincia uguale. Non so come uscire da questo ciclo.',
    }}),
    prisma.question.create({ data: {
      userId: marco.id,
      title: 'Paura del giudizio degli altri',
      content: 'Quando parlo in pubblico o devo esprimere un\'opinione in gruppo mi blocco. Ho sempre paura di dire la cosa sbagliata o di sembrare stupido. Questo mi sta limitando molto anche al lavoro.',
      isAnonymous: false,
    }}),
    prisma.question.create({ data: {
      userId: sofia.id,
      title: 'Non riesco a gestire la rabbia',
      content: 'Mi arrabbio per cose piccole e poi mi pento subito. Con il mio ragazzo e con i miei genitori perdo facilmente la pazienza e dico cose che non penso. Dopo mi sento terribile. Come posso imparare a controllare la rabbia?',
    }}),
    prisma.question.create({ data: {
      userId: sofia.id,
      title: 'Difficoltà ad accettare un lutto',
      content: 'Ho perso mia nonna sei mesi fa ed eravamo molto legate. Non riesco ancora ad accettarlo. A volte mi sembra di sentire la sua voce, mi chiedo se è normale. Non riesco a parlarne con la famiglia perché non voglio farli stare male.',
      isAnonymous: true,
    }}),
    prisma.question.create({ data: {
      userId: luca.id,
      title: 'Isolamento sociale dopo il Covid',
      content: 'Durante la pandemia mi sono abituato a stare solo e ora faccio fatica a uscire e socializzare. Rifiuto quasi sempre gli inviti degli amici preferendo restare a casa. So che non fa bene ma non riesco a cambiare.',
    }}),
    prisma.question.create({ data: {
      userId: luca.id,
      title: 'Pensieri intrusivi che non riesco a fermare',
      content: 'Ho continuamente pensieri negativi che si ripetono. Immagino scenari catastrofici su cose che potrebbero andare male. Ci penso sopra per ore anche di notte. Non so se è ansia o qualcosa di più serio.',
    }}),
    prisma.question.create({ data: {
      userId: anna.id,
      title: 'Come aiutare un figlio adolescente con problemi di umore?',
      content: 'Mia figlia di 15 anni è diventata molto chiusa e irritabile negli ultimi mesi. Non vuole parlare con me, ha smesso di vedere le amiche, i voti sono calati. Non so come avvicinarmi a lei senza farla chiudere ancora di più.',
    }}),
    prisma.question.create({ data: {
      userId: anna.id,
      title: 'Dipendenza dallo smartphone e dai social',
      content: 'Controllo il telefono ogni cinque minuti, anche di notte. Se non ho il telefono con me mi sento a disagio. So che è un problema ma non riesco a ridurre l\'uso. Ha senso parlarne con uno psicologo?',
    }}),
  ]);

  // ── RISPOSTE ─────────────────────────────────────────────────
  const [a1, a2, a3, a4, a5, a6, a7, a8, a9, a10] = await Promise.all([
    // Q1 procrastinazione - 2 risposte
    prisma.answer.create({ data: {
      questionId: q1.id, psychologistId: pFontana.id,
      content: 'La procrastinazione è spesso legata all\'ansia da prestazione, non alla pigrizia. Il cervello evita ciò che percepisce come minaccioso. Una tecnica efficace è il metodo Pomodoro: 25 minuti di lavoro, 5 di pausa. Ma soprattutto serve capire cosa si teme del compito, e su questo posso aiutarti.',
    }}),
    prisma.answer.create({ data: {
      questionId: q1.id, psychologistId: pVerdi.id,
      content: 'Quello che descrivi è un ciclo ansia-evitamento molto comune. Il senso di colpa serale aumenta l\'ansia del giorno dopo, alimentando il ciclo. Un breve percorso cognitivo-comportamentale aiuta a spezzare questo schema. Sono disponibile per un primo colloquio conoscitivo.',
    }}),
    // Q2 paura del giudizio - 1 risposta
    prisma.answer.create({ data: {
      questionId: q2.id, psychologistId: pPratesi.id,
      content: 'La paura del giudizio è una delle forme d\'ansia più diffuse. Si lavora sulla distorsione cognitiva del "pubblico immaginario", cioè l\'idea che gli altri ci osservino e giudichino più di quanto facciano realmente. Con le giuste tecniche si può ridurre significativamente in pochi mesi.',
    }}),
    // Q3 rabbia - 2 risposte
    prisma.answer.create({ data: {
      questionId: q3.id, psychologistId: pMarino.id,
      content: 'La rabbia incontrollata spesso maschera emozioni più profonde come paura, tristezza o senso di ingiustizia. Impararla a riconoscere prima che esploda è il primo passo. Tecniche di mindfulness e di comunicazione assertiva possono fare una grande differenza. Contattami per iniziare.',
    }}),
    prisma.answer.create({ data: {
      questionId: q3.id, psychologistId: pCosta.id,
      content: 'Il pentimento che sente dopo gli sfoghi indica una buona consapevolezza emotiva, che è già metà del lavoro. Nelle relazioni affettive la rabbia è spesso una richiesta di attenzione o di essere ascoltati. Un percorso focalizzato sulla gestione delle emozioni può aiutarla concretamente.',
    }}),
    // Q4 lutto - 1 risposta
    prisma.answer.create({ data: {
      questionId: q4.id, psychologistId: pMarino.id,
      content: 'Sentire la voce o la presenza di una persona cara nei mesi dopo la perdita è assolutamente normale, non si tratta di qualcosa di patologico. Il lutto ha tempi diversi per ognuno. Il fatto che si preoccupi di non pesare sulla famiglia dice molto di lei, ma è importante che anche lei abbia uno spazio per elaborare il dolore.',
    }}),
    // Q5 isolamento - 1 risposta
    prisma.answer.create({ data: {
      questionId: q5.id, psychologistId: pVerdi.id,
      content: 'Il ritiro sociale dopo la pandemia è un fenomeno molto diffuso. L\'isolamento prolungato ha "ricablato" alcune abitudini sociali. La buona notizia è che il cervello è plastico e si può tornare gradualmente a socializzare con esposizioni progressive. Non serve fare grandi passi, si inizia da piccoli.',
    }}),
    // Q6 pensieri intrusivi - 1 risposta
    prisma.answer.create({ data: {
      questionId: q6.id, psychologistId: pFontana.id,
      content: 'I pensieri intrusivi ripetitivi sono una caratteristica tipica del disturbo d\'ansia generalizzata. Non sono un segnale di malattia mentale grave, ma indicano che il sistema nervoso è in uno stato di iperallerta. La terapia cognitivo-comportamentale è molto efficace: si lavora sul de-fusionamento dai pensieri, imparando a osservarli senza esserne travolti.',
    }}),
    // Q7 figlia adolescente - 1 risposta
    prisma.answer.create({ data: {
      questionId: q7.id, psychologistId: pCosta.id,
      content: 'Quello che descrive è un quadro che merita attenzione. L\'isolamento e il calo del rendimento in adolescenza possono essere segnali di disagio emotivo. Il primo passo è creare uno spazio sicuro senza giudizi. A volte un percorso parallelo — uno per la figlia, uno per il genitore — dà risultati molto migliori che una terapia familiare diretta.',
    }}),
    // Q8 dipendenza smartphone - 1 risposta
    prisma.answer.create({ data: {
      questionId: q8.id, psychologistId: pPratesi.id,
      content: 'Assolutamente sì, ha senso parlarne con uno psicologo. La dipendenza da smartphone attiva gli stessi meccanismi neurali di altre dipendenze comportamentali. Non si tratta di mancanza di volontà. Si lavora sui trigger che portano al controllo compulsivo e si costruiscono strategie alternative. Non è una battaglia che si deve combattere da soli.',
    }}),
  ]);

  // ── CONVERSAZIONI ─────────────────────────────────────────────
  const [conv1, conv2, conv3, conv4] = await Promise.all([
    prisma.conversation.create({ data: { userId: marco.id,  psychologistId: pFontana.id, firstQuestionId: q1.id, firstAnswerId: a1.id } }),
    prisma.conversation.create({ data: { userId: sofia.id,  psychologistId: pMarino.id,  firstQuestionId: q3.id, firstAnswerId: a4.id } }),
    prisma.conversation.create({ data: { userId: luca.id,   psychologistId: pVerdi.id,   firstQuestionId: q5.id, firstAnswerId: a7.id } }),
    prisma.conversation.create({ data: { userId: anna.id,   psychologistId: pPratesi.id, firstQuestionId: q8.id, firstAnswerId: a10.id } }),
  ]);

  // ── MESSAGGI ─────────────────────────────────────────────────
  const now = new Date();
  const min = (n: number) => new Date(now.getTime() - n * 60000);

  await prisma.message.createMany({ data: [
    // Conv1: Marco ↔ Dott.ssa Fontana (procrastinazione)
    { conversationId: conv1.id, senderUserId: marco.id,       content: 'Buongiorno dottoressa, grazie per la risposta. Il metodo Pomodoro l\'ho già provato ma smetto dopo un paio di giorni. Forse il problema è più profondo?', createdAt: min(180) },
    { conversationId: conv1.id, senderPsychId: pFontana.id,   content: 'Buongiorno Marco! Sì, spesso dietro la procrastinazione c\'è qualcosa di più da esplorare. Sarebbe utile fare un primo colloquio per capire meglio la sua situazione specifica. Ha disponibilità questa settimana?', createdAt: min(160) },
    { conversationId: conv1.id, senderUserId: marco.id,       content: 'Sì, sono disponibile giovedì pomeriggio o venerdì mattina.', createdAt: min(140) },
    { conversationId: conv1.id, senderPsychId: pFontana.id,   content: 'Perfetto, giovedì alle 16:30 ho uno slot libero. Le mando i dettagli per il collegamento video. Il primo colloquio è gratuito e senza impegno.', createdAt: min(120) },
    { conversationId: conv1.id, senderUserId: marco.id,       content: 'Ottimo, giovedì alle 16:30 va benissimo. Grazie mille dottoressa!', createdAt: min(100) },
    { conversationId: conv1.id, senderPsychId: pFontana.id,   content: 'A giovedì allora! Nel frattempo, se vuole, provi a tenere un piccolo diario: ogni volta che rimanda qualcosa, scriva cosa stava pensando in quel momento. Ci aiuterà nel colloquio.', createdAt: min(90) },

    // Conv2: Sofia ↔ Dott.ssa Marino (rabbia)
    { conversationId: conv2.id, senderUserId: sofia.id,       content: 'Grazie per la risposta. Ha ragione, spesso quando mi arrabbio in realtà mi sento incompresa. Come funziona la mindfulness in questi casi?', createdAt: min(300) },
    { conversationId: conv2.id, senderPsychId: pMarino.id,    content: 'La mindfulness aiuta a creare uno "spazio" tra lo stimolo (la situazione che fa arrabbiare) e la reazione. Non si tratta di reprimere la rabbia, ma di imparare a notarla prima che prenda il controllo. Si può imparare in poche settimane con la guida giusta.', createdAt: min(270) },
    { conversationId: conv2.id, senderUserId: sofia.id,       content: 'Mi interessa molto. Fa anche sedute online? Vivo a Milano e non so se è possibile.', createdAt: min(240) },
    { conversationId: conv2.id, senderPsychId: pMarino.id,    content: 'Assolutamente sì, faccio regolarmente sedute online. Il servizio è identico a quello in presenza. Le mando le disponibilità per la prossima settimana.', createdAt: min(220) },
    { conversationId: conv2.id, senderUserId: sofia.id,       content: 'Grazie, aspetto la sua disponibilità!', createdAt: min(210) },

    // Conv3: Luca ↔ Dr. Verdi (isolamento)
    { conversationId: conv3.id, senderUserId: luca.id,        content: 'Salve, la sua risposta mi ha dato speranza. Dove si parte con questo percorso di "esposizione graduale"?', createdAt: min(500) },
    { conversationId: conv3.id, senderPsychId: pVerdi.id,     content: 'Ciao Luca! Si parte dall\'analisi di quali situazioni sociali evita e quanto le causano disagio, costruendo una specie di scala dal meno al più difficile. Poi si inizia dal gradino più basso, con obiettivi piccoli e realistici. Vuole fissare un colloquio?', createdAt: min(460) },
    { conversationId: conv3.id, senderUserId: luca.id,        content: 'Sì, ci provo. Anche solo venire a un colloquio mi spaventa un po\', ma capisco che è il primo passo.', createdAt: min(430) },
    { conversationId: conv3.id, senderPsychId: pVerdi.id,     content: 'È normale che anche il colloquio faccia un po\' paura. Possiamo farlo online, in modo che si senta più a suo agio. Non c\'è nessuna fretta e nessun giudizio. Quando vuole.', createdAt: min(410) },
    { conversationId: conv3.id, senderUserId: luca.id,        content: 'Online sarebbe perfetto. La ringrazio per la comprensione.', createdAt: min(390) },
    { conversationId: conv3.id, senderPsychId: pVerdi.id,     content: 'Benissimo! Le mando un link per scegliere l\'orario direttamente dalla mia agenda. A presto Luca.', createdAt: min(370) },

    // Conv4: Anna ↔ Dr. Pratesi (smartphone)
    { conversationId: conv4.id, senderUserId: anna.id,        content: 'Grazie per la risposta. Non mi aspettavo di sentirti dire che è un tema serio da affrontare. Pensavo di esagerare.', createdAt: min(90) },
    { conversationId: conv4.id, senderPsychId: pPratesi.id,   content: 'Non esagera affatto. L\'uso compulsivo del telefono è una difficoltà reale e sempre più comune. Il fatto che se ne sia accorta è già un grande primo passo. Possiamo parlarne con calma in un colloquio.', createdAt: min(70) },
    { conversationId: conv4.id, senderUserId: anna.id,        content: 'Ha disponibilità a Prato? Abito lì.', createdAt: min(50) },
    { conversationId: conv4.id, senderPsychId: pPratesi.id,   content: 'Perfetto, il mio studio è proprio a Prato, in Via Magnolfi. Ho disponibilità martedì mattina e sabato mattina. Quale preferisce?', createdAt: min(35) },
    { conversationId: conv4.id, senderUserId: anna.id,        content: 'Sabato mattina sarebbe ideale, grazie!', createdAt: min(20) },
    { conversationId: conv4.id, senderPsychId: pPratesi.id,   content: 'Ottimo! Sabato alle 10:00. Le mando la conferma via email. A presto Anna.', createdAt: min(10) },
  ]});

  // ── RECENSIONI ────────────────────────────────────────────────
  await prisma.review.createMany({ data: [
    { userId: marco.id, psychologistId: pFontana.id, rating: 5, comment: 'Bravissima, mi ha aiutato a capire le radici del problema. Dopo 2 mesi la situazione è molto migliorata.' },
    { userId: sofia.id, psychologistId: pMarino.id,  rating: 5, comment: 'Professionale e molto empatica. Le sedute online funzionano perfettamente. La consiglio.' },
    { userId: luca.id,  psychologistId: pVerdi.id,   rating: 4, comment: 'Molto competente e paziente. Mi ha aiutato a uscire gradualmente dall\'isolamento.' },
    { userId: anna.id,  psychologistId: pCosta.id,   rating: 5, comment: 'Ottimo professionista, mi ha dato strumenti concreti per migliorare la comunicazione con mia figlia.' },
  ]});

  // ── APPUNTAMENTI ─────────────────────────────────────────────
  const day = (d: number, h: number, m = 0) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + d);
    dt.setHours(h, m, 0, 0);
    return dt;
  };

  await prisma.appointment.createMany({ data: [
    // Agenda Fontana
    {
      psychologistId: pFontana.id, userId: marco.id,
      title: 'Primo colloquio - Marco Bianchi',
      notes: 'Procrastinazione e ansia da prestazione',
      startTime: day(2, 16, 30), endTime: day(2, 17, 30),
      isExternal: false, status: 'CONFIRMED',
    },
    {
      psychologistId: pFontana.id, userId: null,
      title: 'Cliente esterno - Giulia R.',
      externalClientName: 'Giulia Romanelli',
      notes: 'Seduta di follow-up',
      startTime: day(3, 10, 0), endTime: day(3, 11, 0),
      isExternal: true, status: 'CONFIRMED',
    },
    {
      psychologistId: pFontana.id, userId: null,
      title: 'Cliente esterno - Paolo M.',
      externalClientName: 'Paolo Marchi',
      startTime: day(4, 15, 0), endTime: day(4, 16, 0),
      isExternal: true, status: 'CONFIRMED',
    },
    // Agenda Pratesi
    {
      psychologistId: pPratesi.id, userId: anna.id,
      title: 'Primo colloquio - Anna Esposito',
      notes: 'Uso compulsivo smartphone',
      startTime: day(5, 10, 0), endTime: day(5, 11, 0),
      isExternal: false, status: 'CONFIRMED',
    },
    {
      psychologistId: pPratesi.id, userId: null,
      title: 'Cliente esterno - Davide C.',
      externalClientName: 'Davide Conti',
      startTime: day(5, 14, 0), endTime: day(5, 15, 0),
      isExternal: true, status: 'CONFIRMED',
    },
    // Agenda Verdi
    {
      psychologistId: pVerdi.id, userId: luca.id,
      title: 'Colloquio online - Luca Ferrari',
      notes: 'Isolamento sociale post-pandemia',
      startTime: day(1, 11, 0), endTime: day(1, 12, 0),
      isExternal: false, status: 'CONFIRMED',
    },
    // Agenda Marino
    {
      psychologistId: pMarino.id, userId: sofia.id,
      title: 'Seduta online - Sofia Ricci',
      notes: 'Gestione rabbia e comunicazione',
      startTime: day(3, 15, 0), endTime: day(3, 16, 0),
      isExternal: false, status: 'CONFIRMED',
    },
  ]});

  // ── POST PSICOLOGI ────────────────────────────────────────────
  await prisma.post.createMany({ data: [
    { psychologistId: pVerdi.id,   content: 'L\'ansia non è un nemico da sconfiggere, ma un segnale da ascoltare. Spesso ci avvisa che qualcosa nella nostra vita merita attenzione. Imparare a distinguere ansia utile da ansia disfunzionale è il primo passo verso il benessere.' },
    { psychologistId: pVerdi.id,   content: 'Piccolo promemoria: il confronto con gli altri sui social mostra sempre il loro momento migliore, non la realtà quotidiana. Proteggere la propria autostima significa anche sapere quando disconnettersi.' },
    { psychologistId: pMarino.id,  content: 'La rabbia è un\'emozione secondaria: quasi sempre sotto c\'è paura, tristezza o un bisogno inascoltato. Invece di chiedersi "come faccio a non arrabbiarmi", proviamo a chiederci "cosa ho paura di perdere?".' },
    { psychologistId: pMarino.id,  content: 'Nelle relazioni di coppia, litigare non è il problema. Il problema è come si litiga. La comunicazione assertiva — esprimere i propri bisogni senza attaccare l\'altro — si impara, non è innata.' },
    { psychologistId: pCosta.id,   content: 'Adolescenza: un periodo di costruzione dell\'identità in cui i ragazzi hanno bisogno di sentirsi capiti, non giudicati. Per i genitori, la cosa più difficile e più preziosa è saper ascoltare senza dare subito risposte.' },
    { psychologistId: pFontana.id, content: 'Procrastinare non significa essere pigri. Spesso significa avere paura: del fallimento, del giudizio, della perfezione. Riconoscere questa paura è già metà del lavoro.' },
    { psychologistId: pPratesi.id, content: 'Ogni volta che prendiamo il telefono senza uno scopo preciso, stiamo cercando qualcosa: distrazione, connessione, stimolo. Capire cosa cerchiamo davvero è il punto di partenza per un rapporto più sano con la tecnologia.' },
  ]});

  console.log('✅ Seed completato!');
  console.log('');
  console.log('📋 Account disponibili (password: simone1997)');
  console.log('   admin@test.com   → ADMIN');
  console.log('   marco@test.com   → USER');
  console.log('   sofia@test.com   → USER');
  console.log('   luca@test.com    → USER');
  console.log('   anna@test.com    → USER');
  console.log('   verdi@test.com   → PSICOLOGO (Milano)');
  console.log('   marino@test.com  → PSICOLOGO (Roma)');
  console.log('   costa@test.com   → PSICOLOGO (Firenze)');
  console.log('   fontana@test.com → PSICOLOGO (Torino)');
  console.log('   prato@test.com   → PSICOLOGO (Prato)');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
