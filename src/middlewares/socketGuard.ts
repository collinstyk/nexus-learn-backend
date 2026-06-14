import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import "dotenv/config";

interface DecodedToken {
  id: string;
  name?: string;
  email?: string;
}

export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void) => {
  try {
    // 1. Extract the token from multiple possible perimeters (Headers or Query parameters)
    const authHeader = socket.handshake.headers.authorization;
    let token = socket.handshake.query.token as string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // 2. Reject immediately if no credentials are supplied
    if (!token) {
        console.log(token);
        
      console.error(`🔒 [Security Refusal] Socket ${socket.id} blocked: No token provided.`);
      return next(new Error("Authentication failed: Token missing."));
    }

    // 3. Verify the signature against your environment JWT secret key
    const secret = process.env.JWT_SECRET || "super-secret-key";
    const decoded = jwt.verify(token, secret) as DecodedToken;

    // 4. Anchor the authenticated credentials straight onto the socket context surface
    socket.userId = decoded.id;
    socket.name = decoded.name || "Anonymous Student";

    console.log(`🔒 [Security Cleared] Socket ${socket.id} mapped to User: ${socket.name} (${socket.userId})`);
    
    // Pass the handshake to the next initialization stage
    next();
  } catch (error) {
    console.error(`❌ [Security Refusal] Socket ${socket.id} blocked: Invalid or expired token.`, error);
    return next(new Error("Authentication failed: Invalid token."));
  }
};