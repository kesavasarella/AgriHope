"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, Search, QrCode, AlertCircle, CheckCircle } from "lucide-react"
import jsQR from "jsqr"

interface QRCodeScannerProps {
  onProductFound: (productId: string) => void
  onClose?: () => void
}

export function QRCodeScanner({ onProductFound, onClose }: QRCodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [manualInput, setManualInput] = useState("")
  const [error, setError] = useState("")
  const [hasCamera, setHasCamera] = useState(false)
  const [imageScanInProgress, setImageScanInProgress] = useState(false)
  const [imageResult, setImageResult] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageCanvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    checkCameraAvailability()
    return () => {
      stopCamera()
    }
  }, [])

  const checkCameraAvailability = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const hasVideoInput = devices.some((device) => device.kind === "videoinput")
      setHasCamera(hasVideoInput)
    } catch (error) {
      console.error("Error checking camera availability:", error)
      setHasCamera(false)
    }
  }

  const startCamera = async () => {
    try {
      setError("")
      setIsScanning(true)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera on mobile
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()

        // Start scanning for QR codes
        startQRDetection()
      }
    } catch (error) {
      console.error("Error starting camera:", error)
      setError("Failed to access camera. Please check permissions or use manual input.")
      setIsScanning(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }

  const startQRDetection = () => {
    // Real QR code detection using jsQR
    const detectQR = () => {
      if (!isScanning || !videoRef.current || !canvasRef.current) return

      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext("2d")

      if (context && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0, canvas.width, canvas.height)

        try {
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" })
          if (code && code.data) {
            handleQRCodeDetected(code.data)
            return // stop loop once found
          }
        } catch (e) {
          // ignore per-frame errors, show a generic message if persistent
        }
      }

      if (isScanning) {
        requestAnimationFrame(detectQR)
      }
    }

    detectQR()
  }

  const handleQRCodeDetected = (data: string) => {
    try {
      // Extract product ID from URL
      const url = new URL(data)
      const pathParts = url.pathname.split("/")
      const productId = pathParts[pathParts.length - 1]

      if (productId && productId.startsWith("AGR-")) {
        stopCamera()
        onProductFound(productId)
      } else {
        setError("Invalid QR code. This doesn't appear to be an AgriTrace product code.")
      }
    } catch (error) {
      setError("Invalid QR code format. Please scan a valid AgriTrace product QR code.")
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualInput.trim()) {
      // Extract product ID if it's a URL, otherwise use as-is
      let productId = manualInput.trim()
      try {
        const url = new URL(productId)
        const pathParts = url.pathname.split("/")
        productId = pathParts[pathParts.length - 1]
      } catch {
        // Not a URL, use as-is
      }

      if (productId.startsWith("AGR-")) {
        onProductFound(productId)
      } else {
        setError("Invalid product ID format. Product IDs should start with 'AGR-'")
      }
    }
  }

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError("")
    setImageResult(null)
    setImageScanInProgress(true)
    try {
      const img = new Image()
      img.onload = () => {
        const canvas = imageCanvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        // Scale image to a reasonable max to improve decoding speed
        const maxDim = 1000
        let { width, height } = img
        if (width > height && width > maxDim) {
          height = (maxDim / width) * height
          width = maxDim
        } else if (height >= width && height > maxDim) {
          width = (maxDim / height) * width
          height = maxDim
        }
        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)
        try {
          const imageData = ctx.getImageData(0, 0, width, height)
          const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" })
          if (code && code.data) {
            setImageResult(code.data)
            handleQRCodeDetected(code.data)
          } else {
            setError("No QR code detected in the image. Please try a clearer image.")
          }
        } catch (err) {
          setError("Failed to process image for QR decoding.")
        } finally {
          setImageScanInProgress(false)
        }
      }
      img.onerror = () => {
        setError("Could not load the selected image.")
        setImageScanInProgress(false)
      }
      img.src = URL.createObjectURL(file)
    } catch (err) {
      setError("Image scan failed. Please try again.")
      setImageScanInProgress(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Scan Product QR Code
        </CardTitle>
        <CardDescription>
          Scan a QR code or enter a product ID to verify agricultural product information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 1) Camera Scanner */}
        {hasCamera && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Camera Scanner</h4>
              {isScanning ? (
                <Button variant="outline" onClick={stopCamera}>
                  Stop Scanning
                </Button>
              ) : (
                <Button onClick={startCamera}>
                  <Camera className="h-4 w-4 mr-2" />
                  Start Camera
                </Button>
              )}
            </div>

            {isScanning && (
              <div className="relative">
                <video ref={videoRef} className="w-full h-64 bg-black rounded-lg object-cover" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-primary border-dashed rounded-lg flex items-center justify-center">
                    <div className="text-center text-white">
                      <QrCode className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Position QR code here</p>
                    </div>
                  </div>
                </div>
                {isScanning && (
                  <div className="absolute bottom-4 left-4 right-4">
                    <Alert className="bg-black/50 border-white/20 text-white">
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>Scanning for QR codes... Point camera at QR code</AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!hasCamera && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Camera not available. Please use the manual input option below or enable camera permissions.
            </AlertDescription>
          </Alert>
        )}

        {/* 2) Image Scan */}
        <div className="space-y-3">
          <h4 className="font-semibold">Image Scan</h4>
          <div className="flex items-center gap-2">
            <Input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageFileChange} />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={imageScanInProgress}>
              Upload Image
            </Button>
          </div>
          {imageScanInProgress && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>Processing image for QR code...</AlertDescription>
            </Alert>
          )}
          <canvas ref={imageCanvasRef} className="hidden" />
          {imageResult && (
            <div className="text-sm text-muted-foreground break-all">Detected: {imageResult}</div>
          )}
        </div>

        {/* 3) Scan by ID */}
        {/* Manual Input */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border"></div>
            <span className="text-sm text-muted-foreground">OR</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manual-input">Scan by ID (Enter Product ID or URL)</Label>
              <Input
                id="manual-input"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="AGR-OD-20250908-0001 or https://agritrace.app/verify/..."
              />
            </div>
            <Button type="submit" className="w-full">
              <Search className="h-4 w-4 mr-2" />
              Verify Product
            </Button>
          </form>
        </div>

        {/* Instructions */}
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold mb-2">How to Scan</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Use the camera to scan QR codes on product packaging</li>
            <li>• Or upload a photo/screenshot of the QR code for decoding</li>
            <li>• Or manually enter the product ID found on labels</li>
            <li>• You'll see complete product history and quality information</li>
            <li>• All data is verified on the blockchain</li>
          </ul>
        </div>

        {onClose && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={onClose}>
              Close Scanner
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

