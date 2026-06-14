import { Server, Socket } from "socket.io";
import type { PlayerProfile } from "../types.js";

// We need to access the exact same pvpQueue array array from your joinQueue file.
// To do this beautifully without import loops, we can pass it as a dependency 
// or export a cleanup helper function. Let's write the core extraction logic:

export default (io: Server, socket: Socket, pvpQueue: PlayerProfile[]) => {
  return (payload?: any) => {
    try {
      console.log(`🔍 [Queue Cancel Request] Socket ${socket.id} attempting to exit matchmaking line.`);

      // 1. Find the index of the player matching this socket instance
      const playerIndex = pvpQueue.findIndex((player) => player.socketId === socket.id);

      // 2. If the player is found in the waiting list, strip them out
      if (playerIndex !== -1) {
        const removedPlayer = pvpQueue.splice(playerIndex, 1)[0] as any;
        console.log(`🧹 [Queue Cleaned] ${removedPlayer.name} removed from line. Remaining: ${pvpQueue.length}`);
        
        // 3. Notify this specific client that they are safely out
        socket.emit("pvp:cancelQueueSuccess", {
          message: "You have left the matchmaking pool."
        });
      } else {
        console.log(`ℹ️ [Queue Cleaned] Socket ${socket.id} requested cancel, but wasn't in active queue line.`);
      }

    } catch (error) {
      console.error(`❌ [Cancel Queue Error] Failed to remove socket ${socket.id} from queue:`, error);
    }
  };
};