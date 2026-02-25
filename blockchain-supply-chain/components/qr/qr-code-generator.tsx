"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { QrCode, Download, Share2, Copy, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface QRCodeGeneratorProps {
  productId: string
  qrCodeId?: string
  onClose?: () => void
}

export function QRCodeGenerator({ productId, qrCodeId, onClose }: QRCodeGeneratorProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [verificationUrl, setVerificationUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    generateQRCode()
  }, [productId, qrCodeId])

  const generateQRCode = async () => {
    try {
      setIsLoading(true)

      // Create verification URL that consumers will scan
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://agritrace.app"
      const verifyUrl = `${baseUrl}/verify/${productId}`
      setVerificationUrl(verifyUrl)

      // Generate QR code using a QR code API service
      // In production, you might use a service like qr-server.com or generate locally
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(verifyUrl)}&format=png&margin=10`
      setQrCodeUrl(qrApiUrl)
    } catch (error) {
      console.error("Failed to generate QR code:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(verificationUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy URL:", error)
    }
  }

  const handleDownload = () => {
    if (qrCodeUrl) {
      const link = document.createElement("a")
      link.href = qrCodeUrl
      link.download = `qr-code-${productId}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `AgriTrace Product: ${productId}`,
          text: "Verify this agricultural product's origin and quality",
          url: verificationUrl,
        })
      } catch (error) {
        console.error("Failed to share:", error)
      }
    } else {
      // Fallback to copying URL
      handleCopyUrl()
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          QR Code for Product {productId}
        </CardTitle>
        <CardDescription>
          This QR code allows consumers to verify the product's origin, quality, and supply chain journey
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Generating QR code...</p>
          </div>
        ) : (
          <>
            {/* QR Code Display */}
            <div className="flex justify-center">
              <div className="p-6 bg-white rounded-lg border-2 border-dashed border-border">
                <img src={qrCodeUrl || "/placeholder.svg"} alt={`QR Code for ${productId}`} className="w-64 h-64" />
              </div>
            </div>

            {/* Product Information */}
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Product Information</h4>
                <Badge variant="outline">Blockchain Verified</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Product ID:</span>
                  <p className="font-mono">{productId}</p>
                </div>
                {qrCodeId && (
                  <div>
                    <span className="text-muted-foreground">QR Code ID:</span>
                    <p className="font-mono text-xs">{qrCodeId}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Verification URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Verification URL</label>
              <div className="flex gap-2">
                <div className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">{verificationUrl}</div>
                <Button variant="outline" size="sm" onClick={handleCopyUrl}>
                  {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              {copied && (
                <Alert className="border-green-200 bg-green-50 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>URL copied to clipboard!</AlertDescription>
                </Alert>
              )}
            </div>

            {/* Usage Instructions */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">How to Use This QR Code</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Print this QR code on product packaging or labels</li>
                <li>• Consumers can scan it with any QR code scanner app</li>
                <li>• They'll see complete product history and quality certificates</li>
                <li>• The information is tamper-proof and blockchain-verified</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button onClick={handleDownload} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download QR Code
              </Button>
              <Button onClick={handleShare} variant="outline" className="flex-1 bg-transparent">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>

            {onClose && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
