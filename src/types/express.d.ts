import type { Enrollment } from "@prisma/client/client.ts";
import { User } from "../../generated/prisma/client.ts";

declare global {
    namespace Express {
        interface Request {
            user?: Omit<User, "password">,
            chatMembership?: any,
            enrollment?: Enrollment
        }
    }
}