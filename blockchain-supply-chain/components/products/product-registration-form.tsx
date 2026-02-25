"use client"

import type React from "react"

import { useState } from "react"
import { AuthManager } from "@/lib/auth"
import { db, BlockchainSimulator } from "@/lib/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2, Leaf, Calendar, Weight, IndianRupee } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ProductRegistrationFormProps {
  onProductCreated?: () => void
  onClose?: () => void
}

const cropTypes = [
  "Tomato",
  "Potato",
  "Onion",
  "Rice",
  "Wheat",
  "Maize",
  "Sugarcane",
  "Cotton",
  "Soybean",
  "Groundnut",
  "Mustard",
  "Sunflower",
  "Other",
]

const commonVarieties: Record<string, string[]> = {
  Tomato: ["Roma", "Cherry", "Beefsteak", "Heirloom", "Determinate", "Indeterminate"],
  Potato: ["Kufri Jyoti", "Kufri Pukhraj", "Kufri Bahar", "Kufri Chipsona", "Atlantic"],
  Onion: ["Nasik Red", "Bangalore Rose", "Pusa Red", "Agrifound Light Red", "White Onion"],
  Rice: ["Basmati", "Jasmine", "IR64", "Swarna", "Pusa Basmati", "Sona Masuri"],
  Wheat: ["HD2967", "PBW343", "DBW17", "HD3086", "Lok1"],
}

export function ProductRegistrationForm({ onProductCreated, onClose }: ProductRegistrationFormProps) {
  const [formData, setFormData] = useState({
    crop_type: "",
    variety: "",
    harvest_date: "",
    quantity_kg: "",
    price: "",
    notes: "",
    location: "",
  })
  // Inbuilt fertilizer catalogs
  const organicFertilizers = [
    "Compost",
    "Vermicompost",
    "Green Manure",
    "Biofertilizer",
    "Bone Meal",
    "Fish Emulsion",
    "Neem Cake",
  ]
  const inorganicFertilizers = [
    "Urea",
    "DAP",
    "MOP",
    "NPK 10-26-26",
    "NPK 20-20-0",
    "Ammonium Sulfate",
    "Superphosphate",
  ]
  const [selectedFerts, setSelectedFerts] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  const handleImagesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) {
      setImagePreviews([])
      return
    }
    const readers = Array.from(files).map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
    )
    const dataUrls = await Promise.all(readers)
    setImagePreviews(dataUrls)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    const user = AuthManager.getCurrentUser()
    if (!user || user.role !== "farmer") {
      setError("Only farmers can register products")
      setIsLoading(false)
      return
    }

    try {
      const fertList = Object.keys(selectedFerts).filter((k) => selectedFerts[k])
      const anyInorganic = fertList.some((f) => inorganicFertilizers.includes(f))
      const cultivationType = anyInorganic ? "inorganic" : "organic"

      // Generate unique product ID
      const productId = BlockchainSimulator.generateProductId()
      const qrCode = BlockchainSimulator.generateQRCode(productId)

      // Create metadata hash
      const metadata = {
        farmer: user.name,
        farm_id: user.farm_id,
        location: formData.location,
        notes: formData.notes,
        harvest_conditions: {
          date: formData.harvest_date,
          weather: "recorded_at_harvest",
        },
        fertilizers_used: fertList,
        cultivation_type: cultivationType,
      }
      const metadataHash = BlockchainSimulator.generateHash(JSON.stringify(metadata))

      // Create product in database
      const product = await db.createProduct({
        product_id: productId,
        farmer_id: user.id,
        crop_type: formData.crop_type,
        variety: formData.variety || undefined,
        harvest_date: formData.harvest_date,
        quantity_kg: Number.parseFloat(formData.quantity_kg),
        current_owner_id: user.id,
        current_status: "for_sale",
        qr_code: qrCode,
        metadata_hash: metadataHash,
      })

      // Create initial product event
      await db.createProductEvent({
        product_id: productId,
        actor_id: user.id,
        event_type: "created",
        status: "for_sale",
        price: formData.price ? Number.parseFloat(formData.price) : undefined,
        location: formData.location,
        notes: `Initial harvest registration: ${formData.notes}\nFertilizers: ${
          fertList.length ? fertList.join(", ") : "None"
        }\nClassification: ${cultivationType.toUpperCase()}`,
        metadata_hash: metadataHash,
      })

      // Create listed event for price visibility
      if (formData.price) {
        await db.createProductEvent({
          product_id: productId,
          actor_id: user.id,
          event_type: "listed",
          status: "for_sale",
          price: Number.parseFloat(formData.price),
          location: formData.location,
          notes: `Product listed for sale at ₹${formData.price} per ${formData.quantity_kg}kg total`,
          metadata_hash: metadataHash,
        })
      }

      // Persist images (if any)
      if (imagePreviews.length > 0) {
        await db.saveProductImages(productId, imagePreviews)
      }

      setSuccess(`Product ${productId} registered successfully!`)

      // Reset form
      setFormData({
        crop_type: "",
        variety: "",
        harvest_date: "",
        quantity_kg: "",
        price: "",
        notes: "",
        location: "",
      })
      setSelectedFerts({})
      setImagePreviews([])

      // Notify parent component
      if (onProductCreated) {
        onProductCreated()
      }

      // Auto-close after success
      setTimeout(() => {
        if (onClose) {
          onClose()
        }
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register product")
    } finally {
      setIsLoading(false)
    }
  }

  const availableVarieties = formData.crop_type ? commonVarieties[formData.crop_type] || [] : []

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Register New Harvest
        </CardTitle>
        <CardDescription>Register your agricultural produce on the blockchain for transparent tracking</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="crop_type">Crop Type *</Label>
              <Select
                value={formData.crop_type}
                onValueChange={(value) => setFormData({ ...formData, crop_type: value, variety: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select crop type" />
                </SelectTrigger>
                <SelectContent>
                  {cropTypes.map((crop) => (
                    <SelectItem key={crop} value={crop}>
                      <div className="flex items-center gap-2">
                        <Leaf className="h-4 w-4" />
                        {crop}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="variety">Variety</Label>
              <Select
                value={formData.variety}
                onValueChange={(value) => setFormData({ ...formData, variety: value })}
                disabled={!formData.crop_type || availableVarieties.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select variety (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {availableVarieties.map((variety) => (
                    <SelectItem key={variety} value={variety}>
                      {variety}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fertilizers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Organic Fertilizers</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {organicFertilizers.map((f) => (
                  <label key={f} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={!!selectedFerts[f]}
                      onChange={(e) => setSelectedFerts((prev) => ({ ...prev, [f]: e.target.checked }))}
                    />
                    {f}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Inorganic Fertilizers</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {inorganicFertilizers.map((f) => (
                  <label key={f} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={!!selectedFerts[f]}
                      onChange={(e) => setSelectedFerts((prev) => ({ ...prev, [f]: e.target.checked }))}
                    />
                    {f}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Live classification hint */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Classification</span>
            {(() => {
              const fertList = Object.keys(selectedFerts).filter((k) => selectedFerts[k])
              const anyInorganic = fertList.some((f) => inorganicFertilizers.includes(f))
              const cultivationType = anyInorganic ? "inorganic" : "organic"
              return (
                <Badge variant="outline" className="capitalize">
                  {cultivationType}
                </Badge>
              )
            })()}
            <span className="text-xs text-muted-foreground">Auto-detected from fertilizers used</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="harvest_date">Harvest Date *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="harvest_date"
                  type="date"
                  value={formData.harvest_date}
                  onChange={(e) => setFormData({ ...formData, harvest_date: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity_kg">Quantity (kg) *</Label>
              <div className="relative">
                <Weight className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="quantity_kg"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.quantity_kg}
                  onChange={(e) => setFormData({ ...formData, quantity_kg: e.target.value })}
                  placeholder="Enter quantity in kg"
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Base Price (₹) *</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="Enter base price for this harvest"
                className="pl-10"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">This price will be recorded with the initial harvest event.</p>
          </div>

          {/* Product Images */}
          <div className="space-y-2">
            <Label htmlFor="images">Product Images</Label>
            <Input id="images" type="file" accept="image/*" multiple onChange={handleImagesSelected} />
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-2">
                {imagePreviews.map((src, idx) => (
                  <div key={idx} className="border border-border rounded overflow-hidden">
                    <img src={src} alt={`Preview ${idx + 1}`} className="w-full h-24 object-cover" />
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">You can upload multiple images. They will be stored locally for demo.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Harvest Location *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Village Khandagiri, Bhubaneswar, Odisha"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information about the harvest (quality, conditions, etc.)"
              rows={3}
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Register Product
                </>
              )}
            </Button>
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
