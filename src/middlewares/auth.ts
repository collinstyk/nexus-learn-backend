import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

interface JwtPayload {
  id: string
  name: string // 🎯 Grab name from the token payload to feed our socket profile states too!
  iat?: number
  exp?: number
}

// 🎯 Realignment: Match the runtime Request properties used by your platform controllers
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        name: string
      }
      courseEnrollment?: any // Keeps our course guards compiling cleanly!
    }
  }
}

export const protect = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'fail', message: 'Not authorized, token missing' })
  }

  const token = authHeader.split(' ')[1]

  if (!process.env.JWT_SECRET) {
    console.log(process.env);
    return res.status(500).json({ status: 'error', message: 'JWT secret not configured on host environment' })
  }

  try {
    const decoded = jwt.verify(token as string, process.env.JWT_SECRET) as JwtPayload
    
    req.user = {
      id: decoded.id,
      name: decoded.name
    }
    
    next()
  } catch (error) {
    return res.status(401).json({ status: 'fail', message: 'Not authorized, token invalid or expired' })
  }
}