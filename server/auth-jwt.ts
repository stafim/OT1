import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { users, type User, type UserRole } from "@shared/models/auth";
import { drivers } from "@shared/schema";
import { eq, and, or } from "drizzle-orm";
import { z } from "zod";

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "default-access-secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "default-refresh-secret";

export interface JwtPayload {
  userId: string;
  username: string;
  role: UserRole;
  tokenVersion?: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

const registerSchema = z.object({
  username: z.string().min(3, "Username deve ter pelo menos 3 caracteres").max(100),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  email: z.string().email("Email inválido").optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["admin", "operador", "visualizador", "motorista", "portaria"]).optional(),
});

const loginSchema = z.object({
  username: z.string().min(1, "Username é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function isAuthenticatedJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyAccessToken(token);

  if (!payload) {
    return res.status(401).json({ message: "Token inválido ou expirado" });
  }

  db.select().from(users).where(eq(users.id, payload.userId)).limit(1)
    .then(([user]) => {
      if (!user || user.isActive !== "true") {
        return res.status(401).json({ message: "Usuário não encontrado ou inativo" });
      }
      req.user = user;
      next();
    })
    .catch(() => {
      return res.status(500).json({ message: "Erro ao verificar autenticação" });
    });
}

async function findDriverTypeForUser(user: User): Promise<string | null> {
  const conditions = [];
  if (user.username) conditions.push(eq(drivers.name, user.username));
  if (user.email) conditions.push(eq(drivers.email, user.email));

  if (conditions.length === 0) return null;

  const [driver] = await db.select({ driverType: drivers.driverType })
    .from(drivers)
    .where(conditions.length === 1 ? conditions[0] : or(...conditions))
    .limit(1);

  return driver?.driverType || null;
}

export function registerJWTAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const data = registerSchema.parse(req.body);
      
      const existingUser = await db.select().from(users)
        .where(eq(users.username, data.username.toLowerCase()))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Username já está em uso" });
      }

      if (data.email) {
        const existingEmail = await db.select().from(users)
          .where(eq(users.email, data.email))
          .limit(1);
        if (existingEmail.length > 0) {
          return res.status(400).json({ message: "Email já está em uso" });
        }
      }

      const passwordHash = await hashPassword(data.password);

      const [newUser] = await db.insert(users).values({
        username: data.username.toLowerCase(),
        passwordHash,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || "visualizador",
        isActive: "true",
      }).returning();

      const { passwordHash: _, ...userWithoutPassword } = newUser;
      res.status(201).json({ 
        message: "Usuário criado com sucesso",
        user: userWithoutPassword 
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Erro ao criar usuário" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const data = loginSchema.parse(req.body);
      
      const [user] = await db.select().from(users)
        .where(eq(users.username, data.username.toLowerCase()))
        .limit(1);

      if (!user) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      if (user.isActive !== "true") {
        return res.status(401).json({ message: "Usuário inativo" });
      }

      if (!user.passwordHash) {
        return res.status(401).json({ message: "Usuário sem senha configurada" });
      }

      const isValidPassword = await verifyPassword(data.password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      await db.update(users)
        .set({ lastLogin: new Date() })
        .where(eq(users.id, user.id));

      const payload: JwtPayload = {
        userId: user.id,
        username: user.username!,
        role: user.role as UserRole,
        tokenVersion: user.refreshTokenVersion || undefined,
      };

      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      const { passwordHash: _, ...userWithoutPassword } = user;

      res.json({
        message: "Login realizado com sucesso",
        accessToken,
        refreshToken,
        user: userWithoutPassword,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error logging in:", error);
      res.status(500).json({ message: "Erro ao realizar login" });
    }
  });

  app.post("/api/auth/refresh", async (req: Request, res: Response) => {
    try {
      const refreshSchema = z.object({
        refreshToken: z.string().min(1, "Refresh token é obrigatório"),
      });
      
      const data = refreshSchema.parse(req.body);
      const payload = verifyRefreshToken(data.refreshToken);
      
      if (!payload) {
        return res.status(401).json({ message: "Refresh token inválido ou expirado" });
      }

      const [user] = await db.select().from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!user) {
        return res.status(401).json({ message: "Usuário não encontrado" });
      }

      if (user.isActive !== "true") {
        return res.status(401).json({ message: "Usuário inativo" });
      }

      if (user.refreshTokenVersion) {
        const storedVersion = new Date(user.refreshTokenVersion).getTime();
        const tokenVersion = payload.tokenVersion ? new Date(payload.tokenVersion).getTime() : 0;
        if (tokenVersion < storedVersion) {
          return res.status(401).json({ message: "Token revogado. Faça login novamente." });
        }
      }

      const newTokenVersion = new Date();
      await db.update(users)
        .set({ refreshTokenVersion: newTokenVersion })
        .where(eq(users.id, user.id));

      const newPayload: JwtPayload = {
        userId: user.id,
        username: user.username!,
        role: user.role as UserRole,
        tokenVersion: newTokenVersion,
      };

      const newAccessToken = generateAccessToken(newPayload);
      const newRefreshToken = generateRefreshToken(newPayload);

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error refreshing token:", error);
      res.status(500).json({ message: "Erro ao renovar token" });
    }
  });

  app.post("/api/auth/logout", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        const payload = verifyAccessToken(token);
        
        if (payload) {
          await db.update(users)
            .set({ refreshTokenVersion: new Date() })
            .where(eq(users.id, payload.userId));
        }
      }

      res.json({ message: "Logout realizado com sucesso" });
    } catch (error) {
      console.error("Error logging out:", error);
      res.status(500).json({ message: "Erro ao realizar logout" });
    }
  });

  app.get("/api/auth/me", isAuthenticatedJWT, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    const { passwordHash: _, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  app.post("/api/external/auth/token", async (req: Request, res: Response) => {
    try {
      const externalAuthSchema = z.object({
        username: z.string().min(1, "Username é obrigatório"),
        password: z.string().min(1, "Senha é obrigatória"),
      });

      const data = externalAuthSchema.parse(req.body);

      const [user] = await db.select().from(users)
        .where(eq(users.username, data.username.toLowerCase()))
        .limit(1);

      if (!user) {
        return res.status(401).json({ error: "invalid_credentials", message: "Credenciais inválidas" });
      }

      if (user.isActive !== "true") {
        return res.status(403).json({ error: "user_inactive", message: "Usuário inativo" });
      }

      if (!user.passwordHash) {
        return res.status(401).json({ error: "no_password", message: "Usuário sem senha configurada" });
      }

      const isValidPassword = await verifyPassword(data.password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: "invalid_credentials", message: "Credenciais inválidas" });
      }

      await db.update(users)
        .set({ lastLogin: new Date() })
        .where(eq(users.id, user.id));

      const payload: JwtPayload = {
        userId: user.id,
        username: user.username!,
        role: user.role as UserRole,
        tokenVersion: user.refreshTokenVersion || undefined,
      };

      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      const driverType = await findDriverTypeForUser(user);

      res.json({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: "Bearer",
        expires_in: 900,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          driverType,
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "validation_error", message: error.errors[0].message });
      }
      console.error("Error in external auth:", error);
      res.status(500).json({ error: "server_error", message: "Erro interno do servidor" });
    }
  });

  app.post("/api/external/auth/refresh", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        refresh_token: z.string().min(1, "Refresh token é obrigatório"),
      });

      const data = schema.parse(req.body);
      const payload = verifyRefreshToken(data.refresh_token);

      if (!payload) {
        return res.status(401).json({ error: "invalid_token", message: "Refresh token inválido ou expirado" });
      }

      const [user] = await db.select().from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!user || user.isActive !== "true") {
        return res.status(401).json({ error: "user_invalid", message: "Usuário não encontrado ou inativo" });
      }

      if (user.refreshTokenVersion) {
        const storedVersion = new Date(user.refreshTokenVersion).getTime();
        const tokenVersion = payload.tokenVersion ? new Date(payload.tokenVersion).getTime() : 0;
        if (tokenVersion < storedVersion) {
          return res.status(401).json({ error: "token_revoked", message: "Token revogado" });
        }
      }

      const newTokenVersion = new Date();
      await db.update(users)
        .set({ refreshTokenVersion: newTokenVersion })
        .where(eq(users.id, user.id));

      const newPayload: JwtPayload = {
        userId: user.id,
        username: user.username!,
        role: user.role as UserRole,
        tokenVersion: newTokenVersion,
      };

      res.json({
        access_token: generateAccessToken(newPayload),
        refresh_token: generateRefreshToken(newPayload),
        token_type: "Bearer",
        expires_in: 900,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "validation_error", message: error.errors[0].message });
      }
      console.error("Error refreshing external token:", error);
      res.status(500).json({ error: "server_error", message: "Erro interno do servidor" });
    }
  });

  app.get("/api/external/auth/validate", isAuthenticatedJWT, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ valid: false, error: "invalid_token" });
    }

    const driverType = await findDriverTypeForUser(req.user);

    res.json({
      valid: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        driverType,
      },
    });
  });
}
