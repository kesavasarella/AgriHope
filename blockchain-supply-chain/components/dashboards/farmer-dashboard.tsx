"use client"

import { useState, useEffect } from "react"
import type { User } from "@/lib/auth"
import { db, type Product, type TradeRequest } from "@/lib/database"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { ProductRegistrationForm } from "@/components/products/product-registration-form"
import { ProductDetails } from "@/components/products/product-details"
import { QRCodeGenerator } from "@/components/qr/qr-code-generator"
import { Leaf, Plus, Package, TrendingUp, LogOut, Eye, ArrowRight, QrCode, DollarSign, BadgeCheck, Trash2 } from "lucide-react"
import { AccountPanel } from "@/components/account/account-panel"
import { QualityCertificates } from "@/components/products/quality-certificates"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface FarmerDashboardProps {
  user: User
  onLogout: () => void
}

export function FarmerDashboard({ user, onLogout }: FarmerDashboardProps) {
  const isKycVerified = user.kyc_status === "verified"
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showRegistrationForm, setShowRegistrationForm] = useState(false)
  const [showProductDetails, setShowProductDetails] = useState<string | null>(null)
  const [tradeRequests, setTradeRequests] = useState<TradeRequest[]>([])
  const [isTradeLoading, setIsTradeLoading] = useState(true)
  const [revenue, setRevenue] = useState<number>(0)
  const [classificationById, setClassificationById] = useState<Record<string, "organic" | "inorganic" | null>>({})
  const [imageById, setImageById] = useState<Record<string, string | null>>({})
  const [showCertificates, setShowCertificates] = useState(false)
  const [certProductId, setCertProductId] = useState<string>("")
  const [recentSales, setRecentSales] = useState<Array<{ product_id: string; buyer_name: string; buyer_role: string; price?: number | null; quantity?: number | null; when: string }>>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Product | null>(null)

  useEffect(() => {
    loadProducts()
    // Load incoming trade requests where farmer is the seller
    ;(async () => {
      try {
        const pending = await db.getTradeRequestsForSeller(user.id)
        setTradeRequests(pending)
      } finally {
        setIsTradeLoading(false)
      }
    })()
    // Load recent sales made by this farmer
    ;(async () => {
      try {
        const events = await db.getEventsByActor(user.id)
        const sold = events.filter((e) => e.event_type === "sold")
        const enriched = await Promise.all(
          sold.slice(0, 10).map(async (e) => {
            const p = await db.getProductByProductId(e.product_id)
            let buyer_name = "Unknown"
            let buyer_role = ""
            let quantity: number | null = null
            if (p) {
              quantity = p.quantity_kg
              const buyer = await db.getUserById(p.current_owner_id).catch(() => null)
              if (buyer) { buyer_name = buyer.name; buyer_role = buyer.role }
            }
            return { product_id: e.product_id, buyer_name, buyer_role, price: (e as any).price ?? null, quantity, when: (e as any).timestamp || "" }
          })
        )
        setRecentSales(enriched)
      } catch {}
    })()
  }, [user.id])

  const loadProducts = async () => {
    try {
      const userProducts = await db.getProductsByOwner(user.id)
      setProducts(userProducts)

      // Compute revenue from sold events performed by this farmer across ALL products
      const actorEvents = await db.getEventsByActor(user.id)
      const totalRevenue = actorEvents
        .filter((e) => e.event_type === "sold" && typeof e.price === "number")
        .reduce((sum, e) => sum + (e.price as number), 0)
      setRevenue(totalRevenue)

      // Build classification map for owned products
      const classMapEntries = await Promise.all(
        userProducts.map(async (p) => {
          const pe = await db.getProductEvents(p.product_id)
          const created = pe.find((e) => e.event_type === "created" && !!e.notes)
          const match = created?.notes?.match(/Classification:\s*(ORGANIC|INORGANIC)/i)
          const cls = match ? (match[1].toLowerCase() as "organic" | "inorganic") : null
          return [p.product_id, cls] as const
        })
      )
      setClassificationById(Object.fromEntries(classMapEntries))

      // Build image map (first image) for owned products
      const imageEntries = await Promise.all(
        userProducts.map(async (p) => {
          const imgs = await db.getProductImages(p.product_id)
          return [p.product_id, (imgs && imgs.length > 0 ? imgs[0] : null)] as const
        })
      )
      setImageById(Object.fromEntries(imageEntries))
    } catch (error) {
      console.error("Failed to load products:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleProductCreated = () => {
    loadProducts()
    setShowRegistrationForm(false)
  }

  const refreshTradeRequests = async () => {
    const pending = await db.getTradeRequestsForSeller(user.id)
    setTradeRequests(pending)
  }

  const approveTrade = async (req: TradeRequest) => {
    try {
      // Use offered price if provided, else latest listed price
      let price = req.offered_price
      if (price == null) {
        const latest = await db.getLatestListedPrice(req.product_id)
        price = latest ?? 0
      }
      // Split requested quantity to buyer and record sale revenue
      const newProd = await db.splitProductToBuyer({
        product_id: req.product_id,
        quantity_kg: req.quantity_kg,
        buyer_id: req.buyer_id,
        buyer_status: "received",
      })
      await db.createProductEvent({
        product_id: newProd.product_id,
        actor_id: user.id,
        event_type: "sold",
        status: "sold",
        price,
        notes: `B2B trade approved by farmer for ${req.quantity_kg} kg`,
      })
      await db.updateTradeRequestStatus(req.id, "approved")
      await loadProducts()
      await refreshTradeRequests()
    } catch (e) {
      console.error("Failed to approve trade request", e)
    }
  }

  const rejectTrade = async (req: TradeRequest) => {
    try {
      await db.updateTradeRequestStatus(req.id, "rejected")
      await refreshTradeRequests()
    } catch (e) {
      console.error("Failed to reject trade request", e)
    }
  }

  const handleDeleteProduct = async (product: Product) => {
    try {
      await db.deleteProduct(product.product_id)
      await loadProducts()
      await refreshTradeRequests()
      setShowDeleteConfirm(null)
    } catch (e) {
      console.error("Failed to delete product", e)
    }
  }

  const getStatusColor = (status: Product["current_status"]) => {
    switch (status) {
      case "harvested":
        return "bg-green-100 text-green-800"
      case "packed":
        return "bg-blue-100 text-blue-800"
      case "dispatched":
        return "bg-yellow-100 text-yellow-800"
      case "sold":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const totalQuantity = products.reduce((sum, product) => sum + product.quantity_kg, 0)
  const activeProducts = products.filter((p) => !["sold", "dispute"].includes(p.current_status))

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Leaf className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Agri-Hope — Farmer Dashboard</h1>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  Welcome back, {user.name}
                  {user.kyc_status === "verified" && (
                    <span className="inline-flex items-center text-sky-600" title="Verified">
                      <BadgeCheck className="h-4 w-4" />
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AccountPanel user={user} />
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
              <p className="text-xs text-muted-foreground">{activeProducts.length} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalQuantity.toFixed(1)} kg</div>
              <p className="text-xs text-muted-foreground">Across all products</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Farm ID</CardTitle>
              <Leaf className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user.farm_id || "Not Set"}</div>
              <p className="text-xs text-muted-foreground">Your farm identifier</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{revenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">From recorded sales</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-8">
          <Dialog open={showRegistrationForm} onOpenChange={setShowRegistrationForm}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Register New Harvest
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <ProductRegistrationForm
                onProductCreated={handleProductCreated}
                onClose={() => setShowRegistrationForm(false)}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={showCertificates} onOpenChange={setShowCertificates}>
            <DialogTrigger asChild>
              <Button variant="outline">View Quality Certificates</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <CardHeader className="p-0 mb-2">
                    <CardTitle className="text-lg">Select Product</CardTitle>
                    <CardDescription>Choose a product to view or add certificates</CardDescription>
                  </CardHeader>
                  <Select
                    value={certProductId || (products[0]?.product_id ?? "")}
                    onValueChange={(v) => setCertProductId(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.product_id} value={p.product_id}>
                          {p.product_id} • {p.crop_type} ({p.quantity_kg} kg)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {products.length > 0 ? (
                  <QualityCertificates productId={certProductId || products[0].product_id} />
                ) : (
                  <p className="text-muted-foreground">You have no products yet. Register a harvest first.</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Products List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Products</CardTitle>
            <CardDescription>Track and manage your registered agricultural products</CardDescription>
            {!isKycVerified && (
              <div className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                KYC verification is required to sell or transfer products. Complete KYC in your Account.
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Products Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by registering your first harvest to track it through the supply chain.
                </p>
                <Button onClick={() => setShowRegistrationForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Register First Product
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {imageById[product.product_id] && (
                          <img src={imageById[product.product_id] as string} alt="thumb" className="h-12 w-12 rounded object-cover" />
                        )}
                        <h4 className="font-semibold text-foreground">{product.product_id}</h4>
                        <Badge className={getStatusColor(product.current_status)}>
                          {product.current_status.replace("_", " ")}
                        </Badge>
                        {classificationById[product.product_id] && (
                          <Badge className={classificationById[product.product_id] === "organic" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}>
                            {classificationById[product.product_id]}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Crop:</span> {product.crop_type}
                        </div>
                        <div>
                          <span className="font-medium">Quantity:</span> {product.quantity_kg} kg
                        </div>
                        <div>
                          <span className="font-medium">Harvest:</span>{" "}
                          {new Date(product.harvest_date).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Variety:</span> {product.variety || "N/A"}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
                          <ProductDetails productId={product.product_id} />
                        </DialogContent>
                      </Dialog>

                      {product.qr_code && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <QrCode className="h-4 w-4 mr-2" />
                              QR Code
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <QRCodeGenerator productId={product.product_id} qrCodeId={product.qr_code} />
                          </DialogContent>
                        </Dialog>
                      )}

                      {/* Remove Transfer button - products are automatically available */}

                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowDeleteConfirm(product)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trade Requests (from Distributors) */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Purchase Requests</CardTitle>
            <CardDescription>Distributors interested in buying your listed products</CardDescription>
            {!isKycVerified && (
              <div className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                KYC verification is required to approve sales to distributors.
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isTradeLoading ? (
              <div className="text-center py-6 text-muted-foreground">Loading requests...</div>
            ) : tradeRequests.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">No pending requests</div>
            ) : (
              <div className="space-y-3">
                {tradeRequests.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <div className="font-mono text-sm">{r.product_id}</div>
                      <div className="text-xs text-muted-foreground">
                        Buyer (Distributor) #{r.buyer_id} • {r.offered_price != null ? `Offer: ₹${r.offered_price.toFixed(2)}` : "No offer"}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approveTrade(r)} disabled={!isKycVerified}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => rejectTrade(r)}>Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
            <CardDescription>See who bought your products</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <div className="text-sm text-muted-foreground">No sales recorded yet.</div>
            ) : (
              <div className="space-y-2">
                {recentSales.map((s) => (
                  <div key={s.product_id + s.when} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-mono text-sm">{s.product_id}</div>
                      <div className="text-xs text-muted-foreground">Sold to: {s.buyer_name} <span className="capitalize">({s.buyer_role})</span></div>
                    </div>
                    <div className="text-right text-sm">
                      {s.quantity != null && <div>{s.quantity} kg</div>}
                      {s.price != null && <div className="text-green-600">₹{s.price.toFixed(2)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Product</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this product? This action cannot be undone and will remove:
              </DialogDescription>
            </DialogHeader>
            {showDeleteConfirm && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="font-semibold text-red-800">
                      {showDeleteConfirm.product_id}
                    </div>
                    <Badge className="bg-red-100 text-red-800">
                      {showDeleteConfirm.crop_type}
                    </Badge>
                  </div>
                  <div className="text-sm text-red-700">
                    Quantity: {showDeleteConfirm.quantity_kg} kg • 
                    Harvest: {new Date(showDeleteConfirm.harvest_date).toLocaleDateString()}
                  </div>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>The product and all its history</li>
                  <li>All related quality certificates</li>
                  <li>Any pending trade requests</li>
                  <li>Product images and QR codes</li>
                </ul>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => showDeleteConfirm && handleDeleteProduct(showDeleteConfirm)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Product
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
