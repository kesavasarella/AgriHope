"use client"

import { useState, useEffect } from "react"
import { db, type Product, type ProductEvent, type QualityCertificate } from "@/lib/database"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { QRCodeGenerator } from "@/components/qr/qr-code-generator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Package,
  Calendar,
  Weight,
  MapPin,
  User,
  Clock,
  Shield,
  QrCode,
  Truck,
  Store,
  CheckCircle,
  AlertCircle,
  DollarSign,
  BadgeCheck,
  XCircle,
} from "lucide-react"

interface ProductDetailsProps {
  productId: string
  onClose?: () => void
}

export function ProductDetails({ productId, onClose }: ProductDetailsProps) {
  const [product, setProduct] = useState<Product | null>(null)
  const [events, setEvents] = useState<ProductEvent[]>([])
  const [certificates, setCertificates] = useState<QualityCertificate[]>([])
  const [images, setImages] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<number>(0)
  const [qrOpen, setQrOpen] = useState(false)
  const [farmerName, setFarmerName] = useState<string>("")
  const [distributorName, setDistributorName] = useState<string>("")
  const [retailerName, setRetailerName] = useState<string>("")
  const [farmerVerified, setFarmerVerified] = useState<boolean>(false)
  const [distributorVerified, setDistributorVerified] = useState<boolean>(false)
  const [retailerVerified, setRetailerVerified] = useState<boolean>(false)

  useEffect(() => {
    loadProductDetails()
  }, [productId])

  const loadProductDetails = async () => {
    try {
      setIsLoading(true)
      const [productData, eventsData, certificatesData, imagesData] = await Promise.all([
        db.getProductById(productId),
        db.getProductEvents(productId),
        db.getProductCertificates(productId),
        db.getProductImages(productId),
      ])

      setProduct(productData)
      const sorted = [...eventsData].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      setEvents(sorted)
      setCertificates(certificatesData)
      setImages(imagesData)

      // Provenance: resolve names
      if (productData) {
        const farmer = await db.getUserById(productData.farmer_id).catch(() => null)
        setFarmerName(farmer?.name || `Farmer #${productData.farmer_id}`)
        setFarmerVerified(farmer?.kyc_status === "verified")
      }
      let firstDistributor: number | null = null
      let firstRetailer: number | null = null
      for (const ev of sorted) {
        if (!ev.actor_id) continue
        const actor = await db.getUserById(ev.actor_id).catch(() => null)
        if (!actor) continue
        if (actor.role === "distributor" && firstDistributor == null) {
          firstDistributor = actor.id
          setDistributorName(actor.name)
          setDistributorVerified(actor.kyc_status === "verified")
        }
        if (actor.role === "retailer" && firstRetailer == null) {
          firstRetailer = actor.id
          setRetailerName(actor.name)
          setRetailerVerified(actor.kyc_status === "verified")
        }
        if (firstDistributor != null && firstRetailer != null) break
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load product details")
    } finally {
      setIsLoading(false)
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
      case "received":
        return "bg-purple-100 text-purple-800"
      case "for_sale":
        return "bg-orange-100 text-orange-800"
      case "sold":
        return "bg-gray-100 text-gray-800"
      case "dispute":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getEventIcon = (eventType: ProductEvent["event_type"]) => {
    switch (eventType) {
      case "created":
        return <Package className="h-4 w-4" />
      case "packed":
        return <Package className="h-4 w-4" />
      case "dispatched":
        return <Truck className="h-4 w-4" />
      case "received":
        return <CheckCircle className="h-4 w-4" />
      case "listed":
        return <Store className="h-4 w-4" />
      case "sold":
        return <CheckCircle className="h-4 w-4" />
      case "quality_check":
        return <Shield className="h-4 w-4" />
      case "dispute_raised":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading product details...</span>
        </CardContent>
      </Card>
    )
  }

  if (error || !product) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Product Not Found</h3>
          <p className="text-muted-foreground mb-4">{error || "The requested product could not be found."}</p>
          {onClose && <Button onClick={onClose}>Go Back</Button>}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 break-words">
      {/* Product Images Gallery */}
      {images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Images
            </CardTitle>
            <CardDescription>Photos uploaded during registration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((src, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="border border-border rounded overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary"
                  onClick={() => {
                    setSelectedImage(idx)
                    setLightboxOpen(true)
                  }}
                >
                  <img src={src} alt={`Product image ${idx + 1}`} className="w-full h-40 object-cover" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-5xl">
          {images.length > 0 && (
            <div className="relative">
              <img
                src={images[selectedImage]}
                alt={`Product image ${selectedImage + 1}`}
                className="w-full max-h-[80vh] object-contain"
              />
              {images.length > 1 && (
                <div className="absolute inset-0 flex items-center justify-between px-2">
                  <button
                    type="button"
                    className="bg-black/40 text-white px-3 py-2 rounded"
                    onClick={() => setSelectedImage((i) => (i - 1 + images.length) % images.length)}
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    className="bg-black/40 text-white px-3 py-2 rounded"
                    onClick={() => setSelectedImage((i) => (i + 1) % images.length)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Product Header */}
      <Card className="border border-border rounded-xl shadow-sm overflow-hidden">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl break-all">
                <Package className="h-6 w-6" />
                {product.product_id}
              </CardTitle>
              <CardDescription className="text-base mt-2 break-words">Blockchain-tracked agricultural product</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(product.current_status)}>
                {product.current_status.replace("_", " ").toUpperCase()}
              </Badge>
              {(() => {
                const created = events.find((e) => e.event_type === "created" && !!e.notes)
                const match = created?.notes?.match(/Classification:\s*(ORGANIC|INORGANIC)/i)
                if (!match) return null
                const cls = match[1].toLowerCase()
                const clsColor = cls === "organic" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                return <Badge className={`capitalize ${clsColor}`}>{cls}</Badge>
              })()}
              {product.qr_code && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setQrOpen(true)}>
                    <QrCode className="h-4 w-4 mr-2" />
                    View QR Code
                  </Button>
                  <Dialog open={qrOpen} onOpenChange={setQrOpen}>
                    <DialogContent className="max-w-md overflow-x-hidden">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <QrCode className="h-5 w-5" />
                            Product QR Code
                          </CardTitle>
                          <CardDescription>Scan to verify this item</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center py-6">
                          <QRCodeGenerator productId={product.product_id} />
                        </CardContent>
                      </Card>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Crop Type</p>
                <p className="font-semibold">{product.crop_type}</p>
                {product.variety && <p className="text-sm text-muted-foreground">{product.variety}</p>}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Weight className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quantity</p>
                <p className="font-semibold">{product.quantity_kg} kg</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Harvest Date</p>
                <p className="font-semibold">{new Date(product.harvest_date).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Farmer ID</p>
                <p className="font-semibold">{product.farmer_id}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provenance */}
        <Card className="border border-border rounded-xl shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Provenance
            </CardTitle>
            <CardDescription>Who produced and handled this product</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Farmer:</span> {farmerName || "—"}
                {farmerName && (
                  farmerVerified ? (
                    <span title="Verified" className="inline-flex items-center"><BadgeCheck className="h-4 w-4 text-sky-600" /></span>
                  ) : (
                    <span title="Not verified" className="inline-flex items-center"><XCircle className="h-4 w-4 text-rose-600" /></span>
                  )
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Distributor:</span> {distributorName || "—"}
                {distributorName && (
                  distributorVerified ? (
                    <span title="Verified" className="inline-flex items-center"><BadgeCheck className="h-4 w-4 text-sky-600" /></span>
                  ) : (
                    <span title="Not verified" className="inline-flex items-center"><XCircle className="h-4 w-4 text-rose-600" /></span>
                  )
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Retailer:</span> {retailerName || "—"}
                {retailerName && (
                  retailerVerified ? (
                    <span title="Verified" className="inline-flex items-center"><BadgeCheck className="h-4 w-4 text-sky-600" /></span>
                  ) : (
                    <span title="Not verified" className="inline-flex items-center"><XCircle className="h-4 w-4 text-rose-600" /></span>
                  )
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Supply Chain Timeline */}
        <Card className="border border-border rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Supply Chain Timeline
            </CardTitle>
            <CardDescription>Track the journey of this product through the supply chain</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 overflow-hidden break-words leading-relaxed">
            <div className="space-y-4">
              {events.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No events recorded yet</p>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="flex gap-3 max-w-full">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      {getEventIcon(event.event_type)}
                    </div>
                    <div className="flex-1 border-l pl-3 min-w-0 leading-relaxed break-words">
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap max-w-full">
                        <p className="font-medium capitalize min-w-0 truncate">{event.event_type.replace("_", " ")}</p>
                        <Badge variant="outline" className="text-xs whitespace-nowrap">{event.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1 break-words">{new Date(event.timestamp).toLocaleString()}</p>
                      {event.location && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1 break-words">
                          <MapPin className="h-3 w-3" /> {event.location}
                        </div>
                      )}
                      {event.price && (
                        <p className="text-sm font-medium text-green-600">Price: ₹{event.price.toFixed(2)}</p>
                      )}
                      {event.notes && <p className="text-sm text-muted-foreground mt-1 break-words">{event.notes}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quality Certificates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Quality Certificates
            </CardTitle>
            <CardDescription>Verified quality and safety certifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {certificates.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No certificates available</p>
              ) : (
                certificates.map((cert) => (
                  <div key={cert.id} className="p-4 border border-border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{cert.certificate_type}</h4>
                      <Badge variant="outline" className="text-xs">
                        Verified
                      </Badge>
                    </div>
                    {cert.value && (
                      <p className="text-sm mb-1">
                        <span className="font-medium">Value:</span> {cert.value}
                        {cert.unit && ` ${cert.unit}`}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mb-1">
                      <span className="font-medium">Issued by:</span> {cert.issued_by}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Date:</span> {new Date(cert.issued_date).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Price History */}
      {events.some((e) => typeof e.price === "number") && (
        <Card className="border border-border rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Price History
            </CardTitle>
            <CardDescription>Recorded prices across the supply chain (dispatch, listing, and sale)</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {events
                .filter((e) => typeof e.price === "number")
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                .map((e) => (
                  <div key={e.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{e.event_type.replace("_", " ")}</Badge>
                      <span className="text-sm text-muted-foreground">{new Date(e.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold">
                      <DollarSign className="h-4 w-4" />
                      {e.price != null ? `₹${e.price.toFixed(2)}` : "—"}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blockchain Information */}
      <Card className="border border-border rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Blockchain Information
          </CardTitle>
          <CardDescription>Immutable record details and verification</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Product Hash</p>
              <p className="font-mono text-sm bg-muted p-2 rounded break-all">
                {product.metadata_hash || "Not available"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">QR Code ID</p>
              <p className="font-mono text-sm bg-muted p-2 rounded break-all">{product.qr_code || "Not generated"}</p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>This product is verified on the blockchain and cannot be tampered with</span>
          </div>
        </CardContent>
      </Card>

      {onClose && (
        <div className="flex justify-center">
          <Button onClick={onClose} variant="outline">
            Close Details
          </Button>
        </div>
      )}
    </div>
  )
}
