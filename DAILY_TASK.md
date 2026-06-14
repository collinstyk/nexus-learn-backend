## 🛠️ Phase 1: P2P Communication & Collaboration (Days 1–4)

*Objective: Build the instant messaging system, direct message channels, and collaborative student study pods.*

* **Day 1: Chat Room Provisioning & Permissions**
* Set up REST/GraphQL endpoints to handle the explicit creation of `ChatRoom` instances.
* Write the relational controllers to handle inserting membership records into the `ChatParticipant` join table, ensuring students can only view or post to channels they are authorized to access.


* **Day 2: WebSocket Instant Message Transport**
* Create the `chat:sendMessage` socket event handler inside your real-time network layer.
* Ensure that when a player shoots a text message across a channel, the server instantly targets the channel via `socket.to(chatRoomId).emit("chat:newMessage")`.


* **Day 3: Database Buffering & Persistence**
* Connect your message socket receiver directly to Prisma.
* As messages flow through RAM, buffer them down into cold storage using `prisma.message.create` so chat history is never lost when a student refreshes their screen.


* **Day 4: Pagination & Catch-up History API**
* Build optimized, paginated database queries (`prisma.message.findMany` with `take: 50` ordered by `createdAt: desc`) to feed past conversation streams to the UI when a user enters a room.
* Implement basic unread message tracking logic using the `isRead` boolean flag.



---

## 📚 Phase 2: Digital Library & Forums (Days 5–8)

*Objective: Build the core academic knowledge base, recursive discussion forums, and content access boundaries.*

* **Day 5: Library Content Architecture & Search Filters**
* Build out standard full-text search API endpoints across your `Course` and `Resource` tables.
* Allow the student frontend to query materials based on text searches or filtered `Subject` tags.


* **Day 6: Course Enrollment & Authorization Guards**
* Create your `Enrollment` database ledger records.
* Write an authoritative backend validation middleware that blocks a student's network request to stream video links or view course PDFs unless they have a verified, active relationship row inside the enrollment table for that course. (not done)


* **Day 7: Reddit/Quora-Style Forum Infrastructure**
* Build out core controllers for `createPost` and `likePost`.
* Enforce a strict, database-level composite primary key constraint on your `PostLike` table to completely block vote-duplication or leaderboard manipulation exploits.


* **Day 8: Recursive Nested Comments Engine**
* Write the data handling logic to support infinite multi-level nested discussion threads.
* Utilize Prisma's self-referencing relationship mapping (`parentId` pointing to parent `Comment.id`) to cleanly output structured recursive JSON trees to the client interface.

---

## 📊 Phase 3: Analytics, Gamification & AI Telemetry (Days 9–11)

*Objective: Gather activity footprints from across your system to power the student dashboard and fuel the AI engines.*

* **Day 9: The Global Activity Log Ledger**
* Write an automated global interceptor hook. Every single time a user chats, reads a library resource, or submits a forum post, write a background entry row into your centralized `ActivityLog` table tracking the activity type and duration.


* **Day 10: Performance Aggregation & Streaks**
* Write aggregated pipeline queries using Prisma's `groupBy` tools to format a student's raw activity history logs into date-stamped arrays, ready to feed high-fidelity visual charts on their dashboard.
* Set up your daily cron-job function script to calculate and update active `Streak` count values.


* **Day 11: AI Roadmap & Tutor Mock Models**
* To keep your delivery timeline safe from API delays or token costs, build a reliable background service worker that reads a student's logged weak areas and outputs pre-structured JSON arrays directly into the `LearningRoadmap` schema.
* Create a simulated chat endpoint for the AI tutor that streams responses with a realistic typing delay.



---

## 🎮 Phase 4: Real-Time PvP Matchmaking Engine (Days 12–15)

*Objective: Drop in your modular gameplay loop, connecting it smoothly to your established database layers.*

* **Day 12: Queue Orchestration & Random Question Queries**
* Implement your array-splicing `joinQueue` and `cancelQueue` logic.
* Connect the matchmaking trigger to run live, randomized queries against your `Question` table using `prisma.question.findMany` to pull exactly 5 rows matching the selected subject.


* **Day 13: Authoritative Delivery & Timing Engine**
* Wire up `executeNextQuestionDelivery.ts` to push question blocks to the room.
* Set up your server-side background `setTimeout` clock loops to enforce the 15-second response window while keeping the `correctAnswer` strings safely hidden on the server.


* **Day 14: Submission, Speed Velocity Bonuses & Psychological Pressure**
* Integrate your higher-order function `submitAnswer.ts` logic.
* Connect the speed calculation deltas (`Date.now() - game.questionStartTime`) to award tiered velocity points alongside your `"First to Strike"` flag checks and the targeted opponent pressure broadcast signal.


* **Day 15: Forfeit Safety Nets & Permanent Database Sync**
* Complete your `leaveRoom.ts` listener to gracefully handle network drops or rage-quits.
* Integrate your custom **`saveMatchResults` service worker** using the atomic Prisma `$transaction` pipeline to log the `Match` data, reward the winner's profile XP, and scrub the active room cache completely out of the server's RAM.

---

## 🔐 Phase 5: Authentication, Authorization & Production Seeding (Days 16–17)

*Objective: Harden the system gates, transition from mock entries to live production tokens, and stress test the platform.*

* **Day 16: JWT Validation & Socket Handshake Security Middleware**
* Swap out your development dummy variables with an authentic JWT/HTTP-only cookie parser layer.
* Inject this verification check directly into your Socket.io initialization handshake block. Intercept connections, verify the signature, extract the database payload, and securely map it directly to `socket.userId` while rejecting anonymous intruders.


* **Day 17: Multi-Module Database Seeding & Code Freeze**
* Build out a comprehensive database seeder file (`seed.ts`) containing dozens of test questions, multiple structural course chapters, sample forum entries, and active league groups.
* Execute `npx prisma db seed`, run edge-case connectivity validation tests with your frontend student developer, clean up your system logging statements, and freeze the backend code for launch.

---

## 🏗️ Phase 6: CMS Maturity & Content Security (Days 18–20)

*Objective: Refine the content lifecycle for tutors, enforce strict access boundaries, and implement modular syllabus orchestration.*

* **Day 18: Tutor CMS - Editing & Pruning Logic**
* Implement the `updateCourse` and `deleteCourse` endpoints for verified Tutors.
* Introduce "Pruning Logic" by adding an `isPublished` or `status` flag to the `Course` model, allowing tutors to archive content or keep drafts hidden from the library search index.

* **Day 19: Resource Access Guards & Enrollment Verification**
* Finalize the Day 6 objective: Implement an authoritative `ResourceAccessGuard` middleware.
* Write the logic to block direct URL access to `fileUrl` (videos/PDFs) unless the student has an active `Enrollment` record for the parent course or the resource is flagged as `isFreePreview`.

* **Day 20: Modular Orchestration & Versioning**
* Enhance the `Module` layer to support dynamic chapter re-ordering.
* Refactor the `getCourseSyllabus` logic to ensure resources are correctly nested within their respective modules, allowing students to navigate through structured academic versions/chapters.
