// Test data for demonstrating proportional pricing system
import { db } from './database'

export async function seedTestData() {
  try {
    // Clear existing data
    localStorage.removeItem('products')
    localStorage.removeItem('product_events')
    
    // Create test farmer
    const farmer = await db.createUser({
      email: "test-farmer@demo.com",
      role: "farmer",
      name: "Ravi Kumar",
      phone: "+91-9876543210",
      address: "Village Khandagiri, Bhubaneswar, Odisha",
      farm_id: "FARM-TEST-001",
      aadhaar: "123456789012",
      kyc_status: "verified",
      kyc_verified_at: "2025-09-20T10:30:00Z",
      kyc_reviewer_id: 1,
      password_hash: undefined
    })

    // Create test distributor
    const distributor = await db.createUser({
      email: "test-distributor@demo.com",
      role: "distributor",
      name: "AgriLogistics Pvt Ltd",
      phone: "+91-9876543211",
      address: "Industrial Area, Bhubaneswar, Odisha",
      license_number: "DIST-TEST-001",
      aadhaar: "234567890123",
      kyc_status: "verified",
      kyc_verified_at: "2025-09-20T10:30:00Z",
      kyc_reviewer_id: 1,
      password_hash: undefined
    })

    // Create test retailer
    const retailer = await db.createUser({
      email: "test-retailer@demo.com",
      role: "retailer",
      name: "Fresh Market Store",
      phone: "+91-9876543212",
      address: "Market Complex, Cuttack, Odisha",
      license_number: "RET-TEST-001",
      aadhaar: "345678901234",
      kyc_status: "verified",
      kyc_verified_at: "2025-09-20T10:30:00Z",
      kyc_reviewer_id: 1,
      password_hash: undefined
    })

    // Example 1: 150kg Rice for ₹250,000 (₹1,666.67 per kg)
    const riceProduct = await db.createProduct({
      product_id: "AGR-OD-20250924-RICE150",
      farmer_id: farmer.id,
      crop_type: "Rice",
      variety: "Basmati",
      harvest_date: "2025-09-20",
      quantity_kg: 150,
      current_owner_id: farmer.id,
      current_status: "for_sale",
      qr_code: "QR-AGR-OD-20250924-RICE150",
      metadata_hash: "abc123"
    })

    // Create listing event for rice
    await db.createProductEvent({
      product_id: riceProduct.product_id,
      actor_id: farmer.id,
      event_type: "listed",
      status: "for_sale",
      price: 250000, // Total price for 150kg
      location: "Bhubaneswar, Odisha",
      notes: "Premium Basmati Rice - 150kg total at ₹250,000 (₹1,666.67/kg)"
    })

    // Example 2: 100kg Wheat for ₹180,000 (₹1,800 per kg)
    const wheatProduct = await db.createProduct({
      product_id: "AGR-OD-20250924-WHEAT100",
      farmer_id: farmer.id,
      crop_type: "Wheat",
      variety: "Durum",
      harvest_date: "2025-09-18",
      quantity_kg: 100,
      current_owner_id: farmer.id,
      current_status: "for_sale",
      qr_code: "QR-AGR-OD-20250924-WHEAT100",
      metadata_hash: "def456"
    })

    // Create listing event for wheat
    await db.createProductEvent({
      product_id: wheatProduct.product_id,
      actor_id: farmer.id,
      event_type: "listed",
      status: "for_sale",
      price: 180000, // Total price for 100kg
      location: "Bhubaneswar, Odisha",
      notes: "Premium Durum Wheat - 100kg total at ₹180,000 (₹1,800/kg)"
    })

    // Example 3: 75kg Tomatoes for ₹45,000 (₹600 per kg)
    const tomatoProduct = await db.createProduct({
      product_id: "AGR-OD-20250924-TOMATO75",
      farmer_id: farmer.id,
      crop_type: "Tomato",
      variety: "Cherry",
      harvest_date: "2025-09-22",
      quantity_kg: 75,
      current_owner_id: farmer.id,
      current_status: "for_sale",
      qr_code: "QR-AGR-OD-20250924-TOMATO75",
      metadata_hash: "ghi789"
    })

    // Create listing event for tomatoes
    await db.createProductEvent({
      product_id: tomatoProduct.product_id,
      actor_id: farmer.id,
      event_type: "listed",
      status: "for_sale",
      price: 45000, // Total price for 75kg
      location: "Bhubaneswar, Odisha",
      notes: "Fresh Cherry Tomatoes - 75kg total at ₹45,000 (₹600/kg)"
    })

    console.log("✅ Test data seeded successfully!")
    console.log("📊 Pricing Examples:")
    console.log("1. Rice: 150kg @ ₹250,000 total = ₹1,666.67/kg")
    console.log("   - If distributor wants 50kg: 50 × ₹1,666.67 = ₹83,333.50")
    console.log("2. Wheat: 100kg @ ₹180,000 total = ₹1,800/kg")
    console.log("   - If distributor wants 30kg: 30 × ₹1,800 = ₹54,000")
    console.log("3. Tomatoes: 75kg @ ₹45,000 total = ₹600/kg")
    console.log("   - If distributor wants 25kg: 25 × ₹600 = ₹15,000")

    return {
      farmer,
      distributor,
      retailer,
      products: [riceProduct, wheatProduct, tomatoProduct]
    }
  } catch (error) {
    console.error("❌ Error seeding test data:", error)
    throw error
  }
}

// Function to demonstrate pricing calculations
export async function demonstratePricing() {
  const examples = [
    {
      productId: "AGR-OD-20250924-RICE150",
      scenarios: [
        { quantity: 50, description: "Distributor wants 50kg from 150kg rice" },
        { quantity: 25, description: "Retailer wants 25kg from remaining rice" },
        { quantity: 10, description: "Consumer wants 10kg from retailer" }
      ]
    },
    {
      productId: "AGR-OD-20250924-WHEAT100", 
      scenarios: [
        { quantity: 30, description: "Distributor wants 30kg from 100kg wheat" },
        { quantity: 15, description: "Retailer wants 15kg from remaining wheat" }
      ]
    }
  ]

  console.log("\n🧮 Proportional Pricing Demonstrations:")
  
  for (const example of examples) {
    const product = await db.getProductByProductId(example.productId)
    if (!product) continue

    const totalPrice = await db.getLatestListedPrice(example.productId)
    if (!totalPrice) continue

    console.log(`\n📦 Product: ${product.crop_type} (${example.productId})`)
    console.log(`   Total: ${product.quantity_kg}kg @ ₹${totalPrice.toFixed(2)}`)
    console.log(`   Price per kg: ₹${(totalPrice / product.quantity_kg).toFixed(2)}`)

    for (const scenario of example.scenarios) {
      const pricing = await db.calculateProportionalPriceForProduct(example.productId, scenario.quantity)
      if (pricing) {
        console.log(`   ${scenario.description}:`)
        console.log(`     ${scenario.quantity}kg × ₹${pricing.pricePerKg} = ₹${pricing.proportionalPrice}`)
      }
    }
  }
}
