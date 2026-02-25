"use client"

import { useState, useEffect } from "react"
import type { User } from "@/lib/database"
import { db } from "@/lib/database"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Users, Search, UserPlus, Edit, Trash2, Shield, Eye } from "lucide-react"

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>("")
  const [form, setForm] = useState<{
    name: string
    email: string
    role: User["role"]
    phone?: string
    address?: string
    farm_id?: string
    license_number?: string
  }>({ name: "", email: "", role: "farmer" })
  const [editOpen, setEditOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null)
  const [viewKycOpen, setViewKycOpen] = useState(false)
  const [viewKycUser, setViewKycUser] = useState<User | null>(null)
  const [kycDocUrl, setKycDocUrl] = useState<string | null>(null)
  const [emailReqs, setEmailReqs] = useState<Array<{ id: number; user_id: number; current_email: string; requested_email: string; created_at: string }>>([])

  useEffect(() => {
    loadUsers()
    ;(async () => {
      const pending = await db.getPendingEmailChangeRequests().catch(() => [])
      setEmailReqs(pending)
    })()
  }, [])

  useEffect(() => {
    // Filter users based on search term
    const filtered = users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredUsers(filtered)
  }, [users, searchTerm])

  const loadUsers = async () => {
    try {
      const existing = await db.getAllUsers().catch(() => [])
      if (existing.length > 0) {
        setUsers(existing)
        return
      }
      // Seed defaults only if empty
      const mockUsers: Omit<User, "id" | "created_at">[] = [
        { 
          email: "farmer@demo.com", 
          role: "farmer", 
          name: "Ram Prasad", 
          phone: "+91-9876543210", 
          address: "Village Khandagiri, Bhubaneswar, Odisha", 
          farm_id: "FARM-001", 
          aadhaar: "123456789012",
          kyc_status: "pending",
          password_hash: undefined 
        },
        { 
          email: "distributor@demo.com", 
          role: "distributor", 
          name: "Logistics Solutions Pvt Ltd", 
          phone: "+91-9876543211", 
          address: "Industrial Area, Bhubaneswar, Odisha", 
          license_number: "DIST-2024-001", 
          aadhaar: "234567890123",
          kyc_status: "verified",
          kyc_verified_at: "2025-09-20T10:30:00Z",
          kyc_reviewer_id: 1,
          password_hash: undefined 
        },
        { 
          email: "retailer@demo.com", 
          role: "retailer", 
          name: "Fresh Mart Supermarket", 
          phone: "+91-9876543212", 
          address: "Market Complex, Cuttack, Odisha", 
          license_number: "RET-2024-001", 
          aadhaar: "345678901234",
          kyc_status: "pending",
          password_hash: undefined 
        },
        { 
          email: "consumer@demo.com", 
          role: "consumer", 
          name: "Priya Sharma", 
          phone: "+91-9876543213", 
          address: "Saheed Nagar, Bhubaneswar, Odisha", 
          aadhaar: "456789012345",
          kyc_status: "rejected",
          password_hash: undefined 
        },
      ]
      const created: User[] = []
      for (const u of mockUsers) {
        created.push(await db.createUser(u as any))
      }
      setUsers(created)
    } catch (error) {
      console.error("Failed to load users:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleBadgeColor = (role: User["role"]) => {
    switch (role) {
      case "farmer":
        return "bg-green-100 text-green-800"
      case "distributor":
        return "bg-blue-100 text-blue-800"
      case "retailer":
        return "bg-purple-100 text-purple-800"
      case "consumer":
        return "bg-orange-100 text-orange-800"
      case "admin":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getUserStats = () => {
    const stats = users.reduce(
      (acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
    return stats
  }

  const stats = getUserStats()

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(stats).map(([role, count]) => (
          <Card key={role}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{count}</div>
              <p className="text-sm text-muted-foreground capitalize">{role}s</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Email Change Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Email Change Requests
          </CardTitle>
          <CardDescription>Approve or reject pending email change requests</CardDescription>
        </CardHeader>
        <CardContent>
          {emailReqs.length === 0 ? (
            <div className="text-sm text-muted-foreground">No pending requests.</div>
          ) : (
            <div className="space-y-3">
              {emailReqs.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="text-sm">
                    <div className="font-medium">User #{r.user_id}</div>
                    <div className="text-muted-foreground">{r.current_email} → <span className="font-medium">{r.requested_email}</span></div>
                    <div className="text-xs text-muted-foreground">Requested: {new Date(r.created_at).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={async () => {
                      await db.approveEmailChangeRequest(r.id, 0)
                      const updatedUsers = await db.getAllUsers()
                      setUsers(updatedUsers)
                      const pending = await db.getPendingEmailChangeRequests()
                      setEmailReqs(pending)
                    }}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      await db.rejectEmailChangeRequest(r.id, 0)
                      const pending = await db.getPendingEmailChangeRequests()
                      setEmailReqs(pending)
                    }}>Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>Manage user accounts and permissions across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Actions */}
          <div className="flex items-center justify-between mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) { setError(""); } }}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm mb-1">Full Name</label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Email</label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Role</label>
                    <select
                      className="w-full border rounded px-3 py-2 bg-background"
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value as User["role"] })}
                    >
                      <option value="farmer">Farmer</option>
                      <option value="distributor">Distributor</option>
                      <option value="retailer">Retailer</option>
                      <option value="consumer">Consumer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm mb-1">Phone</label>
                      <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Address</label>
                      <Input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </div>
                  </div>
                  {form.role === "farmer" && (
                    <div>
                      <label className="block text-sm mb-1">Farm ID</label>
                      <Input value={form.farm_id || ""} onChange={(e) => setForm({ ...form, farm_id: e.target.value })} />
                    </div>
                  )}
                  {(form.role === "distributor" || form.role === "retailer") && (
                    <div>
                      <label className="block text-sm mb-1">License Number</label>
                      <Input value={form.license_number || ""} onChange={(e) => setForm({ ...form, license_number: e.target.value })} />
                    </div>
                  )}
                  {error && <div className="text-sm text-red-600">{error}</div>}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                    <Button disabled={saving} onClick={async () => {
                      setError("")
                      if (!form.name.trim() || !form.email.trim()) { setError("Name and Email are required"); return }
                      try {
                        setSaving(true)
                        const created = await db.createUser({
                          name: form.name.trim(),
                          email: form.email.trim(),
                          role: form.role,
                          phone: form.phone?.trim() || undefined,
                          address: form.address?.trim() || undefined,
                          farm_id: form.role === "farmer" ? (form.farm_id?.trim() || undefined) : undefined,
                          license_number: (form.role === "distributor" || form.role === "retailer") ? (form.license_number?.trim() || undefined) : undefined,
                          password_hash: undefined,
                        })
                        setUsers((prev) => [...prev, created])
                        setAddOpen(false)
                        setForm({ name: "", email: "", role: "farmer" })
                      } catch (e) {
                        console.error(e)
                        setError("Failed to add user")
                      } finally {
                        setSaving(false)
                      }
                    }}>{saving ? "Saving..." : "Add User"}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Users Table */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>KYC</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          {user.farm_id && <div className="text-sm text-muted-foreground">Farm: {user.farm_id}</div>}
                          {user.license_number && (
                            <div className="text-sm text-muted-foreground">License: {user.license_number}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)}>{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded capitalize ${user.kyc_status === "verified" ? "bg-sky-100 text-sky-700" : user.kyc_status === "pending" ? "bg-amber-100 text-amber-700" : user.kyc_status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-700"}`}>
                          {user.kyc_status || "unverified"}
                        </span>
                      </TableCell>
                      <TableCell>{user.phone || "N/A"}</TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setEditUser(user); setEditOpen(true) }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const doc = await db.getUserKycDocument(user.id)
                              setViewKycUser(user)
                              setKycDocUrl(doc)
                              setViewKycOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" /> View KYC
                          </Button>
                          {user.kyc_status === "pending" && (
                            <>
                              <Button variant="outline" size="sm" onClick={async () => {
                                await db.setKycStatus(user.id, "verified", 0)
                                setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, kyc_status: "verified", kyc_verified_at: new Date().toISOString(), kyc_reviewer_id: 0 } : u))
                              }}>Approve KYC</Button>
                              <Button variant="outline" size="sm" onClick={async () => {
                                await db.setKycStatus(user.id, "rejected", 0)
                                setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, kyc_status: "rejected", kyc_verified_at: undefined, kyc_reviewer_id: 0 } : u))
                              }}>Reject KYC</Button>
                            </>
                          )}
                          <Button variant="outline" size="sm" onClick={() => { setDeleteUserId(user.id); setDeleteOpen(true) }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Full Name</label>
                <Input value={editUser.name} onChange={(e) => setEditUser((prev) => (prev ? { ...prev, name: e.target.value } : prev))} />
              </div>
              <div>
                <label className="block text-sm mb-1">Email</label>
                <Input type="email" value={editUser.email} onChange={(e) => setEditUser((prev) => (prev ? { ...prev, email: e.target.value } : prev))} />
              </div>
              <div>
                <label className="block text-sm mb-1">Phone</label>
                <Input value={editUser.phone || ""} onChange={(e) => setEditUser((prev) => (prev ? { ...prev, phone: e.target.value } : prev))} />
              </div>
              <div>
                <label className="block text-sm mb-1">Address</label>
                <Input value={editUser.address || ""} onChange={(e) => setEditUser((prev) => (prev ? { ...prev, address: e.target.value } : prev))} />
              </div>
              {editUser.role === "farmer" && (
                <div>
                  <label className="block text-sm mb-1">Farm ID</label>
                  <Input value={editUser.farm_id || ""} onChange={(e) => setEditUser((prev) => (prev ? { ...prev, farm_id: e.target.value } : prev))} />
                </div>
              )}
              {(editUser.role === "distributor" || editUser.role === "retailer") && (
                <div>
                  <label className="block text-sm mb-1">License Number</label>
                  <Input value={editUser.license_number || ""} onChange={(e) => setEditUser((prev) => (prev ? { ...prev, license_number: e.target.value } : prev))} />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button disabled={editSaving} onClick={async () => {
                  if (!editUser) return
                  try {
                    setEditSaving(true)
                    await db.updateUser(editUser)
                    setUsers((prev) => prev.map((u) => (u.id === editUser.id ? editUser : u)))
                    setEditOpen(false)
                  } finally {
                    setEditSaving(false)
                  }
                }}>{editSaving ? "Saving..." : "Save Changes"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">This action cannot be undone.</div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              if (deleteUserId == null) return
              await db.deleteUser(deleteUserId)
              setUsers((prev) => prev.filter((u) => u.id !== deleteUserId))
              setDeleteOpen(false)
              setDeleteUserId(null)
            }}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View KYC Document */}
      <Dialog open={viewKycOpen} onOpenChange={setViewKycOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>View KYC Document {viewKycUser ? `- ${viewKycUser.name}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Aadhaar Number Section */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="font-semibold text-sm mb-2">Aadhaar Number</h4>
              {viewKycUser?.aadhaar ? (
                <div className="font-mono text-lg tracking-wider">
                  {viewKycUser.aadhaar.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No Aadhaar number provided</div>
              )}
            </div>
            
            {/* Document Image Section */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="font-semibold text-sm mb-2">Aadhaar Document</h4>
              {kycDocUrl ? (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={kycDocUrl} 
                    alt="Aadhaar Document" 
                    className="max-w-full max-h-[60vh] object-contain rounded border shadow-sm" 
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-sm text-muted-foreground">No image uploaded</div>
                </div>
              )}
            </div>
            
            {/* KYC Status Section */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="font-semibold text-sm mb-2">KYC Status</h4>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded capitalize font-medium ${
                  viewKycUser?.kyc_status === "verified" 
                    ? "bg-green-100 text-green-700" 
                    : viewKycUser?.kyc_status === "pending" 
                    ? "bg-yellow-100 text-yellow-700" 
                    : viewKycUser?.kyc_status === "rejected" 
                    ? "bg-red-100 text-red-700" 
                    : "bg-gray-100 text-gray-700"
                }`}>
                  {viewKycUser?.kyc_status || "unverified"}
                </span>
                {viewKycUser?.kyc_verified_at && (
                  <span className="text-xs text-muted-foreground">
                    Verified on {new Date(viewKycUser.kyc_verified_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setViewKycOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
