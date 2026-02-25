"use client"

import { useEffect, useState } from "react"
import type { User } from "@/lib/auth"
import { AuthManager } from "@/lib/auth"
import { db } from "@/lib/database"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { User as UserIcon } from "lucide-react"

interface AccountPanelProps {
  user: User
  trigger?: React.ReactNode
  openPhotoOnOpen?: boolean
}

export function AccountPanel({ user, trigger, openPhotoOnOpen }: AccountPanelProps) {
  const [open, setOpen] = useState(false)
  const [avatar, setAvatar] = useState<string | null>(null)
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [phone, setPhone] = useState(user.phone || "")
  const [address, setAddress] = useState(user.address || "")
  const [farmId, setFarmId] = useState(user.farm_id || "")
  const [saving, setSaving] = useState(false)
  const [showPhoto, setShowPhoto] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [emailReqs, setEmailReqs] = useState<Array<{ id: number; requested_email: string; status: "pending" | "approved" | "rejected"; created_at: string }>>([])
  const [aadhaar, setAadhaar] = useState(user.aadhaar || "")
  const [kycStatus, setKycStatus] = useState<User["kyc_status"]>(user.kyc_status || "unverified")
  const [kycDoc, setKycDoc] = useState<string | null>(null)
  const [kycHash, setKycHash] = useState<string | null>(null)

  // Verhoeff checksum tables
  const d = [
    [0,1,2,3,4,5,6,7,8,9],
    [1,2,3,4,0,6,7,8,9,5],
    [2,3,4,0,1,7,8,9,5,6],
    [3,4,0,1,2,8,9,5,6,7],
    [4,0,1,2,3,9,5,6,7,8],
    [5,9,8,7,6,0,4,3,2,1],
    [6,5,9,8,7,1,0,4,3,2],
    [7,6,5,9,8,2,1,0,4,3],
    [8,7,6,5,9,3,2,1,0,4],
    [9,8,7,6,5,4,3,2,1,0],
  ] as const
  const p = [
    [0,1,2,3,4,5,6,7,8,9],
    [1,5,7,6,2,8,3,0,9,4],
    [5,8,0,3,7,9,6,1,4,2],
    [8,9,1,6,0,4,3,5,2,7],
    [9,4,5,3,1,2,6,8,7,0],
    [4,2,8,6,5,7,3,9,0,1],
    [2,7,9,3,8,0,6,4,1,5],
    [7,0,4,6,9,1,3,2,5,8],
  ] as const
  const inv = [0,4,3,2,1,5,6,7,8,9] as const

  function isAadhaarValid(num: string): boolean {
    if (!/^\d{12}$/.test(num)) return false
    let c = 0
    const rev = num.split("").reverse().map((n) => parseInt(n, 10))
    for (let i = 0; i < rev.length; i++) {
      c = d[c][p[(i % 8)][rev[i]]]
    }
    return c === 0
  }

  useEffect(() => {
    ;(async () => {
      const a = await db.getUserAvatar(user.id).catch(() => null)
      setAvatar(a)
      const doc = await db.getUserKycDocument(user.id).catch(() => null)
      setKycDoc(doc)
      const h = await db.getUserKycHash(user.id).catch(() => null)
      setKycHash(h)
      const er = await db.getEmailChangeRequestsByUser(user.id).catch(() => [])
      setEmailReqs(er)
    })()
  }, [user.id])

  // When dialog opens from an avatar click, optionally auto-open the photo preview
  useEffect(() => {
    if (open && openPhotoOnOpen) {
      setShowPhoto(true)
    }
  }, [open, openPhotoOnOpen])

  const onAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      await db.saveUserAvatar(user.id, dataUrl)
      setAvatar(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const removeAvatar = async () => {
    await db.deleteUserAvatar(user.id)
    setAvatar(null)
  }

  const saveProfile = async () => {
    setSaving(true)
    try {
      await db.updateUser({
        id: user.id,
        email,
        role: user.role,
        name,
        phone,
        address,
        created_at: user.created_at,
        farm_id: farmId || undefined,
        license_number: user.license_number,
      })
      // refresh session user so changes appear immediately across the app
      const refreshed = await db.getUserById(user.id)
      if (refreshed) {
        AuthManager.updateSessionUser(refreshed)
      }
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline" size="sm">Account</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>My Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full overflow-hidden bg-muted flex items-center justify-center">
              <button type="button" className="h-full w-full" onClick={() => setShowPhoto(true)}>
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <UserIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar">Profile Photo</Label>
              <Input id="avatar" type="file" accept="image/*" onChange={onAvatarSelected} />
              {avatar && (
                <Button type="button" variant="outline" size="sm" onClick={removeAvatar}>
                  Remove Photo
                </Button>
              )}
            </div>
          </div>

          {/* Photo Preview Dialog */}
          <Dialog open={showPhoto} onOpenChange={setShowPhoto}>
            <DialogContent className="max-w-2xl">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full overflow-hidden border" style={{ width: 200, height: 200 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-muted">
                      <UserIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <Button onClick={() => setShowDetails(true)} variant="outline">
                  Details
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Details Popup Card */}
          <Dialog open={showDetails} onOpenChange={setShowDetails}>
            <DialogContent className="max-w-xl">
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="text-lg font-semibold">Farmer Details</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span> {name}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span> {email}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phone:</span> {phone || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Address:</span> {address || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Farm ID:</span> {farmId || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Role:</span> {user.role}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Member Since:</span> {new Date(user.created_at).toLocaleDateString()}
                    </div>
                    {user.license_number && (
                      <div>
                        <span className="text-muted-foreground">License No.:</span> {user.license_number}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </DialogContent>
          </Dialog>

          <Card>
            <CardContent className="p-4 grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} disabled readOnly />
                <p className="text-xs text-muted-foreground">Email is managed by administrators. Contact support to change.</p>
              </div>
              {/* Email change request */}
              <div className="space-y-1">
                <Label htmlFor="new_email">Request Email Change</Label>
                <div className="flex gap-2">
                  <Input
                    id="new_email"
                    type="email"
                    placeholder="Enter new email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail) || newEmail.trim().toLowerCase() === email.trim().toLowerCase()}
                    onClick={async () => {
                      const req = await db.createEmailChangeRequest(user.id, newEmail.trim())
                      setEmailReqs((prev) => [req, ...prev])
                      setNewEmail("")
                    }}
                  >
                    Request Change
                  </Button>
                </div>
                {emailReqs.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Latest request: <span className="font-medium">{emailReqs[0].requested_email}</span> •
                    <span className={`ml-1 px-2 py-0.5 rounded ${emailReqs[0].status === "pending" ? "bg-amber-100 text-amber-700" : emailReqs[0].status === "approved" ? "bg-green-100 text-green-700" : "bg-rose-100 text-rose-700"}`}>{emailReqs[0].status}</span>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Role</Label>
                  <div className="text-sm text-muted-foreground capitalize">{user.role}</div>
                </div>
                {user.role === "farmer" && (
                  <div className="space-y-1">
                    <Label htmlFor="farm_id">Farm ID</Label>
                    <Input
                      id="farm_id"
                      value={farmId}
                      onChange={(e) => setFarmId(e.target.value)}
                      placeholder="e.g., FARM-12345"
                    />
                  </div>
                )}
                {user.license_number && (
                  <div>
                    <Label>License No.</Label>
                    <div className="text-sm text-muted-foreground">{user.license_number}</div>
                  </div>
                )}
                <div>
                  <Label>Member Since</Label>
                  <div className="text-sm text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</div>
                </div>
              </div>

              {/* KYC / Aadhaar Section */}
              <div className="mt-2 p-3 border rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-medium">Aadhaar / KYC</Label>
                  <span className={`text-xs px-2 py-0.5 rounded capitalize ${kycStatus === "verified" ? "bg-sky-100 text-sky-700" : kycStatus === "pending" ? "bg-amber-100 text-amber-700" : kycStatus === "rejected" ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-700"}`}>
                    {kycStatus || "unverified"}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                  <div className="md:col-span-2">
                    <Label htmlFor="aadhaar" className="text-xs">Aadhaar Number (12 digits)</Label>
                    <Input
                      id="aadhaar"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={12}
                      value={aadhaar}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 12)
                        setAadhaar(digits)
                      }}
                      disabled={kycStatus === "pending" || kycStatus === "verified"}
                      placeholder="Enter 12-digit Aadhaar"
                    />
                    <p
                      className={
                        "text-xs mt-1 " +
                        (aadhaar.length === 12
                          ? (isAadhaarValid(aadhaar) ? "text-green-600" : "text-rose-600")
                          : "text-muted-foreground")
                      }
                    >
                      {aadhaar.length === 12
                        ? (isAadhaarValid(aadhaar) ? "Checksum valid" : "Invalid Aadhaar (checksum failed)")
                        : "Only numbers allowed. Exactly 12 digits required."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      disabled={!aadhaar || aadhaar.length !== 12 || !isAadhaarValid(aadhaar) || kycStatus === "pending" || kycStatus === "verified"}
                      onClick={async () => {
                        await db.submitKyc(user.id, aadhaar)
                        const refreshed = await db.getUserById(user.id)
                        if (refreshed) {
                          setKycStatus(refreshed.kyc_status || "pending")
                          AuthManager.updateSessionUser(refreshed)
                        }
                      }}
                    >
                      {kycStatus === "rejected" ? "Resubmit for verification" : "Submit for verification"}
                    </Button>
                  </div>
                </div>

                {/* Aadhaar Document Upload */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
                  <div className="md:col-span-2">
                    <Label htmlFor="aadhaar_doc" className="text-xs">Upload Aadhaar Card (image or PDF as image)</Label>
                    <Input
                      id="aadhaar_doc"
                      type="file"
                      accept="image/*"
                      disabled={kycStatus === "verified"}
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = async () => {
                          const dataUrl = reader.result as string
                          await db.saveUserKycDocument(user.id, dataUrl)
                          setKycDoc(dataUrl)
                          // Compute simple SHA-256 hash of the data URL string (demo)
                          const enc = new TextEncoder()
                          const digest = await crypto.subtle.digest('SHA-256', enc.encode(dataUrl))
                          const hashHex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
                          await db.saveUserKycHash(user.id, hashHex)
                          setKycHash(hashHex)
                        }
                        reader.readAsDataURL(file)
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {kycDoc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <div className="flex flex-col items-start gap-1">
                        <img src={kycDoc} alt="Aadhaar" className="h-16 w-24 object-cover rounded border" />
                        {kycHash && (
                          <span className="text-[10px] text-muted-foreground break-all">hash: {kycHash.slice(0, 16)}…</span>
                        )}
                        {(kycStatus === "unverified" || kycStatus === "rejected") && (
                          <span className="text-[10px] text-muted-foreground">Re-uploading will overwrite the previous file.</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No document uploaded</span>
                    )}
                  </div>
                </div>
                {kycStatus === "verified" && (
                  <p className="text-xs text-sky-700 mt-2">Your identity is verified by admin.</p>
                )}
                {kycStatus === "pending" && (
                  <p className="text-xs text-amber-700 mt-2">Your verification is under review by admin.</p>
                )}
                {kycStatus === "rejected" && (
                  <p className="text-xs text-rose-700 mt-2">Verification was rejected. You can edit your Aadhaar and re-upload your document, then resubmit for verification.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            <Button onClick={saveProfile} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
