"use client"

import { useCallback, useEffect, useState } from "react"
import type { User } from "@/lib/auth"
import { db, type Product, type TradeRequest } from "@/lib/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { ProductDetails } from "@/components/products/product-details"
import { ProductTransferForm } from "@/components/products/product-transfer-form"
import { Truck, Package, MapPin, LogOut, Eye, CheckCircle2, ArrowRight, DollarSign, BadgeCheck, XCircle } from "lucide-react"
import { AccountPanel } from "@/components/account/account-panel"

interface DistributorDashboardProps {
  user: User
  onLogout: () => void
}

export function DistributorDashboard({ user, onLogout }: DistributorDashboardProps) {
  const isKycVerified = user.kyc_status === "verified"
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [revenue, setRevenue] = useState<number>(0)
  const [distributorListings, setDistributorListings] = useState<Array<
    Product & {
      price: number | null
      classification?: "organic" | "inorganic" | null
      image?: string | null
      farmer_name?: string
      farmer_verified?: boolean
    }
  >>([])
  const [isListingsLoading, setIsListingsLoading] = useState(true)
  const [tradeRequests, setTradeRequests] = useState<TradeRequest[]>([])
  const [isTradeLoading, setIsTradeLoading] = useState(true)
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [qtyById, setQtyById] = useState<Record<string, string>>({})
  const [buyStatusById, setBuyStatusById] = useState<Record<string, "sent" | "error" | "">>({})
  const [classificationById, setClassificationById] = useState<Record<string, "organic" | "inorganic" | null>>({})
  const [imageById, setImageById] = useState<Record<string, string | null>>({})
  const [recentSales, setRecentSales] = useState<Array<{ product_id: string; buyer_name: string; buyer_role: string; price?: number | null; quantity?: number | null; when: string }>>([])

  const loadProducts = useCallback(async () => {
    try {
      const userProducts = await db.getProductsByOwner(user.id)
      setProducts(userProducts)

      // Compute revenue from sold events performed by this distributor across ALL products
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
      console.error("Failed to load distributor products:", error)
    } finally {
      setIsLoading(false)
    }
  }, [user.id])

  const handleBuyFromFarmer = useCallback(
    async (p: Product & { price: number | null }) => {
      // Guard against double clicks while in-flight
      if (buyingId === p.product_id) return
      setBuyingId(p.product_id)
      try {
        const qtyStr = qtyById[p.product_id]
        const qty = qtyStr ? Number.parseFloat(qtyStr) : NaN
        if (!qty || qty <= 0 || qty > p.quantity_kg) {
          setBuyStatusById((prev) => ({ ...prev, [p.product_id]: "error" }))
          setTimeout(() => setBuyStatusById((prev) => ({ ...prev, [p.product_id]: "" })), 2500)
          return
        }
        // Calculate proportional price for the requested quantity
        const proportionalPricing = await db.calculateProportionalPriceForProduct(p.product_id, qty)
        const offeredPrice = proportionalPricing ? proportionalPricing.proportionalPrice : (p.price ?? null)
        
        // If a pending request already exists for this buyer/product (and seller), update it instead of creating another
        const existing = await db.findPendingTradeRequest({ product_id: p.product_id, buyer_id: user.id, seller_id: p.current_owner_id })
        if (existing) {
          await db.upsertTradeRequest({
            product_id: p.product_id,
            seller_id: p.current_owner_id,
            buyer_id: user.id,
            offered_price: offeredPrice,
            quantity_kg: qty,
          })
        } else {
          await db.upsertTradeRequest({
            product_id: p.product_id,
            seller_id: p.current_owner_id,
            buyer_id: user.id,
            offered_price: offeredPrice,
            quantity_kg: qty,
          })
        }
        // show confirmation and clear quantity field
        setBuyStatusById((prev) => ({ ...prev, [p.product_id]: "sent" }))
        setQtyById((prev) => ({ ...prev, [p.product_id]: "" }))
        setTimeout(() => setBuyStatusById((prev) => ({ ...prev, [p.product_id]: "" })), 2500)
      } finally {
        setBuyingId(null)
      }
    },
    [user.id, qtyById, buyingId]
  )

  const refreshTradeRequests = useCallback(async () => {
    const pending = await db.getTradeRequestsForSeller(user.id)
    setTradeRequests(pending)
  }, [user.id])

  const approveTrade = useCallback(
    async (req: TradeRequest) => {
      try {
        // Use offered price if provided, else latest listed price
        let price = req.offered_price
        if (price == null) {
          const latest = await db.getLatestListedPrice(req.product_id)
          price = latest ?? 0
        }
        // Split requested quantity to buyer and mark as received
        const newProd = await db.splitProductToBuyer({
          product_id: req.product_id,
          quantity_kg: req.quantity_kg,
          buyer_id: req.buyer_id,
          buyer_status: "received",
        })
        // Record sale revenue for this distributor
        await db.createProductEvent({
          product_id: newProd.product_id,
          actor_id: user.id,
          event_type: "sold",
          status: "sold",
          price,
          notes: `B2B trade approved by seller for ${req.quantity_kg} kg`,
        })
        await db.updateTradeRequestStatus(req.id, "approved")
        await loadProducts()
        await refreshTradeRequests()
      } catch (e) {
        console.error("Failed to approve trade request", e)
      }
    },
    [user.id, loadProducts, refreshTradeRequests]
  )

  const rejectTrade = useCallback(
    async (req: TradeRequest) => {
      try {
        await db.updateTradeRequestStatus(req.id, "rejected")
        await refreshTradeRequests()
      } catch (e) {
        console.error("Failed to reject trade request", e)
      }
    },
    [refreshTradeRequests]
  )

  useEffect(() => {
    loadProducts()
    // Load farmer listings (for_sale owned by farmers)
    ;(async () => {
      try {
        const all = await db.getAllProducts()
        const farmers = await db.getUsersByRole("farmer")
        const fIds = new Set(farmers.map((f) => f.id))
        const filtered = all.filter((p) => p.current_status === "for_sale" && fIds.has(p.current_owner_id))
        const withPrices = await Promise.all(
          filtered.map(async (p) => {
            const price = await db.getLatestListedPrice(p.product_id)
            const ev = await db.getProductEvents(p.product_id)
            const created = ev.find((e) => e.event_type === "created" && !!e.notes)
            const match = created?.notes?.match(/Classification:\s*(ORGANIC|INORGANIC)/i)
            const classification = match ? (match[1].toLowerCase() as "organic" | "inorganic") : null
            const imgs = await db.getProductImages(p.product_id)
            const image = imgs && imgs.length > 0 ? imgs[0] : null
            const farmer = await db.getUserById(p.farmer_id).catch(() => null)
            const farmer_name = farmer?.name || `Farmer #${p.farmer_id}`
            const farmer_verified = farmer?.kyc_status === "verified"
            return { ...p, price, classification, image, farmer_name, farmer_verified }
          })
        )
        setDistributorListings(withPrices)
      } finally {
        setIsListingsLoading(false)
      }
    })()

    // Load incoming trade requests where distributor is the seller
    ;(async () => {
      try {
        const pending = await db.getTradeRequestsForSeller(user.id)
        setTradeRequests(pending)
      } finally {
        setIsTradeLoading(false)
      }
    })()

    // Load recent sales by this distributor
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
  }, [loadProducts])

  const totalQuantity = products.reduce((sum, p) => sum + p.quantity_kg, 0)
  const dispatched = products.filter((p) => p.current_status === "dispatched")

  const getStatusColor = (status: Product["current_status"]) => {
    switch (status) {
      case "dispatched":
        return "bg-yellow-100 text-yellow-800"
      case "received":
        return "bg-green-100 text-green-800"
      case "for_sale":
        return "bg-blue-100 text-blue-800"
      case "sold":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const markAsReceived = async (product: Product) => {
    try {
      await db.updateProductOwner(product.product_id, user.id, "received")
      await db.createProductEvent({
        product_id: product.product_id,
        actor_id: user.id,
        event_type: "received",
        status: "received",
        notes: "Shipment received by distributor",
      })
      await loadProducts()
    } catch (e) {
      console.error("Failed to mark as received", e)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Truck className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Agri-Hope — Distributor Dashboard</h1>
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
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
              <p className="text-xs text-muted-foreground">In your custody</p>
            </CardContent>
          </Card>

        {/* Trade Requests (from Retailers) */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Purchase Requests</CardTitle>
            <CardDescription>Retailers interested in buying your listed products</CardDescription>
            {!isKycVerified && (
              <div className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                KYC verification is required to approve sales to retailers.
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
                        Buyer (Retailer) #{r.buyer_id} • {r.offered_price != null ? `Offer: ₹${r.offered_price.toFixed(2)}` : "No offer"}
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalQuantity.toFixed(1)} kg</div>
              <p className="text-xs text-muted-foreground">Across all items</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Incoming Shipments</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dispatched.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting receipt</p>
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

        {/* Inventory */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Inventory</CardTitle>
            <CardDescription>Manage products you have received or are selling</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading inventory...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Items Yet</h3>
                <p className="text-muted-foreground">You will see items here after transfer from a farmer/distributor.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
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
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Crop:</span> {product.crop_type}
                        </div>
                        <div>
                          <span className="font-medium">Quantity:</span> {product.quantity_kg} kg
                        </div>
                        <div>
                          <span className="font-medium">Harvest:</span> {new Date(product.harvest_date).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Variety:</span> {product.variety || "N/A"}
                        </div>
                        <div>
                          <span className="font-medium">Status:</span> {product.current_status}
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
                        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                          <ProductDetails productId={product.product_id} />
                        </DialogContent>
                      </Dialog>

                      {/* Quick receive for dispatched */}
                      {product.current_status === "dispatched" && (
                        <Button variant="outline" size="sm" onClick={() => markAsReceived(product)}>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Mark Received
                        </Button>
                      )}

                      {/* Update status / transfer */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" disabled={!isKycVerified}>
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Update Status
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <ProductTransferForm product={product} onTransferComplete={loadProducts} />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Farmer Listings (Marketplace) */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl">Farmer Listings</CardTitle>
            <CardDescription>Products for sale from farmers</CardDescription>
            {!isKycVerified && (
              <div className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                KYC verification is required to buy from farmers. Please complete KYC in your Account.
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isListingsLoading ? (
              <div className="text-center py-6 text-muted-foreground">Loading listings...</div>
            ) : distributorListings.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">No farmer listings found</div>
            ) : (
              <div className="space-y-4">
                {distributorListings.map((p) => (
                  <div key={p.id} className="flex items-start justify-between gap-4 p-4 border border-border rounded-xl overflow-hidden">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-lg">{p.product_id}</div>
                      <div className="text-base text-muted-foreground">
                        {p.crop_type}{p.variety ? ` (${p.variety})` : ""} • {p.quantity_kg} kg • Harvest {new Date(p.harvest_date).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        From Farmer: {p.farmer_name}
                        {p.farmer_verified ? (
                          <span title="Verified" className="inline-flex items-center">
                            <BadgeCheck className="h-3 w-3 text-sky-600" />
                          </span>
                        ) : (
                          <span title="Not verified" className="inline-flex items-center">
                            <XCircle className="h-3 w-3 text-rose-600" />
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap justify-end shrink-0 basis-full sm:basis-auto">
                      {p.image ? (
                        <img src={p.image as string} alt="thumb" className="h-16 w-16 rounded-lg object-cover" />
                      ) : null}
                      <div className="text-right min-w-[110px] sm:min-w-[120px]">
                        <div className="text-sm text-muted-foreground">Listed Price</div>
                        <div className="text-2xl font-semibold">{p.price != null ? `₹${p.price.toFixed(2)}` : "N/A"}</div>
                        {p.price != null && p.quantity_kg > 0 && (
                          <div className="text-xs text-muted-foreground">
                            ₹{(p.price / p.quantity_kg).toFixed(2)}/kg • {p.quantity_kg}kg total
                          </div>
                        )}
                      </div>
                      {p.classification ? (
                        <Badge className={p.classification === "organic" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}>
                          {p.classification}
                        </Badge>
                      ) : null}
                      <div className="flex flex-col gap-1">
                        <Input
                          className="w-28 sm:w-32 shrink-0"
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="Qty (kg)"
                          value={qtyById[p.product_id] || ""}
                          onChange={(e) => setQtyById((prev) => ({ ...prev, [p.product_id]: e.target.value }))}
                        />
                        {qtyById[p.product_id] && p.price != null && p.quantity_kg > 0 && (
                          <div className="text-xs text-center p-1 bg-green-50 border border-green-200 rounded text-green-700 font-medium">
                            Total: ₹{((p.price / p.quantity_kg) * parseFloat(qtyById[p.product_id] || "0")).toFixed(2)}
                            <div className="text-xs text-green-600">₹{(p.price / p.quantity_kg).toFixed(2)}/kg × {parseFloat(qtyById[p.product_id] || "0")}kg</div>
                          </div>
                        )}
                      </div>
                      <Button size="sm" className="h-9 px-4 text-base" onClick={() => handleBuyFromFarmer(p)} disabled={!isKycVerified || buyingId === p.product_id}>
                        {buyingId === p.product_id ? "Sending..." : "Buy"}
                      </Button>
                      {buyStatusById[p.product_id] === "sent" && (
                        <span className="text-xs text-green-600">Request sent to farmer</span>
                      )}
                      {buyStatusById[p.product_id] === "error" && (
                        <span className="text-xs text-red-600">Enter valid qty ≤ available</span>
                      )}
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
      </main>
    </div>
  )
}

