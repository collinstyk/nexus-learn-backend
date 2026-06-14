import prisma from "../src/prisma.js";

async function main() {
  console.log("🌱 [Seed Initialization] Purging old training terrain...");
  
  // --- 1. CLEAN SLATE PURGE ENGINE ---
  await prisma.activityLog.deleteMany({});
  await prisma.learningRoadmap.deleteMany({});
  await prisma.aiChatSession.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.postLike.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.matchParticipant.deleteMany({});
  await prisma.match.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.resource.deleteMany({});
  await prisma.enrollment.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.topic.deleteMany({});
  await prisma.subject.deleteMany({});

  console.log("🏗️ [Seed Matrix] Injecting unified master subjects...");
  
  // --- 2. DEFINE MASTER DISCIPLINE ENTITIES ---
  const subjectsData = [
    { name: "COMPUTER SCIENCE" },
    { name: "WEB DEVELOPMENT" },
    { name: "MATHEMATICS" },
    { name: "ENGLISH" },
    { name: "PHYSICS" },
    { name: "CHEMISTRY" },
    { name: "BIOLOGY" },
    { name: "AGRICULTURAL STUDIES" }
  ];

  const subjects: Record<string, any> = {};
  for (const s of subjectsData) {
    subjects[s.name] = await prisma.subject.create({ data: s });
  }

  console.log("🌿 [Seed Matrix] Branching modular topics...");
  
  // --- 3. DEFINE GRANULAR TOPICS (Bridges to Subjects) ---
  const topicsData = [
    { name: "Data Structures & Algorithms", subject: "COMPUTER SCIENCE" },
    { name: "Relational Database Engine Management", subject: "COMPUTER SCIENCE" },
    { name: "Real-Time Networking Protocols", subject: "WEB DEVELOPMENT" },
    { name: "Calculus & Linear Algebra", subject: "MATHEMATICS" },
    { name: "Syntax, Grammar & Lexicon", subject: "ENGLISH" },
    { name: "Mechanics & Wave Dynamics", subject: "PHYSICS" },
    { name: "Organic & Analytical Chemistry", subject: "CHEMISTRY" },
    { name: "Cellular Biology & Genetics", subject: "BIOLOGY" },
    { name: "Crop Husbandry & Soil Science", subject: "AGRICULTURAL STUDIES" }
  ];

  const topics: Record<string, any> = {};
  for (const t of topicsData) {
    topics[t.name] = await prisma.topic.create({
      data: {
        name: t.name,
        subjects: { connect: { id: subjects[t.subject].id } }
      }
    });
  }

  console.log("🎓 [Seed Matrix] Verifying default verified Tutor Profile...");
  const fallbackUser = await prisma.user.findFirst();
  let tutorProfileId = fallbackUser?.id;

  if (!fallbackUser) {
    const freshUser = await prisma.user.create({
      data: { name: "System Seed Tutor", email: "tutor@nexuslearn.com" }
    });
    const profile = await prisma.tutorProfile.create({
      data: { userId: freshUser.id, credentialsUrl: "https://nexus.edu/cert.pdf", bio: "Senior Curriculum Engineer" }
    });
    tutorProfileId = profile.id;
  } else {
    const profile = await prisma.tutorProfile.upsert({
      where: { userId: fallbackUser.id },
      update: {},
      create: { userId: fallbackUser.id, credentialsUrl: "https://nexus.edu/cert.pdf", bio: "Senior Curriculum Engineer" }
    });
    tutorProfileId = profile.id;
  }

  console.log("📚 [Seed Matrix] Structuring academic course syllabi...");
  
  // --- 4. CREATE COURSES (1:1 with primary Topics for direct verification loops) ---
  const coursesData = [
    { title: "Advanced Backend Systems", code: "CS-201", topic: "Data Structures & Algorithms" },
    { title: "Real-Time Systems & Architecture", code: "WD-101", topic: "Real-Time Networking Protocols" },
    { title: "Advanced Engineering Calculus", code: "MTH-201", topic: "Calculus & Linear Algebra" },
    { title: "Foundations of English Syntax", code: "ENG-101", topic: "Syntax, Grammar & Lexicon" },
    { title: "Classical Newtonian Mechanics", code: "PHY-101", topic: "Mechanics & Wave Dynamics" },
    { title: "Introduction to Organic Syntheses", code: "CHM-201", topic: "Organic & Analytical Chemistry" },
    { title: "Soil Nutrition & Crop Yield Optimization", code: "AGR-101", topic: "Crop Husbandry & Soil Science" }
  ];

  for (const c of coursesData) {
    await prisma.course.create({
      data: {
        title: c.title,
        code: c.code,
        description: `Comprehensive multi-tier syllabus covering core modules in ${c.title}.`,
        isPublished: true, // Mark seeded courses as published by default
        tutorProfileId: tutorProfileId!,
        topics: { connect: { id: topics[c.topic].id } }
      }
    });
  }

  console.log("🎲 [Seed Matrix] Deploying Polymorphic 70-Question Master Deck (10 Per Context Target)...");

  // --- 5. THE 70-QUESTION MASTER MATRIX DECK ---
  const masterQuestions = [
    // 💻 1. COMPUTER SCIENCE (Data Structures & Algorithms) - 10 Questions
    {
      text: "What is the worst-case time complexity of the Merge Sort algorithm?",
      options: [{ id: "1", text: "O(n)" }, { id: "2", text: "O(n²)" }, { id: "3", text: "O(n log n)" }, { id: "4", text: "O(1)" }],
      correctAnswer: "3", topic: "Data Structures & Algorithms", subject: "COMPUTER SCIENCE"
    },
    {
      text: "Which data structure operates on a strict Last-In, First-Out (LIFO) access layer?",
      options: [{ id: "1", text: "Queue" }, { id: "2", text: "Stack" }, { id: "3", text: "Heap" }, { id: "4", text: "Linked List" }],
      correctAnswer: "2", topic: "Data Structures & Algorithms", subject: "COMPUTER SCIENCE"
    },
    {
      text: "What is the worst-case time complexity of searching a value inside an unbalanced Binary Search Tree?",
      options: [{ id: "1", text: "O(1)" }, { id: "2", text: "O(log n)" }, { id: "3", text: "O(n)" }, { id: "4", text: "O(n log n)" }],
      correctAnswer: "3", topic: "Data Structures & Algorithms", subject: "COMPUTER SCIENCE"
    },
    {
      text: "Which design method does Dijkstra's shortest path algorithm implement?",
      options: [{ id: "1", text: "Divide and Conquer" }, { id: "2", text: "Dynamic Programming" }, { id: "3", text: "Greedy Approach" }, { id: "4", text: "Backtracking" }],
      correctAnswer: "3", topic: "Data Structures & Algorithms", subject: "COMPUTER SCIENCE"
    },
    {
      text: "Which sorting algorithm is inherently stable and executes in-place?",
      options: [{ id: "1", text: "Quick Sort" }, { id: "2", text: "Heap Sort" }, { id: "3", text: "Insertion Sort" }, { id: "4", text: "Selection Sort" }],
      correctAnswer: "3", topic: "Data Structures & Algorithms", subject: "COMPUTER SCIENCE"
    },
    {
      text: "What is the key advantage of an adjacency list over an adjacency matrix for sparse graphs?",
      options: [{ id: "1", text: "Faster edge lookups" }, { id: "2", text: "Reduced memory consumption" }, { id: "3", text: "Simpler weights management" }, { id: "4", text: "O(1) vertex removal" }],
      correctAnswer: "2", topic: "Data Structures & Algorithms", subject: "COMPUTER SCIENCE"
    },
    {
      text: "Which traversal strategy visits a tree's root element last?",
      options: [{ id: "1", text: "Pre-order" }, { id: "2", text: "In-order" }, { id: "3", text: "Post-order" }, { id: "4", text: "Level-order" }],
      correctAnswer: "3", topic: "Data Structures & Algorithms", subject: "COMPUTER SCIENCE"
    },
    {
      text: "What mathematical property does a Max-Heap maintain for its nodes?",
      options: [{ id: "1", text: "Left child > Parent" }, { id: "2", text: "Parent >= Children" }, { id: "3", text: "Right child > Left child" }, { id: "4", text: "All leaves reside on level 0" }],
      correctAnswer: "2", topic: "Data Structures & Algorithms", subject: "COMPUTER SCIENCE"
    },
    {
      text: "What problem arises when multiple hash keys map directly to the same array index layout?",
      options: [{ id: "1", text: "Fragmentation" }, { id: "2", text: "Collision" }, { id: "3", text: "Overflow Error" }, { id: "4", text: "Null Reference Exception" }],
      correctAnswer: "2", topic: "Data Structures & Algorithms", subject: "COMPUTER SCIENCE"
    },
    {
      text: "Which property ensures a relational database transaction is completely processed or fully rolled back?",
      options: [{ id: "1", text: "Atomicity" }, { id: "2", text: "Consistency" }, { id: "3", text: "Isolation" }, { id: "4", text: "Durability" }],
      correctAnswer: "1", topic: "Relational Database Engine Management", subject: "COMPUTER SCIENCE"
    },

    // 🌐 2. WEB DEVELOPMENT (Real-Time Networking Protocols) - 10 Questions
    {
      text: "Which HTML5 element is designed to display persistent full-duplex communication streams?",
      options: [{ id: "1", text: "Server-Sent Events" }, { id: "2", text: "WebSockets" }, { id: "3", text: "Local Storage" }, { id: "4", text: "Service Workers" }],
      correctAnswer: "2", topic: "Real-Time Networking Protocols", subject: "WEB DEVELOPMENT"
    },
    {
      text: "What layer of the OSI model does the WebSockets protocol build upon initially?",
      options: [{ id: "1", text: "Network Layer" }, { id: "2", text: "Transport Layer" }, { id: "3", text: "Application Layer" }, { id: "4", text: "Session Layer" }],
      correctAnswer: "3", topic: "Real-Time Networking Protocols", subject: "WEB DEVELOPMENT"
    },
    {
      text: "Which HTTP header is sent by a client to initiate a WebSocket upgrade sequence request?",
      options: [{ id: "1", text: "Connection: Upgrade" }, { id: "2", text: "Keep-Alive: Active" }, { id: "3", text: "Transfer-Encoding: Stream" }, { id: "4", text: "Content-Type: EventStream" }],
      correctAnswer: "1", topic: "Real-Time Networking Protocols", subject: "WEB DEVELOPMENT"
    },
    {
      text: "What protocol does WebRTC predominantly use for its low-latency media streams transport layer?",
      options: [{ id: "1", text: "TCP" }, { id: "2", text: "UDP" }, { id: "3", text: "HTTP/2" }, { id: "4", text: "MQTT" }],
      correctAnswer: "2", topic: "Real-Time Networking Protocols", subject: "WEB DEVELOPMENT"
    },
    {
      text: "What is the primary role of a STUN server inside a real-time WebRTC media pipeline?",
      options: [{ id: "1", text: "Relaying actual raw streaming data" }, { id: "2", text: "Discovering a public IP address" }, { id: "3", text: "Encrypting audio channels" }, { id: "4", text: "Authenticating user credentials" }],
      correctAnswer: "2", topic: "Real-Time Networking Protocols", subject: "WEB DEVELOPMENT"
    },
    {
      text: "Which real-time mechanism relies entirely on unidirectional server-to-client streaming push over HTTP standard pipelines?",
      options: [{ id: "1", text: "WebSockets" }, { id: "2", text: "Server-Sent Events (SSE)" }, { id: "3", text: "Short Polling" }, { id: "4", text: "gRPC Streams" }],
      correctAnswer: "2", topic: "Real-Time Networking Protocols", subject: "WEB DEVELOPMENT"
    },
    {
      text: "What is the primary operational objective of using HTTP Long Polling workflows?",
      options: [{ id: "1", text: "Zero-cost encryption" }, { id: "2", text: "Emulating server push mechanisms" }, { id: "3", text: "Compressing asset assets" }, { id: "4", text: "Bypassing cross-origin guards" }],
      correctAnswer: "2", topic: "Real-Time Networking Protocols", subject: "WEB DEVELOPMENT"
    },
    {
      text: "Which architecture paradigm underpins real-time Internet of Things (IoT) MQTT telemetry exchanges?",
      options: [{ id: "1", text: "Request-Response" }, { id: "2", text: "Publish-Subscribe" }, { id: "3", text: "RPC Tiers" }, { id: "4", text: "Peer-to-Peer File Sync" }],
      correctAnswer: "2", topic: "Real-Time Networking Protocols", subject: "WEB DEVELOPMENT"
    },
    {
      text: "Which WebSocket frame type checks link status and ensures connections stay alive?",
      options: [{ id: "1", text: "Text Frame" }, { id: "2", text: "Binary Frame" }, { id: "3", text: "Ping/Pong Frame" }, { id: "4", text: "Close Frame" }],
      correctAnswer: "3", topic: "Real-Time Networking Protocols", subject: "WEB DEVELOPMENT"
    },
    {
      text: "What performance enhancement does HTTP/2 bring to asset multiplexing compared to old HTTP/1.1 tracks?",
      options: [{ id: "1", text: "Enforcing single connection streaming limits" }, { id: "2", text: "Concurrent requests over a single TCP pipeline" }, { id: "3", text: "Mandatory base64 string compilation" }, { id: "4", text: "Removing headers entirely" }],
      correctAnswer: "2", topic: "Real-Time Networking Protocols", subject: "WEB DEVELOPMENT"
    },

    // 🧮 3. MATHEMATICS (Calculus & Linear Algebra) - 10 Questions
    {
      text: "What is the derivative of f(x) = sin(x) with respect to x?",
      options: [{ id: "1", text: "cos(x)" }, { id: "2", text: "-sin(x)" }, { id: "3", text: "-cos(x)" }, { id: "4", text: "tan(x)" }],
      correctAnswer: "1", topic: "Calculus & Linear Algebra", subject: "MATHEMATICS"
    },
    {
      text: "What is the determinant of a 2x2 identity matrix?",
      options: [{ id: "1", text: "0" }, { id: "2", text: "1" }, { id: "3", text: "-1" }, { id: "4", text: "Undefined" }],
      correctAnswer: "2", topic: "Calculus & Linear Algebra", subject: "MATHEMATICS"
    },
    {
      text: "What value does the limit of (1/x) approach as x goes to positive infinity?",
      options: [{ id: "1", text: "1" }, { id: "2", text: "Infinity" }, { id: "3", text: "0" }, { id: "4", text: "-1" }],
      correctAnswer: "3", topic: "Calculus & Linear Algebra", subject: "MATHEMATICS"
    },
    {
      text: "What are the eigenvalues of a diagonal matrix equal to?",
      options: [{ id: "1", text: "Always 0 and 1" }, { id: "2", text: "The diagonal entries" }, { id: "3", text: "The sum of column items" }, { id: "4", text: "The matrix trace scalar product" }],
      correctAnswer: "2", topic: "Calculus & Linear Algebra", subject: "MATHEMATICS"
    },
    {
      text: "Which theorem relates line integrals around a closed curve to double integrals over a bounded surface region?",
      options: [{ id: "1", text: "Taylor's Theorem" }, { id: "2", text: "Green's Theorem" }, { id: "3", text: "Mean Value Theorem" }, { id: "4", text: "L'Hopital's Rule" }],
      correctAnswer: "2", topic: "Calculus & Linear Algebra", subject: "MATHEMATICS"
    },
    {
      text: "What is the integral of 1/x with respect to x?",
      options: [{ id: "1", text: "ln|x| + C" }, { id: "2", text: "x² + C" }, { id: "3", text: "-1/x² + C" }, { id: "4", text: "e^x + C" }],
      correctAnswer: "1", topic: "Calculus & Linear Algebra", subject: "MATHEMATICS"
    },
    {
      text: "What condition must two non-zero vectors fulfill to possess a dot product equal to 0?",
      options: [{ id: "1", text: "They must be parallel" }, { id: "2", text: "They must be orthogonal (90 degrees)" }, { id: "3", text: "They must possess identical lengths" }, { id: "4", text: "One must be an identity unit vector" }],
      correctAnswer: "2", topic: "Calculus & Linear Algebra", subject: "MATHEMATICS"
    },
    {
      text: "What is the rank of an invertible n x n matrix?",
      options: [{ id: "1", text: "0" }, { id: "2", text: "1" }, { id: "3", text: "n" }, { id: "4", text: "n - 1" }],
      correctAnswer: "3", topic: "Calculus & Linear Algebra", subject: "MATHEMATICS"
    },
    {
      text: "What does finding the derivative of a function at an exact point calculate geometrically?",
      options: [{ id: "1", text: "The area underneath the curve" }, { id: "2", text: "The slope of the tangent line" }, { id: "3", text: "The volume of a solid rotation" }, { id: "4", text: "The absolute coordinate length" }],
      correctAnswer: "2", topic: "Calculus & Linear Algebra", subject: "MATHEMATICS"
    },
    {
      text: "Which method utilizes matrix row operations to transform systems into row-echelon configurations?",
      options: [{ id: "1", text: "Newton's Approximation" }, { id: "2", text: "Gaussian Elimination" }, { id: "3", text: "Integration by Parts" }, { id: "4", text: "Vector Cross Multiplications" }],
      correctAnswer: "2", topic: "Calculus & Linear Algebra", subject: "MATHEMATICS"
    },

    // 📝 4. ENGLISH (Syntax, Grammar & Lexicon) - 10 Questions
    {
      text: "Identify the word containing an error in concord: 'The flock of birds are flying south.'",
      options: [{ id: "1", text: "flock" }, { id: "2", text: "birds" }, { id: "3", text: "are" }, { id: "4", text: "flying" }],
      correctAnswer: "3", topic: "Syntax, Grammar & Lexicon", subject: "ENGLISH"
    },
    {
      text: "Which of the following describes a word that is spelled the same but has different meanings?",
      options: [{ id: "1", text: "Homograph" }, { id: "2", text: "Homophone" }, { id: "3", text: "Synonym" }, { id: "4", text: "Antonym" }],
      correctAnswer: "1", topic: "Syntax, Grammar & Lexicon", subject: "ENGLISH"
    },
    {
      text: "What grammatical element acts as the primary connector inside a complex sentence configuration?",
      options: [{ id: "1", text: "Preposition" }, { id: "2", text: "Subordinating conjunction" }, { id: "3", text: "Interjection" }, { id: "4", text: "Abstract Noun" }],
      correctAnswer: "2", topic: "Syntax, Grammar & Lexicon", subject: "ENGLISH"
    },
    {
      text: "Choose the correct option to fill the gap: 'Neither the teacher nor the students ______ present.'",
      options: [{ id: "1", text: "was" }, { id: "2", text: "were" }, { id: "3", text: "is" }, { id: "4", text: "has been" }],
      correctAnswer: "2", topic: "Syntax, Grammar & Lexicon", subject: "ENGLISH"
    },
    {
      text: "What voice is represented in this statement: 'The code execution parameters were audited by Chidozie.'",
      options: [{ id: "1", text: "Active Voice" }, { id: "2", text: "Passive Voice" }, { id: "3", text: "Subjective Mood" }, { id: "4", text: "Imperative Mode" }],
      correctAnswer: "2", topic: "Syntax, Grammar & Lexicon", subject: "ENGLISH"
    },
    {
      text: "Which word means 'the study or internal structural layout rules of sentence construction metrics'?",
      options: [{ id: "1", text: "Phonology" }, { id: "2", text: "Semantics" }, { id: "3", text: "Syntax" }, { id: "4", text: "Etymology" }],
      correctAnswer: "3", topic: "Syntax, Grammar & Lexicon", subject: "ENGLISH"
    },
    {
      text: "Identify the part of speech of the underlined word: 'The engine compiled **exceptionally** fast.'",
      options: [{ id: "1", text: "Adjective" }, { id: "2", text: "Adverb" }, { id: "3", text: "Verb" }, { id: "4", text: "Preposition" }],
      correctAnswer: "2", topic: "Syntax, Grammar & Lexicon", subject: "ENGLISH"
    },
    {
      text: "What figure of speech does this phrase display: 'The compiler wept errors onto our console layout.'",
      options: [{ id: "1", text: "Metaphor" }, { id: "2", text: "Personification" }, { id: "3", text: "Hyperbole" }, { id: "4", text: "Simile" }],
      correctAnswer: "2", topic: "Syntax, Grammar & Lexicon", subject: "ENGLISH"
    },
    {
      text: "What lexical status matches words that are completely opposite in definition to one another?",
      options: [{ id: "1", text: "Synonyms" }, { id: "2", text: "Antonyms" }, { id: "3", text: "Acronyms" }, { id: "4", text: "Euphemisms" }],
      correctAnswer: "2", topic: "Syntax, Grammar & Lexicon", subject: "ENGLISH"
    },
    {
      text: "What punctuation item binds two closely associated independent clauses without coordinating conjunctions?",
      options: [{ id: "1", text: "Comma" }, { id: "2", text: "Semicolon" }, { id: "3", text: "Hyphen" }, { id: "4", text: "Apostrophe" }],
      correctAnswer: "2", topic: "Syntax, Grammar & Lexicon", subject: "ENGLISH"
    },

    // ⚛️ 5. PHYSICS (Mechanics & Wave Dynamics) - 10 Questions
    {
      text: "What is the value of the acceleration due to gravity on Earth's surface at sea level?",
      options: [{ id: "1", text: "9.81 m/s²" }, { id: "2", text: "3.14 m/s²" }, { id: "3", text: "10.5 m/s²" }, { id: "4", text: "0 m/s²" }],
      correctAnswer: "1", topic: "Mechanics & Wave Dynamics", subject: "PHYSICS"
    },
    {
      text: "Which particle acts as the primary quantum force-carrier for electromagnetic interactions?",
      options: [{ id: "1", text: "Gluon" }, { id: "2", text: "Photon" }, { id: "3", text: "Electron" }, { id: "4", text: "Neutrino" }],
      correctAnswer: "2", topic: "Mechanics & Wave Dynamics", subject: "PHYSICS" // Pointing to base module
    },
    {
      text: "What thermodynamic rule declares that the absolute entropy of pure crystal targets drops to 0 at absolute 0 Kelvin?",
      options: [{ id: "1", text: "First Law" }, { id: "2", text: "Second Law" }, { id: "3", text: "Third Law" }, { id: "4", text: "Zeroth Law" }],
      correctAnswer: "3", topic: "Mechanics & Wave Dynamics", subject: "PHYSICS"
    },
    {
      text: "Which property forces a physical item to resist positional changes in its current velocity state?",
      options: [{ id: "1", text: "Momentum" }, { id: "2", text: "Inertia" }, { id: "3", text: "Friction" }, { id: "4", text: "Torque" }],
      correctAnswer: "2", topic: "Mechanics & Wave Dynamics", subject: "PHYSICS"
    },
    {
      text: "What is the kinetic energy equation format for an item moving with constant mass and velocity?",
      options: [{ id: "1", text: "mgh" }, { id: "2", text: "mv" }, { id: "3", text: "0.5mv²" }, { id: "4", text: "F * d" }],
      correctAnswer: "3", topic: "Mechanics & Wave Dynamics", subject: "PHYSICS"
    },
    {
      text: "Which unit scales absolute electric potential variance metrics inside circuit tracks?",
      options: [{ id: "1", text: "Ampere" }, { id: "2", text: "Ohm" }, { id: "3", text: "Volt" }, { id: "4", text: "Watt" }],
      correctAnswer: "3", topic: "Mechanics & Wave Dynamics", subject: "PHYSICS"
    },
    {
      text: "What behavior pattern does light demonstrate when bending across dense edge mediums?",
      options: [{ id: "1", text: "Reflection" }, { id: "2", text: "Refraction" }, { id: "3", text: "Diffraction" }, { id: "4", text: "Polarization" }],
      correctAnswer: "2", topic: "Mechanics & Wave Dynamics", subject: "PHYSICS"
    },
    {
      text: "What total scalar results from multiplying an item's mass by its absolute velocity vectors?",
      options: [{ id: "1", text: "Kinetic Energy" }, { id: "2", text: "Linear Momentum" }, { id: "3", text: "Impulse" }, { id: "4", text: "Centripetal Acceleration" }],
      correctAnswer: "2", topic: "Mechanics & Wave Dynamics", subject: "PHYSICS"
    },
    {
      text: "What wave character frequency change matches tracking shifts caused by movement relative to observers?",
      options: [{ id: "1", text: "Snell's Law" }, { id: "2", text: "Doppler Effect" }, { id: "3", text: "Photoelectric Shift" }, { id: "4", text: "Compton Scattering" }],
      correctAnswer: "2", topic: "Mechanics & Wave Dynamics", subject: "PHYSICS"
    },
    {
      text: "Which fundamental universal field possesses the lowest scalar coupling metric across quantum bodies?",
      options: [{ id: "1", text: "Strong Nuclear Force" }, { id: "2", text: "Weak Nuclear Force" }, { id: "3", text: "Electromagnetic Interaction" }, { id: "4", text: "Gravitational Attraction" }],
      correctAnswer: "4", topic: "Mechanics & Wave Dynamics", subject: "PHYSICS"
    },

    // 🧪 6. CHEMISTRY (Organic & Analytical Chemistry) - 10 Questions
    {
      text: "What is the general molecular formula for terminal Alkanes?",
      options: [{ id: "1", text: "CnH2n" }, { id: "2", text: "CnH2n+2" }, { id: "3", text: "CnH2n-2" }, { id: "4", text: "CnHn" }],
      correctAnswer: "2", topic: "Organic & Analytical Chemistry", subject: "CHEMISTRY"
    },
    {
      text: "What molecular geometry profile characterizes central methane carbon atoms under sp3 validation states?",
      options: [{ id: "1", text: "Linear" }, { id: "2", text: "Trigonal Planar" }, { id: "3", text: "Tetrahedral" }, { id: "4", text: "Octahedral" }],
      correctAnswer: "3", topic: "Organic & Analytical Chemistry", subject: "CHEMISTRY"
    },
    {
      text: "Which functional group element features an explicit terminal carbon-to-oxygen double bond combined with a hydrogen hook?",
      options: [{ id: "1", text: "Ketone" }, { id: "2", text: "Alcohol" }, { id: "3", text: "Aldehyde" }, { id: "4", text: "Carboxylic Acid" }],
      correctAnswer: "3", topic: "Organic & Analytical Chemistry", subject: "CHEMISTRY"
    },
    {
      text: "What element represents Avogadro's constant metric count for particles inside one mole of sample mass?",
      options: [{ id: "1", text: "6.022 x 10^23" }, { id: "2", text: "3.141 x 10^21" }, { id: "3", text: "9.814 x 10^23" }, { id: "4", text: "1.602 x 10^-19" }],
      correctAnswer: "1", topic: "Organic & Analytical Chemistry", subject: "CHEMISTRY"
    },
    {
      text: "Which indicator molecule transforms into a vibrant pink state when reacting within basic alkaline bounds?",
      options: [{ id: "1", text: "Methyl Orange" }, { id: "2", text: "Phenolphthalein" }, { id: "3", text: "Litmus Extract" }, { id: "4", text: "Bromothymol Blue" }],
      correctAnswer: "2", topic: "Organic & Analytical Chemistry", subject: "CHEMISTRY"
    },
    {
      text: "What bond category drives molecular clustering across adjacent liquid water molecules?",
      options: [{ id: "1", text: "Ionic Bonding" }, { id: "2", text: "Covalent Sharing" }, { id: "3", text: "Hydrogen Bonding" }, { id: "4", text: "Metallic Electron Clouds" }],
      correctAnswer: "3", topic: "Organic & Analytical Chemistry", subject: "CHEMISTRY"
    },
    {
      text: "Which rule dictates that electrons occupy degenerate empty subshell slots before pairing up?",
      options: [{ id: "1", text: "Pauli Exclusion Principle" }, { id: "2", text: "Hund's Rule of Maximum Multiplicity" }, { id: "3", text: "Aufbau Construction Theorem" }, { id: "4", text: "Le Chatelier's Balance Shift" }],
      correctAnswer: "2", topic: "Organic & Analytical Chemistry", subject: "CHEMISTRY"
    },
    {
      text: "What pH metric bounds perfectly indicate a neutral aqueous chemical state solution at 25 degrees Celsius?",
      options: [{ id: "1", text: "pH = 0" }, { id: "2", text: "pH = 14" }, { id: "3", text: "pH = 7" }, { id: "4", text: "pH = 5.5" }],
      correctAnswer: "3", topic: "Organic & Analytical Chemistry", subject: "CHEMISTRY"
    },
    {
      text: "Which chemical operation matches an atomic node shedding electrons during matrix shifts?",
      options: [{ id: "1", text: "Reduction" }, { id: "2", text: "Oxidation" }, { id: "3", text: "Precipitation" }, { id: "4", text: "Hydrolysis" }],
      correctAnswer: "2", topic: "Organic & Analytical Chemistry", subject: "CHEMISTRY"
    },
    {
      text: "What crystalline ring configuration layout matches core aromatic organic structures like Benzene?",
      options: [{ id: "1", text: "Cyclohexane" }, { id: "2", text: "Resonance-stabilized hexagonal loop" }, { id: "3", text: "Branched alkane stream" }, { id: "4", text: "Triple-bonded alkyne track" }],
      correctAnswer: "2", topic: "Organic & Analytical Chemistry", subject: "CHEMISTRY"
    },

    // 🧬 7. BIOLOGY (Cellular Biology & Genetics) - 10 Questions
    {
      text: "Which intracellular organelle acts as the primary validation terminal for cellular respiration ATP synthesis?",
      options: [{ id: "1", text: "Ribosome" }, { id: "2", text: "Mitochondrion" }, { id: "3", text: "Golgi Apparatus" }, { id: "4", text: "Lysosome" }],
      correctAnswer: "2", topic: "Cellular Biology & Genetics", subject: "BIOLOGY"
    },
    {
      text: "What nucleotide base pairs directly with Adenine inside a standard double-stranded DNA configuration structure?",
      options: [{ id: "1", text: "Cytosine" }, { id: "2", text: "Guanine" }, { id: "3", text: "Thymine" }, { id: "4", text: "Uracil" }],
      correctAnswer: "3", topic: "Cellular Biology & Genetics", subject: "BIOLOGY"
    },
    {
      text: "Which processing step transforms a diploid somatic cell node into four unique haploid gametes?",
      options: [{ id: "1", text: "Mitosis" }, { id: "2", text: "Meiosis" }, { id: "3", text: "Binary Fission" }, { id: "4", text: "Cytokinesis" }],
      correctAnswer: "2", topic: "Cellular Biology & Genetics", subject: "BIOLOGY"
    },
    {
      text: "What unique macro-molecule compound encapsulates plant cell borders to provide mechanical rigidity?",
      options: [{ id: "1", text: "Chitin" }, { id: "2", text: "Glycogen" }, { id: "3", text: "Cellulose" }, { id: "4", text: "Peptidoglycan" }],
      correctAnswer: "3", topic: "Cellular Biology & Genetics", subject: "BIOLOGY"
    },
    {
      text: "Which blood vascular node type transports oxygen-rich streams away from core cardiac muscle chambers?",
      options: [{ id: "1", text: "Veins" }, { id: "2", text: "Arteries" }, { id: "3", text: "Capillaries" }, { id: "4", text: "Venules" }],
      correctAnswer: "2", topic: "Cellular Biology & Genetics", subject: "BIOLOGY"
    },
    {
      text: "What core catalytic protein classification accelerates metabolic reactions without getting consumed?",
      options: [{ id: "1", text: "Hormone" }, { id: "2", text: "Enzyme" }, { id: "3", text: "Antibody" }, { id: "4", text: "Vitamin" }],
      correctAnswer: "2", topic: "Cellular Biology & Genetics", subject: "BIOLOGY"
    },
    {
      text: "Which genetic condition tracks expressions where both allele properties map out visibly on phenotype layouts simultaneously?",
      options: [{ id: "1", text: "Incomplete Dominance" }, { id: "2", text: "Codominance" }, { id: "3", text: "Recessive Suppression" }, { id: "4", text: "Epistasis Mutations" }],
      correctAnswer: "2", topic: "Cellular Biology & Genetics", subject: "BIOLOGY"
    },
    {
      text: "What functional segment of a plant leaf cellular architecture regulates real-time transpiration and gas exchange operations?",
      options: [{ id: "1", text: "Xylem Vectors" }, { id: "2", text: "Stomata & Guard Cells" }, { id: "3", text: "Cuticle Tiers" }, { id: "4", text: "Phloem Channels" }],
      correctAnswer: "2", topic: "Cellular Biology & Genetics", subject: "BIOLOGY"
    },
    {
      text: "Which hormone asset drives systemic cell elongation and primary apical dominance vectors inside vegetation stems?",
      options: [{ id: "1", text: "Ethylene" }, { id: "2", text: "Gibberellin" }, { id: "3", text: "Auxin" }, { id: "4", text: "Abscisic Acid" }],
      correctAnswer: "3", topic: "Cellular Biology & Genetics", subject: "BIOLOGY"
    },
    {
      text: "What major classification system places standard multi-cellular segmenting animals possessing inner spinal cords into sets?",
      options: [{ id: "1", text: "Arthropoda" }, { id: "2", text: "Annelida" }, { id: "3", text: "Chordata" }, { id: "4", text: "Mollusca" }],
      correctAnswer: "3", topic: "Cellular Biology & Genetics", subject: "BIOLOGY"
    },

    // 🚜 8. AGRICULTURAL STUDIES (Crop Husbandry & Soil Science) - 10 Questions
    {
      text: "Which macronutrient profile deficiency typically induces severe leaf chlorosis along old plant tissues?",
      options: [{ id: "1", text: "Nitrogen" }, { id: "2", text: "Phosphorus" }, { id: "3", text: "Potassium" }, { id: "4", text: "Calcium" }],
      correctAnswer: "1", topic: "Crop Husbandry & Soil Science", subject: "AGRICULTURAL STUDIES"
    },
    {
      text: "What type of soil profile possesses the highest water-holding capacity matrix?",
      options: [{ id: "1", text: "Sandy Soil" }, { id: "2", text: "Silt Soil" }, { id: "3", text: "Clay Soil" }, { id: "4", text: "Loamy Soil" }],
      correctAnswer: "3", topic: "Crop Husbandry & Soil Science", subject: "AGRICULTURAL STUDIES"
    },
    {
      text: "Which system defines a rotation pipeline where distinct crop categories alternate across a common field plot sequentially?",
      options: [{ id: "1", text: "Monoculture" }, { id: "2", text: "Crop Rotation" }, { id: "3", text: "Shifting Cultivation" }, { id: "4", text: "Intercropping" }],
      correctAnswer: "2", topic: "Crop Husbandry & Soil Science", subject: "AGRICULTURAL STUDIES"
    },
    {
      text: "What is the primary commercial or nutritional output harvested from standard Leguminous crop fields?",
      options: [{ id: "1", text: "High-concentration lipid extracts" }, { id: "2", text: "Atmospheric nitrogen fixing & protein pulses" }, { id: "3", text: "Pure sucrose carbohydrate chains" }, { id: "4", text: "Fibrous textile raw inputs" }],
      correctAnswer: "2", topic: "Crop Husbandry & Soil Science", subject: "AGRICULTURAL STUDIES"
    },
    {
      text: "Which structural tool pattern leverages high-pressure targeted pipeline nozzles to emit moisture drops directly above soil surfaces?",
      options: [{ id: "1", text: "Drip Irrigation" }, { id: "2", text: "Sprinkler Irrigation" }, { id: "3", text: "Flood Surface Operations" }, { id: "4", text: "Canal Siphon Routing" }],
      correctAnswer: "2", topic: "Crop Husbandry & Soil Science", subject: "AGRICULTURAL STUDIES"
    },
    {
      text: "What biological cross-breeding technique aims to combine the premium characteristics of distinct breeds into superior offspring?",
      options: [{ id: "1", text: "Inbreeding" }, { id: "2", text: "Hybridization / Crossbreeding" }, { id: "3", text: "Linebreeding" }, { id: "4", text: "Clonal Propagation" }],
      correctAnswer: "2", topic: "Crop Husbandry & Soil Science", subject: "AGRICULTURAL STUDIES"
    },
    {
      text: "Which chemical compound is standardly spread across highly acidic farmland regions to elevate pH levels back into viable ranges?",
      options: [{ id: "1", text: "Ammonium Sulfate" }, { id: "2", text: "Calcium Carbonate (Agricultural Lime)" }, { id: "3", text: "Sodium Chloride" }, { id: "4", text: "Gypsum Crystals" }],
      correctAnswer: "2", topic: "Crop Husbandry & Soil Science", subject: "AGRICULTURAL STUDIES"
    },
    {
      text: "What severe environmental hazard describes high-velocity wind or rainfall sweeping away loose, unanchored topsoil layers?",
      options: [{ id: "1", text: "Salinization" }, { id: "2", text: "Soil Erosion" }, { id: "3", text: "Waterlogging" }, { id: "4", text: "Leaching Accumulation" }],
      correctAnswer: "2", topic: "Crop Husbandry & Soil Science", subject: "AGRICULTURAL STUDIES"
    },
    {
      text: "Which tracking mechanism describes standard corporate actions focused on removing toxic internal parasite populations inside livestock tracks?",
      options: [{ id: "1", text: "Pruning" }, { id: "2", text: "Deworming / Drenching" }, { id: "3", text: "Mulching Tiers" }, { id: "4", text: "Vaccine Inoculation" }],
      correctAnswer: "2", topic: "Crop Husbandry & Soil Science", subject: "AGRICULTURAL STUDIES"
    },
    {
      text: "What specific operational handling step detaches edible grains from their harvested protective outer structures?",
      options: [{ id: "1", text: "Winnowing" }, { id: "2", text: "Threshing" }, { id: "3", text: "Milling" }, { id: "4", text: "Silage Fermentation" }],
      correctAnswer: "2", topic: "Crop Husbandry & Soil Science", subject: "AGRICULTURAL STUDIES"
    }
  ];

  // Batch map parameters cleanly
  const creationPayloads = masterQuestions.map((q) => ({
    text: q.text,
    options: q.options,
    correctAnswer: q.correctAnswer,
    topicId: topics[q.topic]?.id || null,
    subjectId: subjects[q.subject]?.id || null
  }));

  // Fire high-speed batched transactions into PostgreSQL
  await prisma.question.createMany({ data: creationPayloads });

  console.log(`🏁 [Seed Success] Production-ready matrix deployed! 70 Questions fully instantiated.`);
}

main()
  .catch((e) => {
    console.error("🚨 [Seed Failure] Seeding sequence aborted:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });