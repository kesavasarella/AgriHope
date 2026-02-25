"use client"

import { useEffect, useState } from "react"
import type { User } from "@/lib/auth"
import { db, type Product, type PurchaseRequest } from "@/lib/database"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { QRCodeScanner } from "@/components/qr/qr-code-scanner"
import { ProductDetails } from "@/components/products/product-details"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { QrCode, Search, History, LogOut, Leaf, Store, Package, DollarSign, BadgeCheck } from "lucide-react"
import { AccountPanel } from "@/components/account/account-panel"

interface ConsumerDashboardProps {
  user: User
  onLogout: () => void
}

export function ConsumerDashboard({ user, onLogout }: ConsumerDashboardProps) {
  const isKycVerified = user.kyc_status === "verified"
  const [showScanner, setShowScanner] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [scanHistory, setScanHistory] = useState<string[]>([])
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Array<Product & { price: number | null; retailer_name?: string; retailer_verified?: boolean }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [cropFilter, setCropFilter] = useState("")
  const [varietyFilter, setVarietyFilter] = useState("")
  const [minPrice, setMinPrice] = useState<string>("")
  const [maxPrice, setMaxPrice] = useState<string>("")
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [buyMessage, setBuyMessage] = useState<string>("")
  const [qtyById, setQtyById] = useState<Record<string, string>>({})
  const [myRequests, setMyRequests] = useState<PurchaseRequest[]>([])
  const [isReqLoading, setIsReqLoading] = useState(false)
  const [purchases, setPurchases] = useState<Array<
    Product & { purchase_price?: number | null; purchase_date?: string | null; image?: string | null }
  >>([])
  const [isPurchasesLoading, setIsPurchasesLoading] = useState(false)

  const handleProductFound = (productId: string) => {
    setSelectedProductId(productId)
    setShowScanner(false)

    // Add to scan history if not already present
    if (!scanHistory.includes(productId)) {
      setScanHistory((prev) => [productId, ...prev].slice(0, 10)) // Keep last 10 scans
    }
  }

  const loadMyPurchases = async () => {
    setIsPurchasesLoading(true)
    try {
      const owned = await db.getProductsByOwner(user.id)
      const enriched = await Promise.all(
        owned.map(async (p) => {
          const events = await db.getProductEvents(p.product_id)
          // the retailer creates a 'sold' event on the split product we received
          const soldEvent = events.find((e) => e.event_type === "sold" && typeof e.price === "number")
          const imgs = await db.getProductImages(p.product_id)
          const image = imgs && imgs.length > 0 ? imgs[0] : null
          return {
            ...p,
            purchase_price: soldEvent?.price ?? null,
            purchase_date: soldEvent?.timestamp ?? null,
            image,
          }
        })
      )
      // sort newest first by purchase_date or created_at
      enriched.sort((a, b) => {
        const at = a.purchase_date ? new Date(a.purchase_date).getTime() : new Date(a.created_at).getTime()
        const bt = b.purchase_date ? new Date(b.purchase_date).getTime() : new Date(b.created_at).getTime()
        return bt - at
      })
      setPurchases(enriched)
    } finally {
      setIsPurchasesLoading(false)
    }
  }

  const loadMyRequests = async () => {
    setIsReqLoading(true)
    try {
      const reqs = await db.getPurchaseRequestsByConsumer(user.id)
      // sort by newest first
      reqs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setMyRequests(reqs)
    } finally {
      setIsReqLoading(false)
    }
  }

  const searchRetailerProducts = async () => {
    setIsSearching(true)
    try {
      // Get all products, filter to those owned by retailers and for_sale
      const allProducts = await db.getAllProducts()
      const retailers = await db.getUsersByRole("retailer")
      const retailerIds = new Set(retailers.map((r) => r.id))

      const filtered = allProducts.filter(
        (p) => p.current_status === "for_sale" && retailerIds.has(p.current_owner_id)
      )

      // Compute latest listed price for each
      const withPrices = await Promise.all(
        filtered.map(async (p) => {
          const price = await db.getLatestListedPrice(p.product_id)
          const retailer = await db.getUserById(p.current_owner_id).catch(() => null)
          const retailer_name = retailer?.name || `Retailer #${p.current_owner_id}`
          const retailer_verified = retailer?.kyc_status === "verified"
          return { ...p, price, retailer_name, retailer_verified }
        })
      )

      // Apply query filter by product_id or crop_type or variety
      const q = query.trim().toLowerCase()
      let queried = q
        ? withPrices.filter((p) =>
            p.product_id.toLowerCase().includes(q) ||
            p.crop_type.toLowerCase().includes(q) ||
            (p.variety ? p.variety.toLowerCase().includes(q) : false)
          )
        : withPrices

      // Apply crop/variety filters if provided
      if (cropFilter.trim()) {
        const cf = cropFilter.trim().toLowerCase()
        queried = queried.filter((p) => p.crop_type.toLowerCase().includes(cf))
      }
      if (varietyFilter.trim()) {
        const vf = varietyFilter.trim().toLowerCase()
        queried = queried.filter((p) => (p.variety ? p.variety.toLowerCase().includes(vf) : false))
      }

      // Apply min/max price filters
      const min = minPrice ? Number.parseFloat(minPrice) : undefined
      const max = maxPrice ? Number.parseFloat(maxPrice) : undefined
      if (min !== undefined || max !== undefined) {
        queried = queried.filter((p) => {
          if (p.price == null) return false
          if (min !== undefined && p.price < min) return false
          if (max !== undefined && p.price > max) return false
          return true
        })
      }

      // Sort by price ascending, nulls last
      queried.sort((a, b) => {
        if (a.price == null && b.price == null) return 0
        if (a.price == null) return 1
        if (b.price == null) return -1
        return a.price - b.price
      })

      setResults(queried)
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    // Initial search to populate listings
    void searchRetailerProducts()
    void loadMyRequests()
    void loadMyPurchases()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleBuy = async (product: Product & { price: number | null }) => {
    setBuyMessage("")
    setBuyingId(product.product_id)
    try {
      const qtyStr = qtyById[product.product_id]
      const qty = qtyStr ? Number.parseFloat(qtyStr) : NaN
      if (!qty || qty <= 0 || qty > product.quantity_kg) {
        setBuyMessage("Enter a valid quantity (kg) within available amount")
        return
      }
      // Calculate proportional price for the requested quantity
      const proportionalPricing = await db.calculateProportionalPriceForProduct(product.product_id, qty)
      const requestedPrice = proportionalPricing ? proportionalPricing.proportionalPrice : (product.price ?? null)
      
      await db.createPurchaseRequest({
        product_id: product.product_id,
        retailer_id: product.current_owner_id,
        consumer_id: user.id,
        requested_price: requestedPrice,
        quantity_kg: qty,
      })
      setBuyMessage("Purchase request sent to retailer")
      void loadMyRequests()
    } catch (e) {
      setBuyMessage("Failed to send purchase request")
    } finally {
      setBuyingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <QrCode className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Agri-Hope — Consumer Dashboard</h1>
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
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Leaf className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">Verify Your Food's Journey</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Scan QR codes on agricultural products to see their complete supply chain history, quality certificates, and
            origin information.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Scan QR Code
              </CardTitle>
              <CardDescription>Use your camera to scan product QR codes for instant verification</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={showScanner} onOpenChange={setShowScanner}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <QrCode className="h-4 w-4 mr-2" />
                    Start Scanning
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <QRCodeScanner onProductFound={handleProductFound} onClose={() => setShowScanner(false)} />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

        {/* My Purchases */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>My Purchases</CardTitle>
              <CardDescription>Products you have purchased</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadMyPurchases} disabled={isPurchasesLoading}>
              {isPurchasesLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </CardHeader>
          <CardContent>
            {purchases.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No purchases recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {purchases.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      {p.image ? (
                        <img src={p.image as string} alt="thumb" className="h-12 w-12 rounded object-cover" />
                      ) : null}
                      <div>
                        <div className="font-semibold">{p.product_id}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.crop_type}{p.variety ? ` (${p.variety})` : ""} • {p.quantity_kg} kg
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {p.purchase_price != null ? (
                        <div className="text-sm font-semibold flex items-center justify-end gap-1">
                          <DollarSign className="h-4 w-4" /> ₹{p.purchase_price.toFixed(2)}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">Price: N/A</div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {p.purchase_date ? new Date(p.purchase_date).toLocaleString() : `Added: ${new Date(p.created_at).toLocaleString()}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Purchase Requests */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>My Purchase Requests</CardTitle>
              <CardDescription>Status of requests you sent to retailers</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadMyRequests} disabled={isReqLoading}>
              {isReqLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </CardHeader>
          <CardContent>
            {myRequests.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No requests yet. Send a request from a listing to see it here.</p>
            ) : (
              <div className="space-y-3">
                {myRequests.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <div className="font-semibold">{r.product_id}</div>
                      <div className="text-xs text-muted-foreground">Qty: {r.quantity_kg} kg • Sent: {new Date(r.created_at).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`px-2 py-1 rounded text-xs font-medium capitalize ${r.status === "approved" ? "bg-green-100 text-green-800" : r.status === "rejected" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>
                        {r.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Retail Listings
              </CardTitle>
              <CardDescription>Find products listed by retailers and compare prices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                  <Input
                    placeholder="Search by product ID, crop type, or variety"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <Input
                    placeholder="Filter by crop type"
                    value={cropFilter}
                    onChange={(e) => setCropFilter(e.target.value)}
                  />
                  <Input
                    placeholder="Filter by variety"
                    value={varietyFilter}
                    onChange={(e) => setVarietyFilter(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Min price (₹)"
                      value={minPrice}
                      type="number"
                      min="0"
                      step="0.01"
                      onChange={(e) => setMinPrice(e.target.value)}
                    />
                    <Input
                      placeholder="Max price (₹)"
                      value={maxPrice}
                      type="number"
                      min="0"
                      step="0.01"
                      onChange={(e) => setMaxPrice(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={searchRetailerProducts} disabled={isSearching}>
                    <Search className="h-4 w-4 mr-2" />
                    {isSearching ? "Searching..." : "Search"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuery("")
                      setCropFilter("")
                      setVarietyFilter("")
                      setMinPrice("")
                      setMaxPrice("")
                      void searchRetailerProducts()
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Results are sorted by price low to high. Per‑kg pricing is shown to compare different quantities.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Scan History
              </CardTitle>
              <CardDescription>View previously scanned products and their information</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-transparent" variant="outline" disabled={scanHistory.length === 0}>
                <History className="h-4 w-4 mr-2" />
                View History ({scanHistory.length})
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Search Results */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Available Retail Listings</CardTitle>
            <CardDescription>Products currently listed for sale by retailers</CardDescription>
            {!isKycVerified && (
              <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                KYC verification is required to purchase. Please complete KYC in your Account.
              </div>
            )}
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No listings found. Try searching with a different term.</p>
            ) : (
              <div className="space-y-3">
                {results.map((p) => (
                  <div key={p.id} className="flex items-start justify-between gap-3 p-3 border border-border rounded-lg overflow-hidden">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold text-foreground">{p.product_id}</h4>
                        <Badge variant="outline">{p.crop_type}{p.variety ? ` (${p.variety})` : ""}</Badge>
                        <Badge>{p.quantity_kg} kg</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Harvest: {new Date(p.harvest_date).toLocaleDateString()}</p>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        From Retailer: {p.retailer_name}
                        {p.retailer_verified && (
                          <span className="inline-flex items-center" title="Verified">
                            <BadgeCheck className="h-3 w-3 text-sky-600" />
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap justify-end">
                      <div className="text-right min-w-[120px]">
                        <div className="text-sm text-muted-foreground">Price</div>
                        <div className="text-lg font-semibold">{p.price != null ? `₹${p.price.toFixed(2)}` : "N/A"}</div>
                        {p.price != null && p.quantity_kg > 0 && (
                          <div className="text-xs text-muted-foreground">
                            ₹{(p.price / p.quantity_kg).toFixed(2)}/kg
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Input
                          className="w-24 sm:w-28 shrink-0"
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="Qty (kg)"
                          value={qtyById[p.product_id] || ""}
                          onChange={(e) => setQtyById((prev) => ({ ...prev, [p.product_id]: e.target.value }))}
                        />
                        {qtyById[p.product_id] && p.price != null && p.quantity_kg > 0 && (
                          <div className="text-xs text-center text-green-600 font-medium">
                            ₹{((p.price / p.quantity_kg) * parseFloat(qtyById[p.product_id] || "0")).toFixed(2)}
                          </div>
                        )}
                      </div>
                      <Button size="sm" onClick={() => handleBuy(p)} disabled={!isKycVerified || !!buyingId}>
                        {buyingId === p.product_id ? "Sending..." : "Buy"}
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Package className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                          <ProductDetails productId={p.product_id} />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
                {buyMessage && (
                  <p className="text-xs text-green-600">{buyMessage}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Scans */}
        {scanHistory.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Recent Scans</CardTitle>
              <CardDescription>Products you've recently verified</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {scanHistory.slice(0, 5).map((productId, index) => (
                  <div
                    key={productId}
                    className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedProductId(productId)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <QrCode className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-mono text-sm">{productId}</p>
                        <p className="text-xs text-muted-foreground">Scan #{index + 1}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Product Details Modal */}
        {selectedProductId && (
          <Dialog open={!!selectedProductId} onOpenChange={() => setSelectedProductId(null)}>
            <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
              <ProductDetails productId={selectedProductId} onClose={() => setSelectedProductId(null)} />
            </DialogContent>
          </Dialog>
        )}

        {/* Information Section */}
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <CardContent className="p-8">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-foreground mb-4">Why Verify Your Food?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                    <Leaf className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-semibold mb-2">Know Your Source</h4>
                  <p className="text-sm text-muted-foreground">
                    See exactly where your food comes from, which farm it was grown on, and when it was harvested.
                  </p>
                </div>
                <div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                    <QrCode className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-semibold mb-2">Quality Assurance</h4>
                  <p className="text-sm text-muted-foreground">
                    View quality certificates, pesticide tests, and other safety information verified by authorities.
                  </p>
                </div>
                <div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                    <Search className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-semibold mb-2">Supply Chain Transparency</h4>
                  <p className="text-sm text-muted-foreground">
                    Track the complete journey from farm to your table, ensuring fair pricing and ethical practices.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
