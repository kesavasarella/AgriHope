"use client"

import { useEffect, useState } from "react"
import { db, type QualityCertificate } from "@/lib/database"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface QualityCertificatesProps {
  productId: string
}

export function QualityCertificates({ productId }: QualityCertificatesProps) {
  const [certs, setCerts] = useState<QualityCertificate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    certificate_type: "",
    value: "",
    unit: "",
    issued_by: "",
    issued_date: new Date().toISOString().slice(0, 10),
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
  }, [productId])

  const load = async () => {
    setIsLoading(true)
    setError("")
    try {
      const list = await db.getProductCertificates(productId)
      setCerts(list)
    } catch (e) {
      setError("Failed to load certificates")
    } finally {
      setIsLoading(false)
    }
  }

  const addCertificate = async () => {
    setSaving(true)
    setError("")
    try {
      if (!form.certificate_type || !form.issued_by || !form.issued_date) {
        setError("Please fill required fields: Type, Issued By, Issued Date")
        return
      }
      await db.createQualityCertificate({
        product_id: productId,
        certificate_type: form.certificate_type,
        value: form.value || undefined,
        unit: form.unit || undefined,
        issued_by: form.issued_by,
        issued_date: form.issued_date,
        certificate_hash: `cert_${Date.now()}`,
      })
      setForm({ certificate_type: "", value: "", unit: "", issued_by: "", issued_date: new Date().toISOString().slice(0, 10) })
      await load()
    } catch (e) {
      setError("Failed to save certificate")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quality Certificates</CardTitle>
          <CardDescription>View or add certificates for product {productId}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading certificates...</p>
          ) : certs.length === 0 ? (
            <p className="text-muted-foreground">No certificates yet</p>
          ) : (
            <div className="space-y-3">
              {certs.map((c) => (
                <div key={c.id} className="p-3 border border-border rounded-md text-sm">
                  <div className="flex flex-wrap gap-3">
                    <div><span className="font-medium">Type:</span> {c.certificate_type}</div>
                    {c.value && (
                      <div><span className="font-medium">Value:</span> {c.value}{c.unit ? ` ${c.unit}` : ""}</div>
                    )}
                    <div><span className="font-medium">Issued By:</span> {c.issued_by}</div>
                    <div><span className="font-medium">Date:</span> {new Date(c.issued_date).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Certificate</CardTitle>
          <CardDescription>Provide certificate details and save</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="certificate_type">Certificate Type *</Label>
              <Input id="certificate_type" value={form.certificate_type} onChange={(e) => setForm({ ...form, certificate_type: e.target.value })} placeholder="e.g. Pesticide Test, Organic" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="issued_by">Issued By *</Label>
              <Input id="issued_by" value={form.issued_by} onChange={(e) => setForm({ ...form, issued_by: e.target.value })} placeholder="e.g. Govt Lab" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="value">Value</Label>
              <Input id="value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="e.g. 0.02" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g. ppm, grade" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="issued_date">Issued Date *</Label>
              <Input id="issued_date" type="date" value={form.issued_date} onChange={(e) => setForm({ ...form, issued_date: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={addCertificate} disabled={saving}>{saving ? "Saving..." : "Save Certificate"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
