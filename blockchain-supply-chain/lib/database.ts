// Database connection and query utilities
// This simulates blockchain operations using a traditional database

export interface User {
  id: number
  email: string
  role: "farmer" | "distributor" | "retailer" | "consumer" | "admin"
  name: string
  phone?: string
  address?: string
  farm_id?: string
  license_number?: string
  // KYC fields (demo): store minimal info for Aadhaar verification flow
  aadhaar?: string
  kyc_status?: "unverified" | "pending" | "verified" | "rejected"
  kyc_verified_at?: string
  kyc_reviewer_id?: number
  // Stored only for demo purposes; in production use a secure auth backend
  password_hash?: string
  created_at: string
}

export interface EmailChangeRequest {
  id: number
  user_id: number
  current_email: string
  requested_email: string
  status: "pending" | "approved" | "rejected"
  created_at: string
  reviewed_at?: string
  reviewer_id?: number
}

export interface TradeRequest {
  id: number
  product_id: string
  seller_id: number
  buyer_id: number
  offered_price: number | null
  quantity_kg: number
  status: "pending" | "approved" | "rejected"
  created_at: string
}

export interface PurchaseRequest {
  id: number
  product_id: string
  retailer_id: number
  consumer_id: number
  requested_price: number | null
  quantity_kg: number
  status: "pending" | "approved" | "rejected"
  created_at: string
}

export interface Product {
  id: number
  product_id: string
  farmer_id: number
  crop_type: string
  variety?: string
  harvest_date: string
  quantity_kg: number
  current_owner_id: number
  current_status: "harvested" | "packed" | "dispatched" | "received" | "for_sale" | "sold" | "dispute"
  qr_code?: string
  metadata_hash?: string
  created_at: string
  updated_at: string
}

export interface ProductEvent {
  id: number
  product_id: string
  actor_id: number
  event_type: "created" | "packed" | "dispatched" | "received" | "listed" | "sold" | "quality_check" | "dispute_raised"
  status: string
  price?: number
  location?: string
  notes?: string
  metadata_hash?: string
  timestamp: string
}

export interface QualityCertificate {
  id: number
  product_id: string
  certificate_type: string
  value?: string
  unit?: string
  issued_by: string
  issued_date: string
  certificate_hash?: string
}

// Simulated blockchain operations
export class BlockchainSimulator {
  // Generate a unique product ID
  static generateProductId(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")
    return `AGR-OD-${date}-${random}`
  }

  // Generate a content hash (simulates blockchain hashing)
  static generateHash(content: string): string {
    // Simple hash simulation - in real blockchain this would be keccak256 or similar
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(16, "0")
  }

  // Generate QR code identifier
  static generateQRCode(productId: string): string {
    return `QR-${productId}-${Date.now()}`
  }

  // Simulate smart contract event emission
  static emitEvent(eventType: string, data: any) {
    console.log(`[Blockchain Event] ${eventType}:`, data)
    // In real implementation, this would emit to blockchain
  }
}

// Mock database operations (in real app, these would connect to actual database)
// Predefined admin account (hardcoded, cannot be changed by users)
const PREDEFINED_ADMIN: User = {
  id: 999999,
  email: "admin@gmail.com",
  role: "admin",
  name: "System Administrator",
  password_hash: "272f9e93", // Hash of "admin@1234"
  created_at: new Date().toISOString(),
}

export const db = {
  // User operations
  async createUser(userData: Omit<User, "id" | "created_at">): Promise<User> {
    // Prevent creating admin account with same email as predefined admin
    if (userData.email === PREDEFINED_ADMIN.email) {
      throw new Error("This email is reserved for system administrator")
    }

    const user: User = {
      id: Math.floor(Math.random() * 10000),
      ...userData,
      created_at: new Date().toISOString(),
    }

    // Store in localStorage for demo
    const users = JSON.parse(localStorage.getItem("users") || "[]")
    users.push(user)
    localStorage.setItem("users", JSON.stringify(users))

    return user
  },

  async getAllUsers(): Promise<User[]> {
    return JSON.parse(localStorage.getItem("users") || "[]")
  },

  async updateUser(user: User): Promise<void> {
    // Prevent updating the predefined admin account
    if (user.email === PREDEFINED_ADMIN.email) {
      throw new Error("Cannot modify system administrator account")
    }

    const users: User[] = JSON.parse(localStorage.getItem("users") || "[]")
    const idx = users.findIndex((u) => u.id === user.id)
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...user }
      localStorage.setItem("users", JSON.stringify(users))
    }
  },

  // KYC submission by user (sets status to pending)
  async submitKyc(userId: number, aadhaar: string): Promise<void> {
    const users: User[] = JSON.parse(localStorage.getItem("users") || "[]")
    const idx = users.findIndex((u) => u.id === userId)
    if (idx !== -1) {
      users[idx] = {
        ...users[idx],
        aadhaar,
        kyc_status: "pending",
        kyc_verified_at: undefined,
        kyc_reviewer_id: undefined,
      }
      localStorage.setItem("users", JSON.stringify(users))
    }
  },

  // Admin sets KYC status (verified or rejected)
  async setKycStatus(userId: number, status: "verified" | "rejected", reviewerId: number): Promise<void> {
    const users: User[] = JSON.parse(localStorage.getItem("users") || "[]")
    const idx = users.findIndex((u) => u.id === userId)
    if (idx !== -1) {
      users[idx] = {
        ...users[idx],
        kyc_status: status,
        kyc_verified_at: status === "verified" ? new Date().toISOString() : undefined,
        kyc_reviewer_id: reviewerId,
      }
      localStorage.setItem("users", JSON.stringify(users))
    }
  },

  async deleteUser(userId: number): Promise<void> {
    const users: User[] = JSON.parse(localStorage.getItem("users") || "[]")
    const next = users.filter((u) => u.id !== userId)
    localStorage.setItem("users", JSON.stringify(next))
  },

  // Product images (stored as data URLs for demo)
  async saveProductImages(productId: string, imagesDataUrls: string[]): Promise<void> {
    const store = JSON.parse(localStorage.getItem("product_images") || "{}")
    store[productId] = imagesDataUrls
    localStorage.setItem("product_images", JSON.stringify(store))
  },

  async getProductImages(productId: string): Promise<string[]> {
    const store = JSON.parse(localStorage.getItem("product_images") || "{}")
    return store[productId] || []
  },

  // User avatar (stored as data URL for demo)
  async saveUserAvatar(userId: number, dataUrl: string): Promise<void> {
    const store = JSON.parse(localStorage.getItem("user_avatars") || "{}")
    store[userId] = dataUrl
    localStorage.setItem("user_avatars", JSON.stringify(store))
  },

  async getUserAvatar(userId: number): Promise<string | null> {
    const store = JSON.parse(localStorage.getItem("user_avatars") || "{}")
    return store[userId] || null
  },

  async deleteUserAvatar(userId: number): Promise<void> {
    const store = JSON.parse(localStorage.getItem("user_avatars") || "{}")
    if (store[userId]) {
      delete store[userId]
      localStorage.setItem("user_avatars", JSON.stringify(store))
    }
  },

  // KYC document (Aadhaar) stored as data URL for demo
  async saveUserKycDocument(userId: number, dataUrl: string): Promise<void> {
    const store = JSON.parse(localStorage.getItem("user_kyc_docs") || "{}")
    store[userId] = dataUrl
    localStorage.setItem("user_kyc_docs", JSON.stringify(store))
  },

  async getUserKycDocument(userId: number): Promise<string | null> {
    const store = JSON.parse(localStorage.getItem("user_kyc_docs") || "{}")
    return store[userId] || null
  },

  async saveUserKycHash(userId: number, hashHex: string): Promise<void> {
    const store = JSON.parse(localStorage.getItem("user_kyc_hashes") || "{}")
    store[userId] = hashHex
    localStorage.setItem("user_kyc_hashes", JSON.stringify(store))
  },

  async getUserKycHash(userId: number): Promise<string | null> {
    const store = JSON.parse(localStorage.getItem("user_kyc_hashes") || "{}")
    return store[userId] || null
  },

  // Helpers for product lookup and splitting quantities
  async getProductByProductId(productId: string): Promise<Product | null> {
    const products = JSON.parse(localStorage.getItem("products") || "[]")
    return products.find((p: Product) => p.product_id === productId) || null
  },

  async updateProduct(product: Product): Promise<void> {
    const products = JSON.parse(localStorage.getItem("products") || "[]")
    const idx = products.findIndex((p: Product) => p.id === product.id)
    if (idx !== -1) {
      products[idx] = { ...product, updated_at: new Date().toISOString() }
      localStorage.setItem("products", JSON.stringify(products))
    }
  },

  async splitProductToBuyer(params: {
    product_id: string
    quantity_kg: number
    buyer_id: number
    buyer_status: Product["current_status"]
  }): Promise<Product> {
    const products = JSON.parse(localStorage.getItem("products") || "[]")
    const idx = products.findIndex((p: Product) => p.product_id === params.product_id)
    if (idx === -1) throw new Error("Product not found")
    const source: Product = products[idx]
    if (source.quantity_kg < params.quantity_kg) throw new Error("Insufficient quantity to split")

    // Deduct from source
    products[idx].quantity_kg = Number((source.quantity_kg - params.quantity_kg).toFixed(3))
    products[idx].updated_at = new Date().toISOString()

    // Create new product representing the split portion
    const newProductId = `${source.product_id}-part-${Math.floor(Math.random() * 10000)}`
    const newProduct: Product = {
      id: Math.floor(Math.random() * 1000000),
      product_id: newProductId,
      farmer_id: source.farmer_id,
      crop_type: source.crop_type,
      variety: source.variety,
      harvest_date: source.harvest_date,
      quantity_kg: params.quantity_kg,
      current_owner_id: params.buyer_id,
      current_status: params.buyer_status,
      qr_code: source.qr_code,
      metadata_hash: source.metadata_hash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    products.push(newProduct)
    localStorage.setItem("products", JSON.stringify(products))
    return newProduct
  },

  // Generic Trade Requests (retailer <-> distributor, distributor <-> farmer)
  async createTradeRequest(data: Omit<TradeRequest, "id" | "created_at" | "status">): Promise<TradeRequest> {
    const requests = JSON.parse(localStorage.getItem("trade_requests") || "[]")
    const req: TradeRequest = {
      id: Math.floor(Math.random() * 1000000),
      product_id: data.product_id,
      seller_id: data.seller_id,
      buyer_id: data.buyer_id,
      offered_price: data.offered_price ?? null,
      quantity_kg: data.quantity_kg,
      status: "pending",
      created_at: new Date().toISOString(),
    }
    requests.push(req)
    localStorage.setItem("trade_requests", JSON.stringify(requests))
    return req
  },

  async findPendingTradeRequest(params: { product_id: string; buyer_id: number; seller_id?: number }): Promise<TradeRequest | null> {
    const requests = JSON.parse(localStorage.getItem("trade_requests") || "[]")
    const match = requests.find((r: TradeRequest) =>
      r.product_id === params.product_id &&
      r.buyer_id === params.buyer_id &&
      r.status === "pending" &&
      (params.seller_id == null || r.seller_id === params.seller_id)
    )
    return match || null
  },

  async upsertTradeRequest(data: Omit<TradeRequest, "id" | "created_at" | "status">): Promise<TradeRequest> {
    const requests: TradeRequest[] = JSON.parse(localStorage.getItem("trade_requests") || "[]")
    const idx = requests.findIndex(
      (r) => r.product_id === data.product_id && r.buyer_id === data.buyer_id && r.seller_id === data.seller_id && r.status === "pending"
    )
    if (idx !== -1) {
      // Update the existing pending request with the latest quantity and offered price
      requests[idx] = {
        ...requests[idx],
        quantity_kg: data.quantity_kg,
        offered_price: data.offered_price ?? null,
      }
      localStorage.setItem("trade_requests", JSON.stringify(requests))
      return requests[idx]
    }
    // Else create new pending request
    const req: TradeRequest = {
      id: Math.floor(Math.random() * 1000000),
      product_id: data.product_id,
      seller_id: data.seller_id,
      buyer_id: data.buyer_id,
      offered_price: data.offered_price ?? null,
      quantity_kg: data.quantity_kg,
      status: "pending",
      created_at: new Date().toISOString(),
    }
    requests.push(req)
    localStorage.setItem("trade_requests", JSON.stringify(requests))
    return req
  },

  async getTradeRequestsForSeller(sellerId: number): Promise<TradeRequest[]> {
    const requests = JSON.parse(localStorage.getItem("trade_requests") || "[]")
    return requests.filter((r: TradeRequest) => r.seller_id === sellerId && r.status === "pending")
  },

  async getTradeRequestsByBuyer(buyerId: number): Promise<TradeRequest[]> {
    const requests = JSON.parse(localStorage.getItem("trade_requests") || "[]")
    return requests.filter((r: TradeRequest) => r.buyer_id === buyerId)
  },

  async updateTradeRequestStatus(requestId: number, status: TradeRequest["status"]): Promise<void> {
    const requests = JSON.parse(localStorage.getItem("trade_requests") || "[]")
    const idx = requests.findIndex((r: TradeRequest) => r.id === requestId)
    if (idx !== -1) {
      requests[idx].status = status
      localStorage.setItem("trade_requests", JSON.stringify(requests))
    }
  },

  // Purchase requests (consumer -> retailer)
  async createPurchaseRequest(data: Omit<PurchaseRequest, "id" | "created_at" | "status">): Promise<PurchaseRequest> {
    const requests = JSON.parse(localStorage.getItem("purchase_requests") || "[]")
    const request: PurchaseRequest = {
      id: Math.floor(Math.random() * 1000000),
      product_id: data.product_id,
      retailer_id: data.retailer_id,
      consumer_id: data.consumer_id,
      requested_price: data.requested_price ?? null,
      quantity_kg: data.quantity_kg,
      status: "pending",
      created_at: new Date().toISOString(),
    }
    requests.push(request)
    localStorage.setItem("purchase_requests", JSON.stringify(requests))
    return request
  },

  async getPurchaseRequestsForRetailer(retailerId: number): Promise<PurchaseRequest[]> {
    const requests = JSON.parse(localStorage.getItem("purchase_requests") || "[]")
    return requests.filter((r: PurchaseRequest) => r.retailer_id === retailerId && r.status === "pending")
  },

  async getPurchaseRequestsByConsumer(consumerId: number): Promise<PurchaseRequest[]> {
    const requests = JSON.parse(localStorage.getItem("purchase_requests") || "[]")
    return requests.filter((r: PurchaseRequest) => r.consumer_id === consumerId)
  },

  async updatePurchaseRequestStatus(requestId: number, status: PurchaseRequest["status"]): Promise<void> {
    const requests = JSON.parse(localStorage.getItem("purchase_requests") || "[]")
    const idx = requests.findIndex((r: PurchaseRequest) => r.id === requestId)
    if (idx !== -1) {
      requests[idx].status = status
      localStorage.setItem("purchase_requests", JSON.stringify(requests))
    }
  },

  async getUserByEmail(email: string): Promise<User | null> {
    // Check if it's the predefined admin account
    if (email === PREDEFINED_ADMIN.email) {
      return PREDEFINED_ADMIN
    }

    const users = JSON.parse(localStorage.getItem("users") || "[]")
    return users.find((u: User) => u.email === email) || null
  },

  async getUserById(id: number): Promise<User | null> {
    const users = JSON.parse(localStorage.getItem("users") || "[]")
    return users.find((u: User) => u.id === id) || null
  },

  async getUsersByRole(role: User["role"]): Promise<User[]> {
    const users = JSON.parse(localStorage.getItem("users") || "[]")
    return users.filter((u: User) => u.role === role)
  },

  // Email change requests
  async createEmailChangeRequest(userId: number, newEmail: string): Promise<EmailChangeRequest> {
    const users: User[] = JSON.parse(localStorage.getItem("users") || "[]")
    const user = users.find((u) => u.id === userId)
    if (!user) throw new Error("User not found")
    const store: EmailChangeRequest[] = JSON.parse(localStorage.getItem("email_change_requests") || "[]")
    // If there is an existing pending request for this user, replace it
    const next = store.filter((r) => !(r.user_id === userId && r.status === "pending"))
    const req: EmailChangeRequest = {
      id: Math.floor(Math.random() * 1000000),
      user_id: userId,
      current_email: user.email,
      requested_email: newEmail,
      status: "pending",
      created_at: new Date().toISOString(),
    }
    next.push(req)
    localStorage.setItem("email_change_requests", JSON.stringify(next))
    return req
  },

  async getEmailChangeRequests(): Promise<EmailChangeRequest[]> {
    return JSON.parse(localStorage.getItem("email_change_requests") || "[]")
  },

  async getPendingEmailChangeRequests(): Promise<EmailChangeRequest[]> {
    const all: EmailChangeRequest[] = JSON.parse(localStorage.getItem("email_change_requests") || "[]")
    return all.filter((r) => r.status === "pending")
  },

  async getEmailChangeRequestsByUser(userId: number): Promise<EmailChangeRequest[]> {
    const all: EmailChangeRequest[] = JSON.parse(localStorage.getItem("email_change_requests") || "[]")
    return all.filter((r) => r.user_id === userId)
  },

  async approveEmailChangeRequest(requestId: number, reviewerId: number): Promise<void> {
    const reqs: EmailChangeRequest[] = JSON.parse(localStorage.getItem("email_change_requests") || "[]")
    const users: User[] = JSON.parse(localStorage.getItem("users") || "[]")
    const idx = reqs.findIndex((r) => r.id === requestId)
    if (idx === -1) throw new Error("Request not found")
    const req = reqs[idx]
    // update user email
    const uIdx = users.findIndex((u) => u.id === req.user_id)
    if (uIdx !== -1) {
      users[uIdx].email = req.requested_email
      localStorage.setItem("users", JSON.stringify(users))
    }
    reqs[idx] = { ...req, status: "approved", reviewed_at: new Date().toISOString(), reviewer_id: reviewerId }
    localStorage.setItem("email_change_requests", JSON.stringify(reqs))
  },

  async rejectEmailChangeRequest(requestId: number, reviewerId: number): Promise<void> {
    const reqs: EmailChangeRequest[] = JSON.parse(localStorage.getItem("email_change_requests") || "[]")
    const idx = reqs.findIndex((r) => r.id === requestId)
    if (idx === -1) throw new Error("Request not found")
    const req = reqs[idx]
    reqs[idx] = { ...req, status: "rejected", reviewed_at: new Date().toISOString(), reviewer_id: reviewerId }
    localStorage.setItem("email_change_requests", JSON.stringify(reqs))
  },

  // Product operations
  async createProduct(productData: Omit<Product, "id" | "created_at" | "updated_at">): Promise<Product> {
    const product: Product = {
      id: Math.floor(Math.random() * 10000),
      ...productData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const products = JSON.parse(localStorage.getItem("products") || "[]")
    products.push(product)
    localStorage.setItem("products", JSON.stringify(products))

    // Emit blockchain event
    BlockchainSimulator.emitEvent("ProductCreated", {
      productId: product.product_id,
      farmer: product.farmer_id,
      timestamp: product.created_at,
    })

    return product
  },

  async getProductById(productId: string): Promise<Product | null> {
    const products = JSON.parse(localStorage.getItem("products") || "[]")
    return products.find((p: Product) => p.product_id === productId) || null
  },

  async getProductsByOwner(ownerId: number): Promise<Product[]> {
    const products = JSON.parse(localStorage.getItem("products") || "[]")
    return products.filter((p: Product) => p.current_owner_id === ownerId)
  },

  async getAllProducts(): Promise<Product[]> {
    const products = JSON.parse(localStorage.getItem("products") || "[]")
    // Auto-convert harvested products to for_sale for backward compatibility
    return products.map((product: Product) => {
      if (product.current_status === "harvested") {
        return { ...product, current_status: "for_sale" }
      }
      return product
    })
  },

  async updateProductOwner(productId: string, newOwnerId: number, status: Product["current_status"]): Promise<void> {
    const products = JSON.parse(localStorage.getItem("products") || "[]")
    const productIndex = products.findIndex((p: Product) => p.product_id === productId)

    if (productIndex !== -1) {
      products[productIndex].current_owner_id = newOwnerId
      products[productIndex].current_status = status
      products[productIndex].updated_at = new Date().toISOString()
      localStorage.setItem("products", JSON.stringify(products))

      // Emit blockchain event
      BlockchainSimulator.emitEvent("OwnershipTransferred", {
        productId,
        newOwner: newOwnerId,
        status,
        timestamp: new Date().toISOString(),
      })
    }
  },

  async deleteProduct(productId: string): Promise<void> {
    // Delete the product
    const products = JSON.parse(localStorage.getItem("products") || "[]")
    const filteredProducts = products.filter((p: Product) => p.product_id !== productId)
    localStorage.setItem("products", JSON.stringify(filteredProducts))

    // Delete related product events
    const events = JSON.parse(localStorage.getItem("product_events") || "[]")
    const filteredEvents = events.filter((e: ProductEvent) => e.product_id !== productId)
    localStorage.setItem("product_events", JSON.stringify(filteredEvents))

    // Delete related product images
    const images = JSON.parse(localStorage.getItem("product_images") || "{}")
    if (images[productId]) {
      delete images[productId]
      localStorage.setItem("product_images", JSON.stringify(images))
    }

    // Delete related quality certificates
    const certificates = JSON.parse(localStorage.getItem("quality_certificates") || "[]")
    const filteredCertificates = certificates.filter((c: QualityCertificate) => c.product_id !== productId)
    localStorage.setItem("quality_certificates", JSON.stringify(filteredCertificates))

    // Delete related trade requests
    const tradeRequests = JSON.parse(localStorage.getItem("trade_requests") || "[]")
    const filteredTradeRequests = tradeRequests.filter((r: TradeRequest) => r.product_id !== productId)
    localStorage.setItem("trade_requests", JSON.stringify(filteredTradeRequests))

    // Delete related purchase requests
    const purchaseRequests = JSON.parse(localStorage.getItem("purchase_requests") || "[]")
    const filteredPurchaseRequests = purchaseRequests.filter((r: PurchaseRequest) => r.product_id !== productId)
    localStorage.setItem("purchase_requests", JSON.stringify(filteredPurchaseRequests))

    // Emit blockchain event
    BlockchainSimulator.emitEvent("ProductDeleted", {
      productId,
      timestamp: new Date().toISOString(),
    })
  },

  // Product event operations
  async createProductEvent(eventData: Omit<ProductEvent, "id" | "timestamp">): Promise<ProductEvent> {
    const event: ProductEvent = {
      id: Math.floor(Math.random() * 10000),
      ...eventData,
      timestamp: new Date().toISOString(),
    }

    const events = JSON.parse(localStorage.getItem("product_events") || "[]")
    events.push(event)
    localStorage.setItem("product_events", JSON.stringify(events))

    return event
  },

  async getProductEvents(productId: string): Promise<ProductEvent[]> {
    const events = JSON.parse(localStorage.getItem("product_events") || "[]")
    return events
      .filter((e: ProductEvent) => e.product_id === productId)
      .sort((a: ProductEvent, b: ProductEvent) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  },

  async getEventsByActor(actorId: number): Promise<ProductEvent[]> {
    const events = JSON.parse(localStorage.getItem("product_events") || "[]")
    return events
      .filter((e: ProductEvent) => e.actor_id === actorId)
      .sort((a: ProductEvent, b: ProductEvent) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  },

  async getLatestListedPrice(productId: string): Promise<number | null> {
    const events = await db.getProductEvents(productId)
    const listed = events
      .filter((e: ProductEvent) => e.event_type === "listed" && typeof e.price === "number")
      .sort((a: ProductEvent, b: ProductEvent) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return listed.length > 0 ? (listed[0].price as number) : null
  },

  // Calculate proportional price for partial quantity purchases
  async calculateProportionalPriceForProduct(productId: string, requestedQuantityKg: number): Promise<{
    pricePerKg: number;
    proportionalPrice: number;
    totalPrice: number;
    totalQuantityKg: number;
  } | null> {
    try {
      const product = await db.getProductByProductId(productId);
      if (!product) return null;
      
      const totalPrice = await db.getLatestListedPrice(productId);
      if (totalPrice === null) return null;
      
      if (requestedQuantityKg > product.quantity_kg) {
        throw new Error(`Requested quantity (${requestedQuantityKg}kg) exceeds available quantity (${product.quantity_kg}kg)`);
      }
      
      const pricePerKg = Math.round((totalPrice / product.quantity_kg) * 100) / 100;
      const proportionalPrice = Math.round((pricePerKg * requestedQuantityKg) * 100) / 100;
      
      return {
        pricePerKg,
        proportionalPrice,
        totalPrice,
        totalQuantityKg: product.quantity_kg
      };
    } catch (error) {
      console.error("Error calculating proportional price:", error);
      return null;
    }
  },

  // Quality certificate operations
  async createQualityCertificate(certData: Omit<QualityCertificate, "id">): Promise<QualityCertificate> {
    const certificate: QualityCertificate = {
      id: Math.floor(Math.random() * 10000),
      ...certData,
    }

    const certificates = JSON.parse(localStorage.getItem("quality_certificates") || "[]")
    certificates.push(certificate)
    localStorage.setItem("quality_certificates", JSON.stringify(certificates))

    return certificate
  },

  async getProductCertificates(productId: string): Promise<QualityCertificate[]> {
    const certificates = JSON.parse(localStorage.getItem("quality_certificates") || "[]")
    return certificates.filter((c: QualityCertificate) => c.product_id === productId)
  },
}
