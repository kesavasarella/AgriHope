"use client"

import { useEffect, useMemo, useState } from "react"
import type { User } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserManagement } from "@/components/admin/user-management"
import { SystemAnalytics } from "@/components/admin/system-analytics"
import { db, type Product, type ProductEvent } from "@/lib/database"
import { PieChart } from "@/components/charts/pie-chart"
import { BarChart } from "@/components/charts/bar-chart"
import { seedTestData, demonstratePricing } from "@/lib/test-data"
import { Shield, Users, AlertTriangle, BarChart3, Settings, LogOut, Database, Activity, TestTube } from "lucide-react"

interface AdminDashboardProps {
  user: User
  onLogout: () => void
}

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [bestFarmer, setBestFarmer] = useState<{ user: User | null; totalQty: number } | null>(null)
  const [bestDistributor, setBestDistributor] = useState<{ user: User | null; revenue: number } | null>(null)
  const [bestRetailer, setBestRetailer] = useState<{ user: User | null; revenue: number } | null>(null)
  const [cropDist, setCropDist] = useState<Array<{ label: string; value: number }>>([])
  const [topEarners, setTopEarners] = useState<Array<{ label: string; value: number }>>([])

  // Settings dialogs state
  const [qrOpen, setQrOpen] = useState(false)
  const [qualityOpen, setQualityOpen] = useState(false)
  const [cropOpen, setCropOpen] = useState(false)
  const [apiOpen, setApiOpen] = useState(false)
  const [accessOpen, setAccessOpen] = useState(false)
  const [auditOpen, setAuditOpen] = useState(false)
  const [tempValue, setTempValue] = useState("")

  useEffect(() => {
    ;(async () => {
      // Load data
      const products = await db.getAllProducts()
      const farmers = await db.getUsersByRole("farmer")
      const distributors = await db.getUsersByRole("distributor")
      const retailers = await db.getUsersByRole("retailer")
      const allUsers = [...farmers, ...distributors, ...retailers]

      // Map: farmerId -> total quantity produced
      const qtyByFarmer = new Map<number, number>()
      for (const p of products) {
        qtyByFarmer.set(p.farmer_id, (qtyByFarmer.get(p.farmer_id) || 0) + (p.quantity_kg || 0))
      }
      let bestFarmerId: number | null = null
      let bestFarmerQty = 0
      qtyByFarmer.forEach((qty, fid) => {
        if (qty > bestFarmerQty) { bestFarmerQty = qty; bestFarmerId = fid }
      })
      const bestFarmerUser = bestFarmerId != null ? farmers.find((f) => f.id === bestFarmerId) || null : null
      setBestFarmer({ user: bestFarmerUser || null, totalQty: bestFarmerQty })

      // Revenue by actor (from sold events)
      // We compute once across all products for efficiency
      const eventsPerProduct = await Promise.all(products.map((p) => db.getProductEvents(p.product_id)))
      const allEvents: ProductEvent[] = eventsPerProduct.flat()
      const revenueByActor = new Map<number, number>()
      for (const e of allEvents) {
        if (e.event_type === "sold" && typeof e.price === "number" && e.actor_id != null) {
          revenueByActor.set(e.actor_id, (revenueByActor.get(e.actor_id) || 0) + (e.price as number))
        }
      }

      // Best distributor by revenue
      let bestDist: { user: User | null; revenue: number } = { user: null, revenue: 0 }
      for (const d of distributors) {
        const rev = revenueByActor.get(d.id) || 0
        if (rev > bestDist.revenue) bestDist = { user: d, revenue: rev }
      }
      setBestDistributor(bestDist)

      // Best retailer by revenue
      let bestRet: { user: User | null; revenue: number } = { user: null, revenue: 0 }
      for (const r of retailers) {
        const rev = revenueByActor.get(r.id) || 0
        if (rev > bestRet.revenue) bestRet = { user: r, revenue: rev }
      }
      setBestRetailer(bestRet)

      // Crop distribution (by total quantity)
      const qtyByCrop = new Map<string, number>()
      for (const p of products) {
        qtyByCrop.set(p.crop_type, (qtyByCrop.get(p.crop_type) || 0) + (p.quantity_kg || 0))
      }
      const cropData = Array.from(qtyByCrop.entries()).map(([label, value]) => ({ label, value }))
      cropData.sort((a, b) => b.value - a.value)
      setCropDist(cropData.slice(0, 6))

      // Top earners across all roles (bar chart)
      const earners = allUsers
        .map((u) => ({ 
          label: `${u.name.split(" ")[0]} (${u.role.charAt(0).toUpperCase() + u.role.slice(1)})`, 
          value: revenueByActor.get(u.id) || 0 
        }))
        .filter((e) => e.value > 0)
      earners.sort((a, b) => b.value - a.value)
      setTopEarners(earners.slice(0, 6))
    })()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Agri-Hope — Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">System administration and oversight</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">Administrator</p>
              </div>
              <Button variant="outline" onClick={onLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="disputes" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Disputes
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              System
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Best Performers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Best Farmer</CardTitle>
                  <CardDescription>By total quantity harvested</CardDescription>
                </CardHeader>
                <CardContent>
                  {bestFarmer?.user ? (
                    <div>
                      <div className="text-xl font-semibold">{bestFarmer.user.name}</div>
                      <div className="text-sm text-muted-foreground">{bestFarmer.totalQty.toFixed(1)} kg</div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">No data</div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Best Distributor</CardTitle>
                  <CardDescription>By recorded sales revenue</CardDescription>
                </CardHeader>
                <CardContent>
                  {bestDistributor?.user ? (
                    <div>
                      <div className="text-xl font-semibold">{bestDistributor.user.name}</div>
                      <div className="text-sm text-muted-foreground">₹{(bestDistributor.revenue || 0).toFixed(2)}</div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">No data</div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Best Retailer</CardTitle>
                  <CardDescription>By recorded sales revenue</CardDescription>
                </CardHeader>
                <CardContent>
                  {bestRetailer?.user ? (
                    <div>
                      <div className="text-xl font-semibold">{bestRetailer.user.name}</div>
                      <div className="text-sm text-muted-foreground">₹{(bestRetailer.revenue || 0).toFixed(2)}</div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">No data</div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Status</CardTitle>
                  <Activity className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">Operational</div>
                  <p className="text-xs text-muted-foreground">All services running</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Disputes</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                  <p className="text-xs text-muted-foreground">Require attention</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                  <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">7</div>
                  <p className="text-xs text-muted-foreground">New user registrations</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Load</CardTitle>
                  <BarChart3 className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">23%</div>
                  <p className="text-xs text-muted-foreground">CPU utilization</p>
                </CardContent>
              </Card>
            </div>

            <SystemAnalytics />

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Crop Distribution</CardTitle>
                  <CardDescription>Total quantity across all products</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  <PieChart data={cropDist.map((d) => ({ label: d.label, value: Number(d.value.toFixed(2)) }))} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Top Earners</CardTitle>
                  <CardDescription>Revenue by top-performing users</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  <BarChart data={topEarners.map((d) => ({ label: d.label, value: Number(d.value.toFixed(2)) }))} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="disputes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Dispute Management
                </CardTitle>
                <CardDescription>Handle quality disputes and supply chain issues</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Active Disputes</h3>
                  <p className="text-muted-foreground">All supply chain operations are running smoothly.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Database Status
                  </CardTitle>
                  <CardDescription>Monitor database performance and health</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Connection Status</span>
                      <span className="text-sm font-medium text-green-600">Connected</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Storage Used</span>
                      <span className="text-sm font-medium">2.3 GB / 10 GB</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Query Performance</span>
                      <span className="text-sm font-medium text-green-600">Optimal</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Blockchain Status
                  </CardTitle>
                  <CardDescription>Monitor blockchain network and transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Network Status</span>
                      <span className="text-sm font-medium text-green-600">Synced</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Block Height</span>
                      <span className="text-sm font-medium">1,234,567</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Gas Price</span>
                      <span className="text-sm font-medium">12 Gwei</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Test Data Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Proportional Pricing Test Data
                </CardTitle>
                <CardDescription>Seed the system with test data to demonstrate proportional pricing calculations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-2">Test Scenarios:</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Rice: 150kg @ ₹250,000 total (₹1,666.67/kg)</li>
                      <li>• Wheat: 100kg @ ₹180,000 total (₹1,800/kg)</li>
                      <li>• Tomatoes: 75kg @ ₹45,000 total (₹600/kg)</li>
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={async () => {
                        try {
                          await seedTestData()
                          await demonstratePricing()
                          alert("✅ Test data seeded successfully! Check console for pricing demonstrations.")
                        } catch (error) {
                          console.error(error)
                          alert("❌ Error seeding test data. Check console for details.")
                        }
                      }}
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      Seed Test Data
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={async () => {
                        try {
                          await demonstratePricing()
                          alert("📊 Pricing calculations logged to console!")
                        } catch (error) {
                          console.error(error)
                          alert("❌ Error running pricing demo. Check console for details.")
                        }
                      }}
                    >
                      Run Pricing Demo
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Configuration
                </CardTitle>
                <CardDescription>Configure system parameters and settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold">Platform Settings</h4>
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full justify-start bg-transparent" onClick={() => { setTempValue(""); setQrOpen(true) }}>
                          Configure QR Code Settings
                        </Button>
                        <Button variant="outline" className="w-full justify-start bg-transparent" onClick={() => { setTempValue(""); setQualityOpen(true) }}>
                          Manage Quality Standards
                        </Button>
                        <Button variant="outline" className="w-full justify-start bg-transparent" onClick={() => { setTempValue(""); setCropOpen(true) }}>
                          Update Crop Categories
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold">Security Settings</h4>
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full justify-start bg-transparent" onClick={() => { setTempValue(""); setApiOpen(true) }}>
                          Manage API Keys
                        </Button>
                        <Button variant="outline" className="w-full justify-start bg-transparent" onClick={() => { setTempValue(""); setAccessOpen(true) }}>
                          Configure Access Controls
                        </Button>
                        <Button variant="outline" className="w-full justify-start bg-transparent" onClick={() => { setTempValue(""); setAuditOpen(true) }}>
                          Audit Logs
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        {/* Settings Dialogs */}
        <Dialog open={qrOpen} onOpenChange={setQrOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>QR Code Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <label className="text-sm">QR Prefix</label>
              <Input value={tempValue} onChange={(e) => setTempValue(e.target.value)} placeholder="e.g., AGR-OD" />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setQrOpen(false)}>Close</Button>
                <Button onClick={() => setQrOpen(false)}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={qualityOpen} onOpenChange={setQualityOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Manage Quality Standards</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <label className="text-sm">Add/Update Standard</label>
              <Input value={tempValue} onChange={(e) => setTempValue(e.target.value)} placeholder="e.g., Moisture < 12%" />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setQualityOpen(false)}>Close</Button>
                <Button onClick={() => setQualityOpen(false)}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={cropOpen} onOpenChange={setCropOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update Crop Categories</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <label className="text-sm">New Category</label>
              <Input value={tempValue} onChange={(e) => setTempValue(e.target.value)} placeholder="e.g., Spices" />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setCropOpen(false)}>Close</Button>
                <Button onClick={() => setCropOpen(false)}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={apiOpen} onOpenChange={setApiOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Manage API Keys</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <label className="text-sm">New API Key Label</label>
              <Input value={tempValue} onChange={(e) => setTempValue(e.target.value)} placeholder="e.g., Pricing Oracle" />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setApiOpen(false)}>Close</Button>
                <Button onClick={() => setApiOpen(false)}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={accessOpen} onOpenChange={setAccessOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Configure Access Controls</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <label className="text-sm">Role to edit</label>
              <Input value={tempValue} onChange={(e) => setTempValue(e.target.value)} placeholder="e.g., retailer" />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setAccessOpen(false)}>Close</Button>
                <Button onClick={() => setAccessOpen(false)}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Audit Logs</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <div className="p-2 bg-muted rounded">[Demo] 2025-09-23 14:22:38Z - User #1 updated Quality Standards</div>
              <div className="p-2 bg-muted rounded">[Demo] 2025-09-23 14:20:10Z - User #1 generated new QR prefix</div>
              <div className="p-2 bg-muted rounded">[Demo] 2025-09-23 13:55:02Z - User #2 added crop category 'Spices'</div>
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setAuditOpen(false)}>Close</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
