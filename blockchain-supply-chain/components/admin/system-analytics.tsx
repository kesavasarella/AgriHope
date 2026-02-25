"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, TrendingUp, Package, Users, Activity, AlertTriangle } from "lucide-react"

interface SystemStats {
  totalProducts: number
  totalUsers: number
  totalTransactions: number
  activeProducts: number
  recentActivity: Array<{
    id: string
    type: string
    description: string
    timestamp: string
    status: "success" | "warning" | "error"
  }>
  productsByStatus: Record<string, number>
  usersByRole: Record<string, number>
}

export function SystemAnalytics() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSystemStats()
  }, [])

  const loadSystemStats = async () => {
    try {
      // Mock system statistics - in real implementation, this would come from database
      const mockStats: SystemStats = {
        totalProducts: 156,
        totalUsers: 89,
        totalTransactions: 342,
        activeProducts: 134,
        recentActivity: [
          {
            id: "1",
            type: "product_created",
            description: "New tomato batch registered by Ram Prasad",
            timestamp: "2025-09-08T10:30:00Z",
            status: "success",
          },
          {
            id: "2",
            type: "ownership_transfer",
            description: "Product AGR-OD-20250908-0002 transferred to distributor",
            timestamp: "2025-09-08T09:15:00Z",
            status: "success",
          },
          {
            id: "3",
            type: "quality_check",
            description: "Quality certificate added for onion batch",
            timestamp: "2025-09-08T08:45:00Z",
            status: "success",
          },
          {
            id: "4",
            type: "dispute_raised",
            description: "Quality dispute raised for product AGR-OD-20250907-0015",
            timestamp: "2025-09-08T07:20:00Z",
            status: "warning",
          },
          {
            id: "5",
            type: "user_registered",
            description: "New retailer account created: Green Valley Store",
            timestamp: "2025-09-07T16:30:00Z",
            status: "success",
          },
        ],
        productsByStatus: {
          harvested: 45,
          packed: 32,
          dispatched: 28,
          received: 19,
          for_sale: 15,
          sold: 12,
          dispute: 5,
        },
        usersByRole: {
          farmer: 34,
          distributor: 12,
          retailer: 28,
          consumer: 14,
          admin: 1,
        },
      }
      setStats(mockStats)
    } catch (error) {
      console.error("Failed to load system stats:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getActivityStatusColor = (status: "success" | "warning" | "error") => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800"
      case "warning":
        return "bg-yellow-100 text-yellow-800"
      case "error":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "product_created":
        return <Package className="h-4 w-4" />
      case "ownership_transfer":
        return <TrendingUp className="h-4 w-4" />
      case "quality_check":
        return <BarChart3 className="h-4 w-4" />
      case "dispute_raised":
        return <AlertTriangle className="h-4 w-4" />
      case "user_registered":
        return <Users className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-muted-foreground">Failed to load system analytics</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">{stats.activeProducts} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Across all roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">Blockchain events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Products by Status</CardTitle>
            <CardDescription>Distribution of products across different supply chain stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.productsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <span className="capitalize text-sm">{status.replace("_", " ")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{count}</span>
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(count / stats.totalProducts) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* User Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Users by Role</CardTitle>
            <CardDescription>Distribution of registered users across different roles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.usersByRole).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-secondary rounded-full"></div>
                    <span className="capitalize text-sm">{role}s</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{count}</span>
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-secondary rounded-full"
                        style={{ width: `${(count / stats.totalUsers) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent System Activity
          </CardTitle>
          <CardDescription>Latest events and transactions across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 border border-border rounded-lg">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <Badge className={getActivityStatusColor(activity.status)}>{activity.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(activity.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
