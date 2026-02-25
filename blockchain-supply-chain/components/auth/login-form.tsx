"use client"

import type React from "react"

import { useState } from "react"
import { AuthManager, type User } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogIn, Loader2, UserPlus, Eye, EyeOff } from "lucide-react"

interface AuthFormProps {
  onLogin: (user: User) => void
}

export function LoginForm({ onLogin }: AuthFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  
  // Signup states
  const [signupName, setSignupName] = useState("")
  const [signupEmail, setSignupEmail] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("")
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false)
  const [signupRole, setSignupRole] = useState("")
  const [signupPhone, setSignupPhone] = useState("")
  const [signupAddress, setSignupAddress] = useState("")
  const [isSignupLoading, setIsSignupLoading] = useState(false)
  const [signupError, setSignupError] = useState("")
  // Forgot password dialog state
  const [fpOpen, setFpOpen] = useState(false)
  const [fpStep, setFpStep] = useState<1 | 2>(1)
  const [fpEmail, setFpEmail] = useState("")
  const [fpCode, setFpCode] = useState("")
  const [fpNew, setFpNew] = useState("")
  const [fpConfirm, setFpConfirm] = useState("")
  const [fpMsg, setFpMsg] = useState("")
  const [fpErr, setFpErr] = useState("")
  const [fpLoading, setFpLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const { user } = await AuthManager.login(email, password)
      onLogin(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignupError("")
    
    if (signupPassword !== signupConfirmPassword) {
      setSignupError("Passwords do not match")
      return
    }
    
    if (!signupRole) {
      setSignupError("Please select a role")
      return
    }
    
    setIsSignupLoading(true)

    try {
      const { user } = await AuthManager.register({
        email: signupEmail,
        password: signupPassword,
        name: signupName,
        role: signupRole as User["role"],
        phone: signupPhone || undefined,
        address: signupAddress || undefined,
      })
      onLogin(user)
    } catch (err) {
      setSignupError(err instanceof Error ? err.message : "Signup failed")
    } finally {
      setIsSignupLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Login Form</CardTitle>
        <CardDescription>Welcome back! Please login to your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="signup" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Signup</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => { setFpOpen(true); setFpEmail(email); setFpStep(1); setFpMsg(""); setFpErr(""); setFpCode(""); setFpNew(""); setFpConfirm("") }}
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </form>
            
            <div className="text-center text-sm text-muted-foreground">
              Not a member? <button type="button" className="text-primary hover:underline" onClick={() => {
                const signupTab = document.querySelector('[data-value="signup"]') as HTMLButtonElement
                signupTab?.click()
              }}>Signup now</button>
            </div>
          </TabsContent>
          
          <TabsContent value="signup" className="space-y-4">
            <form onSubmit={handleSignup} className="space-y-4">
              {signupError && (
                <Alert variant="destructive">
                  <AlertDescription>{signupError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="signup-name">Full Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email Address</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showSignupPassword ? "text" : "password"}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Create a password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                  >
                    {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-confirm">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="signup-confirm"
                    type={showSignupConfirmPassword ? "text" : "password"}
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                  >
                    {showSignupConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-role">Role</Label>
                <select
                  id="signup-role"
                  value={signupRole}
                  onChange={(e) => setSignupRole(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="">Select your role</option>
                  <option value="farmer">Farmer</option>
                  <option value="distributor">Distributor</option>
                  <option value="retailer">Retailer</option>
                  <option value="consumer">Consumer</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-phone">Phone (Optional)</Label>
                <Input
                  id="signup-phone"
                  type="tel"
                  value={signupPhone}
                  onChange={(e) => setSignupPhone(e.target.value)}
                  placeholder="Phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-address">Address (Optional)</Label>
                <Input
                  id="signup-address"
                  type="text"
                  value={signupAddress}
                  onChange={(e) => setSignupAddress(e.target.value)}
                  placeholder="Your address"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSignupLoading}>
                {isSignupLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
            
            <div className="text-center text-sm text-muted-foreground">
              Already have an account? <button type="button" className="text-primary hover:underline" onClick={() => {
                const loginTab = document.querySelector('[data-value="login"]') as HTMLButtonElement
                loginTab?.click()
              }}>Login now</button>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={fpOpen} onOpenChange={setFpOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
            </DialogHeader>
            {fpStep === 1 ? (
              <div className="space-y-3">
                {fpErr && (
                  <Alert variant="destructive"><AlertDescription>{fpErr}</AlertDescription></Alert>
                )}
                {fpMsg && (
                  <Alert variant="default"><AlertDescription>{fpMsg}</AlertDescription></Alert>
                )}
                <div>
                  <Label htmlFor="fp_email">Email</Label>
                  <Input id="fp_email" type="email" value={fpEmail} onChange={(e) => setFpEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setFpOpen(false)}>Close</Button>
                  <Button disabled={fpLoading || !fpEmail} onClick={async () => {
                    try {
                      setFpLoading(true)
                      setFpErr("")
                      const res = await AuthManager.requestPasswordReset(fpEmail.trim())
                      // For demo, we show the code so you can test without email provider
                      setFpMsg(res.code ? `Demo code: ${res.code}. It expires in 10 minutes.` : res.message)
                      setFpStep(2)
                    } catch (e) {
                      setFpErr("Failed to request reset. Try again.")
                    } finally {
                      setFpLoading(false)
                    }
                  }}>{fpLoading ? "Sending..." : "Send Code"}</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {fpErr && (
                  <Alert variant="destructive"><AlertDescription>{fpErr}</AlertDescription></Alert>
                )}
                {fpMsg && (
                  <Alert variant="default"><AlertDescription>{fpMsg}</AlertDescription></Alert>
                )}
                <div>
                  <Label htmlFor="fp_code">Enter 4-digit code</Label>
                  <Input id="fp_code" inputMode="numeric" maxLength={4} value={fpCode} onChange={(e) => setFpCode(e.target.value.replace(/\D/g, "").slice(0,4))} placeholder="1234" />
                </div>
                <div>
                  <Label htmlFor="fp_new">New Password</Label>
                  <Input id="fp_new" type="password" value={fpNew} onChange={(e) => setFpNew(e.target.value)} placeholder="Enter new password" />
                </div>
                <div>
                  <Label htmlFor="fp_confirm">Confirm New Password</Label>
                  <Input id="fp_confirm" type="password" value={fpConfirm} onChange={(e) => setFpConfirm(e.target.value)} placeholder="Re-enter new password" />
                </div>
                <div className="flex justify-between gap-2">
                  <Button variant="ghost" onClick={() => { setFpStep(1); setFpMsg(""); setFpErr("") }}>Back</Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setFpOpen(false)}>Close</Button>
                    <Button disabled={fpLoading || fpCode.length !== 4 || !fpNew || fpNew !== fpConfirm} onClick={async () => {
                      if (fpNew !== fpConfirm) { setFpErr("Passwords do not match"); return }
                      try {
                        setFpLoading(true)
                        setFpErr("")
                        const res = await AuthManager.verifyPasswordReset(fpEmail.trim(), fpCode.trim(), fpNew)
                        if (res.ok) {
                          setFpMsg("Password reset successfully. You can now log in with your new password.")
                          // Optionally auto-close after short delay
                          setTimeout(() => setFpOpen(false), 1500)
                        } else {
                          setFpErr(res.message)
                        }
                      } catch (e) {
                        setFpErr("Failed to reset password. Try again.")
                      } finally {
                        setFpLoading(false)
                      }
                    }}>{fpLoading ? "Saving..." : "Reset Password"}</Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div className="mt-4 text-sm text-muted-foreground">
          <p className="font-medium mb-2">Demo Accounts:</p>
          <div className="space-y-1 text-xs">
            <p>Admin: admin@gmail.com / admin@1234</p>
            <p>Farmer: farmer@demo.com / password</p>
            <p>Distributor: distributor@demo.com / password</p>
            <p>Retailer: retailer@demo.com / password</p>
            <p>Consumer: consumer@demo.com / password</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
