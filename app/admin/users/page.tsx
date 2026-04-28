'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'
import { Users, Plus, Trash2, Shield, ShieldCheck, Mail, Clock, Check, X, Loader } from 'lucide-react'

interface AllowedUser {
  id: string
  email: string
  is_admin: boolean
  invited_by: string | null
  invited_at: string
  registered_at: string | null
  notes: string | null
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AllowedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentEmail, setCurrentEmail] = useState<string | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [isAddingUser, setIsAddingUser] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAdminAndFetchUsers()
  }, [])

  const checkAdminAndFetchUsers = async () => {
    const supabase = createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      setLoading(false)
      return
    }
    setCurrentEmail(user.email)

    // Check if user is admin
    const { data: adminCheck } = await supabase
      .from('allowed_users')
      .select('is_admin')
      .eq('email', user.email)
      .single()

    if (!adminCheck?.is_admin) {
      setLoading(false)
      return
    }
    setIsAdmin(true)

    // Fetch all allowed users
    const { data: allowedUsers, error } = await supabase
      .from('allowed_users')
      .select('*')
      .order('invited_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
    } else {
      setUsers(allowedUsers || [])
    }
    setLoading(false)
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsAddingUser(true)

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('allowed_users')
        .insert({
          email: newEmail.toLowerCase(),
          invited_by: currentEmail,
          notes: newNotes || null,
        })

      if (error) {
        if (error.code === '23505') {
          throw new Error('This email is already in the allowed list')
        }
        throw error
      }

      // Refresh list
      await checkAdminAndFetchUsers()
      setNewEmail('')
      setNewNotes('')
      setShowAddForm(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add user')
    } finally {
      setIsAddingUser(false)
    }
  }

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('allowed_users')
      .update({ is_admin: !currentIsAdmin })
      .eq('id', userId)

    if (!error) {
      await checkAdminAndFetchUsers()
    }
  }

  const handleDeleteUser = async (userId: string, email: string) => {
    if (email === currentEmail) {
      alert('You cannot remove yourself from the allowed list')
      return
    }

    if (!confirm(`Are you sure you want to remove ${email} from the allowed list?`)) {
      return
    }

    const supabase = createClient()

    const { error } = await supabase
      .from('allowed_users')
      .delete()
      .eq('id', userId)

    if (!error) {
      await checkAdminAndFetchUsers()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavBar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground">You do not have admin privileges to view this page.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavBar />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6" />
              User Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage who can access Have It Your Way Trading
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Invite User
          </button>
        </div>

        {/* Add User Form */}
        {showAddForm && (
          <div className="mb-6 p-4 rounded-lg border border-border bg-card">
            <h2 className="font-semibold mb-4">Invite New User</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="e.g., Team member, Beta tester"
                    className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  />
                </div>
              </div>
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isAddingUser}
                  className="px-4 py-2 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {isAddingUser ? 'Adding...' : 'Add to Allowed List'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg border border-border bg-card">
            <div className="text-2xl font-bold">{users.length}</div>
            <div className="text-sm text-muted-foreground">Total Invited</div>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card">
            <div className="text-2xl font-bold">{users.filter(u => u.registered_at).length}</div>
            <div className="text-sm text-muted-foreground">Registered</div>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card">
            <div className="text-2xl font-bold">{users.filter(u => u.is_admin).length}</div>
            <div className="text-sm text-muted-foreground">Admins</div>
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Invited</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${user.is_admin ? 'bg-amber-500/20 text-amber-500' : 'bg-muted'}`}>
                        {user.is_admin ? <ShieldCheck className="w-4 h-4" /> : <Mail className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{user.email}</div>
                        {user.notes && <div className="text-xs text-muted-foreground">{user.notes}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {user.registered_at ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-xs font-medium">
                        <Check className="w-3 h-3" />
                        Registered
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-xs font-medium">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(user.invited_at).toLocaleDateString()}
                    {user.invited_by && <div className="text-xs">by {user.invited_by}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                        disabled={user.email === currentEmail}
                        title={user.is_admin ? 'Remove admin' : 'Make admin'}
                        className={`p-2 rounded-lg transition-colors ${
                          user.is_admin 
                            ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30' 
                            : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        disabled={user.email === currentEmail}
                        title="Remove user"
                        className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
