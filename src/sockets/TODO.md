# 🎮 PvP Feature Roadmap - Nexus Learn

## 🚀 Immediate Fixes & Refactoring
- [x] **Multi-player Handshake:** Refactor `acknowledgeMatch.ts` to wait for all participants (not just index 0 and 1) before setting `ACTIVE` status.
- [x] **Scaling Strategy:** Refactor `submitAnswer.ts` and `handleRoundTimeout.ts` using a Strategy Pattern to handle mode-specific logic (Buzzer lockout vs. Team scoring) without massive switch blocks.
- [x] **Match Persistence:** Ensure the `BattleSession` and `BattlePlayer` Prisma models are correctly populated at the start and end of every match for telemetry.

## ⏱️ Mode: FLASH_CLASH (1v1 High-Speed Arena)
- [ ] **Dynamic Capacity:** Ensure `joinQueue.ts` correctly handles 2 players for this mode.
- [ ] **Velocity Rewards:** Fine-tune the server-side calculation for speed bonuses.

## 👑 Mode: BATTLE_ROYALE (4+ Player Arena)
- [ ] **ELO Distribution Logic:** Implement the "Winner Takes All" or "Shared ELO" logic for tied top scores in large matches.
- [ ] **Broadcast Optimization:** Implement debounced leaderboard updates for matches > 10 players to prevent socket broadcast storms.
- [ ] **Velocity Rewards:** Fine-tune the server-side calculation for speed bonuses.

## 🔔 Mode: BUZZER (First to Strike)
- [ ] **Buzzer Handshake:** Implement the `pvp:buzzAttempt` listener to handle server-side authoritative "First Buzz" detection.
- [ ] **Lockout Mechanism:** Implement the `lockoutStatus` flag in the RAM cache to penalize players for incorrect buzzer answers.
- [ ] **UI Synchronization:** Emit `pvp:buzzResult` so other players' screens can show who is currently answering.

## 🔄 Mode: PASS_THE_QUESTION (Turn-Based Challenge)
- [ ] **Turn Orchestration:** Implement a circular queue for players to manage who's turn it is.
- [ ] **Bonus Logic:** Implement the "Pass on Failure" mechanic where a failed question becomes a bonus for the next person in line.
- [ ] **Authoritative Timer:** Ensure the 15s window resets correctly for each "Pass" attempt.

## 🤝 Mode: COOP_2V2 (Team Tactics)
- [ ] **Team Allocation:** Ensure `matchReady.ts` correctly assigns `teamId` (TEAM_A / TEAM_B) to participants.
- [ ] **Aggregate Scoring:** Update round evaluation to show team totals alongside individual performance.
- [ ] **Shared XP:** Implement logic to award XP bonuses for team victory.

## 🏃 Mode: SPRINT
- [ ] **Definition:** Define core mechanics for the Sprint mode (Asynchronous vs. Synchronous).
- [ ] **Implementation:** Build the logic loop once requirements are finalized.

## 🛡️ Anti-Cheat & Reliability
- [ ] **Reconnect Logic:** Implement a "Grace Period" for players who disconnect during a match to rejoin their active `roomId`.
- [ ] **Answer Obfuscation:** Verify that `correctAnswer` is never sent to the client until the evaluation phase.
- [ ] **Forfeit Database Sync:** Ensure `saveMatchResults` correctly identifies the leaver and penalizes their ELO.

## 📊 Analytics & Progress
- [ ] **Global Leaderboard:** Build a background task to aggregate PvP performance into a "Top Students" league table.
- [ ] **PvP Activity Logs:** Ensure every battle round is logged in the `ActivityLog` for the AI Roadmap engine to analyze speed/accuracy gaps.

---
*Status Key:*
- ⬜ **To Do**
- 🚧 **In Progress**
- ✅ **Done**
```

### Key Considerations for your next steps:
1.  **Handshake Bug:** Your `acknowledgeMatch.ts` currently has a hardcoded check for two players:
   ```typescript
   if (game.players[playerSocketIds[0]].hasAcknowledged === true && 
       game.players[playerSocketIds[1]].hasAcknowledged === true) { ... }
   ```
   This needs to be updated to use `playerSocketIds.every(...)` to support your 4-player and 50-player modes.
2.  **State Management:** As you add more modes, the `activeMatches` Map entries will become complex. Make sure your `BattleMode` enum is always used to gate logic in `submitAnswer`.

<!--
[PROMPT_SUGGESTION]Fix the acknowledgeMatch.ts file to support more than 2 players using the every() method.[/PROMPT_SUGGESTION]
[PROMPT_SUGGESTION]Help me implement the server-side logic for the BUZZER mode lockout mechanism.[/PROMPT_SUGGESTION]
