"use client"

import type React from "react"

import { useState } from "react"
import { AuthManager } from "@/lib/auth"
import { db, type Product, type ProductEvent } from "@/lib/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRight, Loader2, MapPin, DollarSign } from "lucide-react"

interface ProductTransferFormProps {
  product: Product
  onTransferComplete?: () => void
  onClose?: () => void
}

const statusTransitions: Record<Product["current_status"], Product["current_status"][]> = {
  harvested: ["packed"],
  packed: ["dispatched"],
  dispatched: ["received"],
  received: ["for_sale"], // Removed "dispatched" - distributors can't dispatch
  for_sale: [], // Removed "sold" - distributors can't mark as sold
  sold: [],
  dispute: ["received", "for_sale"],
}

const statusLabels: Record<Product["current_status"], string> = {
  harvested: "Harvested",
  packed: "Packed",
  dispatched: "Dispatched",
  received: "Received",
  for_sale: "For Sale",
  sold: "Sold",
  dispute: "Dispute",
}

export function ProductTransferForm({ product, onTransferComplete, onClose }: ProductTransferFormProps) {
  const [formData, setFormData] = useState({
    new_owner_email: "",
    new_status: "" as Product["current_status"] | "",
    price: "",
    location: "",
    notes: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const currentUser = AuthManager.getCurrentUser()
  const availableStatuses = statusTransitions[product.current_status] || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    if (!currentUser) {
      setError("You must be logged in to transfer products")
      setIsLoading(false)
      return
    }

    if (!formData.new_status) {
      setError("Please select a new status")
      setIsLoading(false)
      return
    }

    try {
      // Find the new owner by email
      let newOwnerId = currentUser.id // Default to current user for status updates

      if (formData.new_owner_email && formData.new_owner_email !== currentUser.email) {
        const newOwner = await db.getUserByEmail(formData.new_owner_email)
        if (!newOwner) {
          setError("User with this email not found")
          setIsLoading(false)
          return
        }
        newOwnerId = newOwner.id
      }

      // Update product ownership and status
      await db.updateProductOwner(product.product_id, newOwnerId, formData.new_status)

      // Create product event
      await db.createProductEvent({
        product_id: product.product_id,
        actor_id: currentUser.id,
        event_type: getEventTypeFromStatus(formData.new_status),
        status: formData.new_status,
        price: formData.price ? Number.parseFloat(formData.price) : undefined,
        location: formData.location,
        notes: formData.notes,
        metadata_hash: `transfer_${Date.now()}`,
      })

      setSuccess(`Product successfully updated to ${statusLabels[formData.new_status]}`)

      // Reset form
      setFormData({
        new_owner_email: "",
        new_status: "",
        price: "",
        location: "",
        notes: "",
      })

      // Notify parent component
      if (onTransferComplete) {
        onTransferComplete()
      }

      // Auto-close after success
      setTimeout(() => {
        if (onClose) {
          onClose()
        }
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transfer product")
    } finally {
      setIsLoading(false)
    }
  }

  const getEventTypeFromStatus = (status: Product["current_status"]): ProductEvent["event_type"] => {
    switch (status) {
      case "packed":
        return "packed"
      case "dispatched":
        return "dispatched"
      case "received":
        return "received"
      case "for_sale":
        return "listed"
      case "sold":
        return "sold"
      default:
        return "received"
    }
  }

  const requiresNewOwner = (status: Product["current_status"]): boolean => {
    return ["dispatched", "received", "for_sale", "sold"].includes(status)
  }

  const requiresPrice = (status: Product["current_status"]): boolean => {
    // Require price when dispatching (farmer->distributor or distributor->retailer),
    // when listing for sale (retailer->consumer listing), or when marking sold.
    return ["dispatched", "for_sale", "sold"].includes(status)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRight className="h-5 w-5" />
          Transfer Product
        </CardTitle>
        <CardDescription>Update product status and transfer ownership in the supply chain</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">Current Product Status</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Product ID:</span>
              <p className="font-mono">{product.product_id}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Current Status:</span>
              <p className="font-semibold">{statusLabels[product.current_status]}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Crop:</span>
              <p>
                {product.crop_type} {product.variety && `(${product.variety})`}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Quantity:</span>
              <p>{product.quantity_kg} kg</p>
            </div>
          </div>
        </div>

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

          <div className="space-y-2">
            <Label htmlFor="new_status">New Status *</Label>
            <Select
              value={formData.new_status}
              onValueChange={(value) => setFormData({ ...formData, new_status: value as Product["current_status"] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {availableStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableStatuses.length === 0 && (
              <p className="text-sm text-muted-foreground">No status transitions available from current status</p>
            )}
          </div>

          {formData.new_status && requiresNewOwner(formData.new_status) && (
            <div className="space-y-2">
              <Label htmlFor="new_owner_email">
                New Owner Email {formData.new_status === "sold" ? "*" : "(Optional)"}
              </Label>
              <Input
                id="new_owner_email"
                type="email"
                value={formData.new_owner_email}
                onChange={(e) => setFormData({ ...formData, new_owner_email: e.target.value })}
                placeholder="Enter email of new owner"
                required={formData.new_status === "sold"}
              />
              <p className="text-sm text-muted-foreground">Leave empty to update status without changing ownership</p>
            </div>
          )}

          {formData.new_status && requiresPrice(formData.new_status) && (
            <div className="space-y-2">
              <Label htmlFor="price">Price (₹) *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="Enter price"
                  className="pl-10"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Current location"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional information about this transfer"
              rows={3}
            />
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || !formData.new_status || availableStatuses.length === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Update Product
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
