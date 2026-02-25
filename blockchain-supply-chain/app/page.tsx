"use client"

import { useEffect, useState } from "react"
import { AuthManager, type User } from "@/lib/auth"
import { LoginForm } from "@/components/auth/login-form"
import { FarmerDashboard } from "@/components/dashboards/farmer-dashboard"
import { DistributorDashboard } from "@/components/dashboards/distributor-dashboard"
import { RetailerDashboard } from "@/components/dashboards/retailer-dashboard"
import { ConsumerDashboard } from "@/components/dashboards/consumer-dashboard"
import { AdminDashboard } from "@/components/dashboards/admin-dashboard"
import { Leaf, Shield, Truck, Store, Users } from "lucide-react"

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const currentUser = AuthManager.getCurrentUser()
    setUser(currentUser)
    setIsLoading(false)
  }, [])

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser)
  }

  const handleLogout = () => {
    AuthManager.logout()
    setUser(null)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Leaf className="h-6 w-6 animate-spin text-primary" />
          <span>Loading AgriTrace...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Leaf className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">AgriTrace</h1>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Blockchain Supply Chain Transparency</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-foreground mb-4 text-balance">
                Track Your Produce from Farm to Table
              </h2>
              <p className="text-xl text-muted-foreground mb-8 text-pretty">
                Ensuring transparency, quality, and fair pricing in the agricultural supply chain through blockchain
                technology.
              </p>

              {/* Feature Icons */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Leaf className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Farm Origin</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Truck className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Transport Tracking</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Store className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Retail Verification</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Quality Assurance</span>
                </div>
              </div>
            </div>

            {/* Login/Registration */}
            <div className="max-w-md mx-auto">
              <LoginForm onLogin={handleLogin} />
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Render appropriate dashboard based on user role
  const renderDashboard = () => {
    switch (user.role) {
      case "farmer":
        return <FarmerDashboard user={user} onLogout={handleLogout} />
      case "distributor":
        return <DistributorDashboard user={user} onLogout={handleLogout} />
      case "retailer":
        return <RetailerDashboard user={user} onLogout={handleLogout} />
      case "consumer":
        return <ConsumerDashboard user={user} onLogout={handleLogout} />
      case "admin":
        return <AdminDashboard user={user} onLogout={handleLogout} />
      default:
        return (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Unknown Role</h2>
              <p className="text-muted-foreground mb-4">Your account role is not recognized.</p>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Logout
              </button>
            </div>
          </div>
        )
    }
  }

  return renderDashboard()
}
