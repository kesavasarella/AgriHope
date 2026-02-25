// Authentication utilities and session management
import { db, type User } from "./database"
export type { User } from "./database"

export interface AuthSession {
  user: User
  token: string
  expiresAt: number
}

export class AuthManager {
  private static readonly SESSION_KEY = "auth_session"
  private static readonly TOKEN_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours
  private static readonly RESET_STORE_KEY = "password_resets"

  // Generate a simple JWT-like token (for demo purposes)
  private static generateToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      exp: Date.now() + this.TOKEN_EXPIRY,
    }

    // In real app, this would be a proper JWT with secret signing
    return btoa(JSON.stringify(payload))
  }

  // Hash password (simplified for demo)
  private static hashPassword(password: string): string {
    // In real app, use bcrypt or similar
    let hash = 0
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16)
  }

  // Register a new user
  static async register(userData: {
    email: string
    password: string
    name: string
    role: User["role"]
    phone?: string
    address?: string
    farm_id?: string
    license_number?: string
  }): Promise<{ user: User; token: string }> {
    // Check if user already exists
    const existingUser = await db.getUserByEmail(userData.email)
    if (existingUser) {
      throw new Error("User already exists with this email")
    }

    // Create new user
    const user = await db.createUser({
      email: userData.email,
      password_hash: this.hashPassword(userData.password),
      name: userData.name,
      role: userData.role,
      phone: userData.phone,
      address: userData.address,
      farm_id: userData.farm_id,
      license_number: userData.license_number,
    })

    const token = this.generateToken(user)

    // Store session
    const session: AuthSession = {
      user,
      token,
      expiresAt: Date.now() + this.TOKEN_EXPIRY,
    }

    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session))

    return { user, token }
  }

  // Login user
  static async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = await db.getUserByEmail(email)
    if (!user) {
      throw new Error("Invalid email or password")
    }

    const hashedPassword = this.hashPassword(password)
    if (user.password_hash !== hashedPassword) {
      throw new Error("Invalid email or password")
    }

    const token = this.generateToken(user)

    // Store session
    const session: AuthSession = {
      user,
      token,
      expiresAt: Date.now() + this.TOKEN_EXPIRY,
    }

    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session))

    return { user, token }
  }

  // Get current session
  static getCurrentSession(): AuthSession | null {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY)
      if (!sessionData) return null

      const session: AuthSession = JSON.parse(sessionData)

      // Check if session is expired
      if (Date.now() > session.expiresAt) {
        this.logout()
        return null
      }

      return session
    } catch {
      return null
    }
  }

  // Get current user
  static getCurrentUser(): User | null {
    const session = this.getCurrentSession()
    return session?.user || null
  }

  // Check if user has specific role
  static hasRole(role: User["role"]): boolean {
    const user = this.getCurrentUser()
    return user?.role === role
  }

  // Check if user has any of the specified roles
  static hasAnyRole(roles: User["role"][]): boolean {
    const user = this.getCurrentUser()
    return user ? roles.includes(user.role) : false
  }

  // Logout user
  static logout(): void {
    localStorage.removeItem(this.SESSION_KEY)
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    return this.getCurrentSession() !== null
  }

  // Update the user stored in the current session (e.g., after profile edits)
  static updateSessionUser(updatedUser: User): void {
    const session = this.getCurrentSession()
    if (!session) return
    const newSession: AuthSession = {
      ...session,
      user: updatedUser,
    }
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(newSession))
  }

  // ===== Password Reset (Demo) =====
  private static generate4DigitCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString()
  }

  private static loadResetStore(): Record<string, { code: string; expiresAt: number }> {
    try {
      return JSON.parse(localStorage.getItem(this.RESET_STORE_KEY) || "{}")
    } catch {
      return {}
    }
  }

  private static saveResetStore(store: Record<string, { code: string; expiresAt: number }>) {
    localStorage.setItem(this.RESET_STORE_KEY, JSON.stringify(store))
  }

  // Step 1: request a password reset. Returns the code for demo purposes.
  static async requestPasswordReset(email: string): Promise<{ sent: boolean; code?: string; message: string }> {
    const user = await db.getUserByEmail(email)
    if (!user) {
      // Do not leak existence in real apps; here we return generic message
      return { sent: true, message: "If an account exists, a code has been sent." }
    }
    const code = this.generate4DigitCode()
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes
    const store = this.loadResetStore()
    store[email] = { code, expiresAt }
    this.saveResetStore(store)
    // In a real app, send code via email provider. For demo, return it so UI can display.
    console.log(`[Auth] Password reset code for ${email}: ${code}`)
    return { sent: true, code, message: "Reset code generated (demo)." }
  }

  // Step 2: verify code and set new password
  static async verifyPasswordReset(email: string, code: string, newPassword: string): Promise<{ ok: boolean; message: string }> {
    const store = this.loadResetStore()
    const entry = store[email]
    if (!entry) return { ok: false, message: "Invalid or expired code" }
    if (Date.now() > entry.expiresAt) {
      delete store[email]
      this.saveResetStore(store)
      return { ok: false, message: "Code expired" }
    }
    if (entry.code !== code.trim()) {
      return { ok: false, message: "Incorrect code" }
    }
    const user = await db.getUserByEmail(email)
    if (!user) return { ok: false, message: "Account not found" }
    // Update password
    const updated = { ...user, password_hash: this.hashPassword(newPassword) }
    await db.updateUser(updated)
    // Clear used token
    delete store[email]
    this.saveResetStore(store)
    return { ok: true, message: "Password has been reset" }
  }
}
