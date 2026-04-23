import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Pulizia DB...');

  // Elimina in ordine (rispettando le FK)
  await prisma.message.deleteMany();
  await prisma.review.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.answer.deleteMany();
  await prisma.question.deleteMany();
  await prisma.psychologist.deleteMany();
  await prisma.appSettings.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ DB pulito');

  const pwd = await bcrypt.hash('simone1997', 10);

  // ── ADMIN ────────────────────────────────────────────────────
  await prisma.user.create({
    data: { email: 'admin@test.com', password: pwd, role: 'ADMIN', firstName: 'Admin', lastName: 'ProntoPsicologo' },
  });

  // ── UTENTI ───────────────────────────────────────────────────
  const [marco, sofia, luca, anna] = await Promise.all([
    prisma.user.create({ data: { email: 'marco@test.com', password: pwd, role: 'USER', firstName: 'Marco', lastName: 'Bianchi', latitude: 43.8777, longitude: 11.1023 } }),
    prisma.user.create({ data: { email: 'sofia@test.com', password: pwd, role: 'USER', firstName: 'Sofia', lastName: 'Ricci', latitude: 45.4654, longitude: 9.1859 } }),
    prisma.user.create({ data: { email: 'luca@test.com', password: pwd, role: 'USER', firstName: 'Luca', lastName: 'Ferrari', latitude: 41.9028, longitude: 12.4964 } }),
    prisma.user.create({ data: { email: 'anna@test.com', password: pwd, role: 'USER', firstName: 'Anna', lastName: 'Esposito', latitude: 43.7696, longitude: 11.2558 } }),
  ]);

  // ── PSICOLOGI ────────────────────────────────────────────────
  const psychUsers = await Promise.all([
    prisma.user.create({ data: { email: 'verdi@test.com', password: pwd, role: 'PSYCHOLOGIST', firstName: 'Giuseppe', lastName: 'Verdi' } }),
    prisma.user.create({ data: { email: 'marino@test.com', password: pwd, role: 'PSYCHOLOGIST', firstName: 'Chiara', lastName: 'Marino' } }),
    prisma.user.create({ data: { email: 'costa@test.com', password: pwd, role: 'PSYCHOLOGIST', firstName: 'Alessandro', lastName: 'Costa' } }),
    prisma.user.create({ data: { email: 'fontana@test.com', password: pwd, role: 'PSYCHOLOGIST', firstName: 'Elena', lastName: 'Fontana' } }),
    prisma.user.create({ data: { email: 'prato@test.com', password: pwd, role: 'PSYCHOLOGIST', firstName: 'Roberto', lastName: 'Pratesi' } }),
  ]);

  const [pVerdi, pMarino, pCosta, pFontana, pPratesi] = await Promise.all([
    prisma.psychologist.create({ data: {
      userId: psychUsers[0].id, alboCode: 'OPL-11234', verified: true,
      bio: 'Specializzato in disturbi d\'ansia e attacchi di panico. 15 anni di esperienza clinica.',
      address: 'Via Dante 15, 20121 Milano', phone: '+39 02 1234567', latitude: 45.4654, longitude: 9.1859,
      isMale: true,
      specAnsia: true, specStress: true, specAutostima: true, specTrauma: true,
    }}),
    prisma.psychologist.create({ data: {
      userId: psychUsers[1].id, alboCode: 'OPL-22345', verified: true,
      bio: 'Psicologa cognitivo-comportamentale. Mi occupo di depressione, ansia e disturbi dell\'umore.',
      address: 'Piazza Navona 8, 00186 Roma', phone: '+39 06 9876543', latitude: 41.9028, longitude: 12.4964,
      isMale: false,
      specAnsia: true, specUmore: true, specTrauma: true, specLutto: true, specDipendenze: true,
    }}),
    prisma.psychologist.create({ data: {
      userId: psychUsers[2].id, alboCode: 'OPL-33456', verified: false,
      bio: 'Psicoterapeuta di coppia e familiare. Approccio sistemico-relazionale.',
      address: 'Via Tornabuoni 22, 50123 Firenze', phone: '+39 055 3456789', latitude: 43.7696, longitude: 11.2558,
      isMale: true,
      specCoppia: true, specRelazioni: true, specGenitorialita: true, specInfanzia: true,
    }}),
    prisma.psychologist.create({ data: {
      userId: psychUsers[3].id, alboCode: 'OPL-44567', verified: true,
      bio: 'Esperta in psicologia del lavoro e burnout. Supporto a professionisti e manager.',
      address: 'Corso Vittorio Emanuele 5, 10128 Torino', phone: '+39 011 2345678', latitude: 45.0703, longitude: 7.6869,
      isMale: false,
      specStress: true, specAutostima: true, specRelazioni: true, specUmore: true, specNeurodivergenze: true,
    }}),
    prisma.psychologist.create({ data: {
      userId: psychUsers[4].id, alboCode: 'OPL-55678', verified: true,
      bio: 'Psicologo clinico con sede a Prato. Specializzato in autostima e relazioni interpersonali.',
      address: 'Via Magnolfi 10, 59100 Prato', phone: '+39 0574 123456', latitude: 43.8800, longitude: 11.0950,
      isMale: true,
      specAutostima: true, specRelazioni: true, specAnsia: true, specDisturbiAlimentari: true, specSessualita: true,
    }}),
  ]);

  // ── DOMANDE ──────────────────────────────────────────────────
  const [q1, q2, q3, q4, q5, q6, q7] = await Promise.all([
    prisma.question.create({ data: { userId: marco.id, title: 'Come gestire l\'ansia da prestazione?', content: 'Ogni volta che devo affrontare una situazione importante al lavoro o con gli amici mi blocco completamente. Il cuore mi batte forte e non riesco a pensare. Come posso gestire questi momenti?' } }),
    prisma.question.create({ data: { userId: marco.id, title: 'Difficoltà nel dormire', content: 'Da mesi non riesco a dormire bene. Mi sveglio alle 3 di notte e non riprendo sonno. Ho provato di tutto ma niente funziona. Potrebbe essere un problema psicologico?' } }),
    prisma.question.create({ data: { userId: sofia.id, title: 'Problemi nella relazione di coppia', content: 'Io e il mio ragazzo litighiamo continuamente per le stesse cose. Non riusciamo a comunicare. Stiamo insieme da 4 anni e non voglio perdere questa relazione, ma non so come migliorare la situazione.' } }),
    prisma.question.create({ data: { userId: sofia.id, title: 'Senso di vuoto e mancanza di motivazione', content: 'Ultimamente mi sento spenta. Non ho voglia di fare nulla, le cose che prima mi piacevano ora non mi interessano più. Non è tristezza vera, è più come un grigiore costante. È normale?' } }),
    prisma.question.create({ data: { userId: luca.id, title: 'Attacchi di panico in luoghi affollati', content: 'Ho iniziato ad avere attacchi di panico quando sono in luoghi affollati come metro o centri commerciali. Evito sempre più posti e sento che la mia vita si sta restringendo.' } }),
    prisma.question.create({ data: { userId: anna.id, title: 'Bassa autostima e pensieri negativi', content: 'Mi giudico sempre negativamente. Anche quando ottengo risultati, penso che sia solo fortuna. Mi confronto continuamente con gli altri e ne esco sempre sconfitta. Come si lavora sull\'autostima?' } }),
    prisma.question.create({ data: { userId: anna.id, title: 'Stress lavorativo e burnout', content: 'Lavoro 10-12 ore al giorno da 2 anni. Mi sento esaurita, irritabile e non riesco più a staccare mentalmente dal lavoro nemmeno nei weekend. Ho paura di fare un crollo.' } }),
  ]);

  // ── RISPOSTE ─────────────────────────────────────────────────
  const [a1, a2, a3, a4, a5, a6, a7, a8] = await Promise.all([
    // Q1 ansia prestazione - 2 risposte
    prisma.answer.create({ data: { questionId: q1.id, psychologistId: pVerdi.id, content: 'L\'ansia da prestazione è molto comune e trattabile. La tecnica più efficace è la respirazione diaframmatica: inspira 4 secondi, trattieni 4, espira 6. Praticala quotidianamente. Considera anche la terapia cognitivo-comportamentale che lavora sui pensieri catastrofici.' } }),
    prisma.answer.create({ data: { questionId: q1.id, psychologistId: pPratesi.id, content: 'Quello che descrivi è un circolo vizioso: ansia → blocco → più ansia. È importante imparare a de-catastrophizzare i pensieri. Un percorso psicologico di 8-10 sedute può fare una grande differenza. Non esitare a contattarmi.' } }),
    // Q2 sonno - 1 risposta
    prisma.answer.create({ data: { questionId: q2.id, psychologistId: pMarino.id, content: 'I problemi del sonno spesso hanno radici psicologiche come ansia, stress o ruminazione. La CBT-I (terapia cognitivo-comportamentale per l\'insonnia) è il trattamento gold standard. Inizia con un diario del sonno per 2 settimane e porta i dati a uno specialista.' } }),
    // Q3 coppia - 2 risposte
    prisma.answer.create({ data: { questionId: q3.id, psychologistId: pCosta.id, content: 'La terapia di coppia può essere molto utile in questa fase. Imparare a comunicare in modo non violento, usando messaggi in prima persona ("io mi sento...") invece di accuse ("tu fai sempre...") è il primo passo. Sono disponibile per un colloquio conoscitivo.' } }),
    prisma.answer.create({ data: { questionId: q3.id, psychologistId: pMarino.id, content: 'Quattro anni di relazione e la voglia di non perderla sono già un ottimo punto di partenza. I conflitti ripetitivi di solito nascondono bisogni insoddisfatti. Spesso bastano poche sedute per sbloccare la comunicazione.' } }),
    // Q5 panico - 1 risposta
    prisma.answer.create({ data: { questionId: q5.id, psychologistId: pVerdi.id, content: 'Gli attacchi di panico con evitamento dei luoghi affollati indicano spesso un disturbo d\'ansia che risponde molto bene alla terapia. L\'esposizione graduale ai luoghi temuti, guidata da un professionista, è il metodo più efficace. Non rimandare, prima si interviene meglio è.' } }),
    // Q6 autostima - 1 risposta
    prisma.answer.create({ data: { questionId: q6.id, psychologistId: pPratesi.id, content: 'Quello che descrivi si chiama "sindrome dell\'impostore" ed è molto più comune di quanto si pensi. Lavorare sull\'autostima richiede tempo ma è possibile. Il percorso parte dall\'identificare i pensieri automatici negativi e sostituirli con valutazioni più realistiche. Contattami per iniziare.' } }),
    // Q7 burnout - 1 risposta
    prisma.answer.create({ data: { questionId: q7.id, psychologistId: pFontana.id, content: 'I sintomi che descrivi sono classici del burnout. È fondamentale intervenire ora prima che la situazione peggiori. Lavoro specificamente con il burnout professionale: insieme possiamo identificare i tuoi limiti, migliorare la gestione dello stress e ritrovare un equilibrio lavoro-vita.' } }),
  ]);

  // ── CONVERSAZIONI ─────────────────────────────────────────────
  const [conv1, conv2, conv3] = await Promise.all([
    prisma.conversation.create({ data: { userId: marco.id, psychologistId: pVerdi.id, firstQuestionId: q1.id, firstAnswerId: a1.id } }),
    prisma.conversation.create({ data: { userId: marco.id, psychologistId: pPratesi.id, firstQuestionId: q1.id, firstAnswerId: a2.id } }),
    prisma.conversation.create({ data: { userId: sofia.id, psychologistId: pCosta.id, firstQuestionId: q3.id, firstAnswerId: a4.id } }),
  ]);

  // ── MESSAGGI ─────────────────────────────────────────────────
  const now = new Date();
  const min = (n: number) => new Date(now.getTime() - n * 60000);

  await prisma.message.createMany({ data: [
    // Conv1: Marco ↔ Dr. Verdi
    { conversationId: conv1.id, senderUserId: marco.id, content: 'Buongiorno dottore, ho letto la sua risposta e la ringrazio. Possiamo fissare un appuntamento?', createdAt: min(120) },
    { conversationId: conv1.id, senderPsychId: pVerdi.id, content: 'Buongiorno Marco! Certo, sono disponibile martedì e giovedì pomeriggio. Quando preferisce?', createdAt: min(100) },
    { conversationId: conv1.id, senderUserId: marco.id, content: 'Giovedì alle 17 andrebbe perfetto, grazie mille.', createdAt: min(85) },
    { conversationId: conv1.id, senderPsychId: pVerdi.id, content: 'Perfetto, la aspetto giovedì alle 17. Le invio i dettagli via email. A presto!', createdAt: min(80) },
    { conversationId: conv1.id, senderUserId: marco.id, content: 'Grazie dottore, a giovedì!', createdAt: min(75) },

    // Conv2: Marco ↔ Dr. Pratesi
    { conversationId: conv2.id, senderUserId: marco.id, content: 'Salve, grazie per la sua risposta. Sono di Prato, quindi sarebbe comodo incontrarci. Come funziona il percorso?', createdAt: min(60) },
    { conversationId: conv2.id, senderPsychId: pPratesi.id, content: 'Ottimo! Di solito iniziamo con un colloquio conoscitivo di 50 minuti per valutare insieme la situazione. Il costo è di 70€. Possiamo anche fare sessioni online se preferisce.', createdAt: min(45) },
    { conversationId: conv2.id, senderUserId: marco.id, content: 'Preferirei in presenza. Ha disponibilità la settimana prossima?', createdAt: min(30) },
    { conversationId: conv2.id, senderPsychId: pPratesi.id, content: 'Sì, ho un posto libero mercoledì alle 10:30 e venerdì alle 15:00. Quale preferisce?', createdAt: min(20) },

    // Conv3: Sofia ↔ Dr. Costa
    { conversationId: conv3.id, senderUserId: sofia.id, content: 'Salve dottore, la sua risposta mi ha convinta. Io e il mio ragazzo vorremmo provare la terapia di coppia.', createdAt: min(200) },
    { conversationId: conv3.id, senderPsychId: pCosta.id, content: 'Sono contento che abbiate deciso di provare! La terapia di coppia richiede la partecipazione di entrambi. Posso avere qualche informazione in più sulla situazione?', createdAt: min(180) },
    { conversationId: conv3.id, senderUserId: sofia.id, content: 'Sì certo. I litigi principali riguardano la gestione della casa e il tempo da dedicarci. Lui lavora tanto e io mi sento trascurata.', createdAt: min(160) },
    { conversationId: conv3.id, senderPsychId: pCosta.id, content: 'È un tema molto comune. Il primo passo è imparare ad esprimere i bisogni senza accusare. Fissate un primo appuntamento entrambi insieme e iniziamo da lì.', createdAt: min(140) },
    { conversationId: conv3.id, senderUserId: sofia.id, content: 'Perfetto. Quando è disponibile?', createdAt: min(120) },
    { conversationId: conv3.id, senderPsychId: pCosta.id, content: 'Sabato mattina alle 10 potrebbe andare? Così anche il suo ragazzo non deve assentarsi dal lavoro.', createdAt: min(100) },
    { conversationId: conv3.id, senderUserId: sofia.id, content: 'Sabato alle 10 è perfetto! La ringrazio dottore.', createdAt: min(80) },
  ]});

  // ── RECENSIONI ────────────────────────────────────────────────
  await prisma.review.createMany({ data: [
    { userId: marco.id, psychologistId: pVerdi.id, rating: 5, comment: 'Professionista eccezionale. Mi ha aiutato tantissimo con l\'ansia. Lo consiglio vivamente.' },
    { userId: sofia.id, psychologistId: pCosta.id, rating: 4, comment: 'Molto competente e paziente. La terapia di coppia sta funzionando.' },
    { userId: anna.id, psychologistId: pPratesi.id, rating: 5, comment: 'Finalmente mi sento capita. Il percorso sull\'autostima sta dando i suoi frutti.' },
  ]});

  // ── APP SETTINGS ─────────────────────────────────────────────
  await prisma.appSettings.create({
    data: { id: 'singleton', radiusKm: 50, expandMinutes: 60, maxAnswers: 5 },
  });

  console.log('✅ Seed completato!');
  console.log('');
  console.log('📋 Account disponibili (password: simone1997)');
  console.log('   admin@test.com        → ADMIN');
  console.log('   marco@test.com        → USER (Prato)');
  console.log('   sofia@test.com        → USER (Milano)');
  console.log('   luca@test.com         → USER (Roma)');
  console.log('   anna@test.com         → USER (Firenze)');
  console.log('   verdi@test.com        → PSICOLOGO (Milano)');
  console.log('   marino@test.com       → PSICOLOGO (Roma)');
  console.log('   costa@test.com        → PSICOLOGO (Firenze)');
  console.log('   fontana@test.com      → PSICOLOGO (Torino)');
  console.log('   prato@test.com        → PSICOLOGO (Prato)');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
