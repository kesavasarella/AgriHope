"use client"

import { use } from "react"
import { ProductDetails } from "@/components/products/product-details"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Leaf, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface VerifyPageProps {
  params: Promise<{ productId: string }>
}

export default function VerifyPage({ params }: VerifyPageProps) {
  const { productId } = use(params)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Leaf className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">AgriTrace Verification</h1>
                <p className="text-sm text-muted-foreground">Blockchain-verified product information</p>
              </div>
            </div>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Leaf className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Product Verification</h2>
                  <p className="text-muted-foreground">
                    View complete supply chain information for product: <span className="font-mono">{productId}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <ProductDetails productId={productId} />
      </main>
    </div>
  )
}
