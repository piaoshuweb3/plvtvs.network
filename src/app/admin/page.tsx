'use client';

import { useEffect, useState, useCallback } from 'react';
import AdminShell from '@/components/plvtvs/AdminShell';
import { useAuthStore } from '@/lib/plvtvs/auth';
import { getAudioEngine } from '@/lib/plvtvs/audioEngine';

// ============================================================
// /admin — Admin console with stats, users, nodes, logs
// ============================================================

type Tab = 'overview' | 'users' | 'nodes' | 'logs' | 'admin-actions';

interface Stats {
  users: {
    total: number;
    active: number;
    banned: number;
    suspended: number;
    new24h: number;
    new7d: number;
    subscribers: number;
    byRole: Record<string, number>;
  };
  subscriptions: {
    active: number;
    totalRevenueEth: number;
  };
  nodes: {
    total: number;
    online: number;
    bySector: Record<string, number>;
    byStatus: Record<string, number>;
  };
  yield: { totalEth: number };
  activity: { logs24h: number; adminActions24h: number };
  generatedAt: string;
}

interface AdminUser {
  id: string;
  walletAddress: string;
  username: string | null;
  email: string | null;
  role: string;
  status: string;
  subscriptionTier: number;
  subscriptionExpiresAt: string | null;
  totalYield: number;
  lastLoginAt: string | null;
  createdAt: string;
  _count: { nodes: number; subscriptions: number };
}

interface LogEntry {
  id: string;
  userId: string | null;
  sector: string | null;
  level: string;
  message: string;
  createdAt: string;
  user?: { walletAddress: string; username: string | null } | null;
  admin?: { walletAddress: string; username: string | null } | null;
  targetUser?: { walletAddress: string; username: string | null } | null;
  action?: string;
  reason?: string | null;
}

export default function AdminPage() {
  const { user } = useAuthStore();
  const requiredRole: 'OPERATOR' | 'SUPER_ADMIN' = 'OPERATOR';
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userFilter, setUserFilter] = useState({ role: '', status: '', search: '' });

  const apiHeaders = (wallet: string) => ({
    'Content-Type': 'application/json',
    'x-plvtvs-wallet': wallet,
  });

  const loadStats = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats', { headers: apiHeaders(user.walletAddress) });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Stats load failed', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadUsers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (userFilter.role) params.set('role', userFilter.role);
      if (userFilter.status) params.set('status', userFilter.status);
      if (userFilter.search) params.set('search', userFilter.search);
      const res = await fetch(`/api/admin/users?${params}`, {
        headers: apiHeaders(user.walletAddress),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setUsersTotal(data.total);
      }
    } catch (e) {
      console.error('Users load failed', e);
    } finally {
      setLoading(false);
    }
  }, [user, userFilter]);

  const loadLogs = useCallback(
    async (type: 'activity' | 'admin') => {
      if (!user) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/logs?type=${type}&limit=100`, {
          headers: apiHeaders(user.walletAddress),
        });
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs);
          setLogsTotal(data.total);
        }
      } catch (e) {
        console.error('Logs load failed', e);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // Load data on tab change
  useEffect(() => {
    if (!user) return;
    if (tab === 'overview') loadStats();
    else if (tab === 'users') loadUsers();
    else if (tab === 'logs') loadLogs('activity');
    else if (tab === 'admin-actions') loadLogs('admin');
  }, [tab, user, loadStats, loadUsers, loadLogs]);

  // Auto-refresh stats
  useEffect(() => {
    if (tab !== 'overview') return;
    const id = setInterval(loadStats, 30000);
    return () => clearInterval(id);
  }, [tab, loadStats]);

  const handleUserAction = async (u: AdminUser, action: 'ban' | 'suspend' | 'activate' | 'promote-op' | 'demote') => {
    if (!user) return;
    getAudioEngine().playClick();
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: action === 'ban' ? 'DELETE' : 'PATCH',
        headers: apiHeaders(user.walletAddress),
        body: JSON.stringify(
          action === 'ban'
            ? {}
            : action === 'suspend'
            ? { status: 'SUSPENDED' }
            : action === 'activate'
            ? { status: 'ACTIVE' }
            : action === 'promote-op'
            ? { role: 'OPERATOR' }
            : { role: 'USER' }
        ),
      });
      if (res.ok) {
        loadUsers();
        getAudioEngine().playSuccess();
      } else {
        const err = await res.json().catch(() => ({ error: 'Action failed' }));
        alert(err.error);
      }
    } catch (e) {
      console.error('User action failed', e);
    }
  };

  const tabs: { id: Tab; label: string; color: string }[] = [
    { id: 'overview', label: 'OVERVIEW', color: '#00FFCC' },
    { id: 'users', label: 'USER MANAGEMENT', color: '#0066FF' },
    { id: 'logs', label: 'ACTIVITY LOGS', color: '#00FF66' },
    { id: 'admin-actions', label: 'ADMIN LOG', color: '#FFCC00' },
  ];

  return (
    <AdminShell
      requiredRole={requiredRole}
      title="PLVTVS Core Admin Console"
      subtitle="Operator-grade monitoring & control · v2.0.26"
    >
      {/* Tab bar */}
      <div className="cyber-panel mb-6 p-2 flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              getAudioEngine().playClick();
              setTab(t.id);
            }}
            className={`cyber-mono text-[10px] tracking-wider px-4 py-2 transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'text-[#00FFCC] border-b-2 border-[#00FFCC]'
                : 'text-[#666] hover:text-white'
            }`}
          >
            {t.label}
            {t.id === 'users' && usersTotal > 0 && (
              <span className="ml-1 text-[#444]">({usersTotal})</span>
            )}
          </button>
        ))}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="cyber-mono text-xs text-[#00FFCC] mb-4 cyber-flicker">
          <span className="cyber-blink">▊</span> SYNCING DATA...
        </div>
      )}

      {/* === OVERVIEW TAB === */}
      {tab === 'overview' && stats && (
        <div className="space-y-6">
          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="TOTAL SOULS"
              value={stats.users.total}
              subtext={`${stats.users.new24h} new (24h)`}
              color="#00FFCC"
            />
            <KpiCard
              label="ACTIVE SUBSCRIBERS"
              value={stats.users.subscribers}
              subtext={`${stats.subscriptions.active} active subs`}
              color="#FFCC00"
            />
            <KpiCard
              label="ONLINE NODES"
              value={stats.nodes.online}
              subtext={`of ${stats.nodes.total} total`}
              color="#0066FF"
            />
            <KpiCard
              label="TOTAL YIELD"
              value={stats.yield.totalEth.toFixed(4)}
              subtext="ETH"
              color="#00FF66"
            />
          </div>

          {/* User breakdown */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="cyber-panel p-5">
              <div className="cyber-mono text-[10px] text-[#888] tracking-[0.2em] mb-4">
                USER BREAKDOWN
              </div>
              <div className="space-y-3">
                <StatBar label="ACTIVE" value={stats.users.active} total={stats.users.total} color="#00FFCC" />
                <StatBar label="BANNED" value={stats.users.banned} total={stats.users.total} color="#ff4444" />
                <StatBar label="SUSPENDED" value={stats.users.suspended} total={stats.users.total} color="#FFCC00" />
              </div>
              <div className="mt-4 pt-3 border-t border-[#1a1a1a] grid grid-cols-3 gap-2">
                <div>
                  <div className="cyber-mono text-[9px] text-[#444]">USER</div>
                  <div className="cyber-mono text-lg text-white">{stats.users.byRole.USER || 0}</div>
                </div>
                <div>
                  <div className="cyber-mono text-[9px] text-[#444]">OPERATOR</div>
                  <div className="cyber-mono text-lg text-[#0066FF]">{stats.users.byRole.OPERATOR || 0}</div>
                </div>
                <div>
                  <div className="cyber-mono text-[9px] text-[#444]">SUPER_ADMIN</div>
                  <div className="cyber-mono text-lg text-[#FFCC00]">{stats.users.byRole.SUPER_ADMIN || 0}</div>
                </div>
              </div>
            </div>

            <div className="cyber-panel p-5">
              <div className="cyber-mono text-[10px] text-[#888] tracking-[0.2em] mb-4">
                NODE DISTRIBUTION
              </div>
              <div className="space-y-3">
                {Object.entries(stats.nodes.bySector).map(([sector, count]) => (
                  <StatBar
                    key={sector}
                    label={sector}
                    value={count}
                    total={stats.nodes.total}
                    color={sector === 'SOCIAL' ? '#0066FF' : sector === 'ECOM' ? '#FFCC00' : '#00FFCC'}
                  />
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-[#1a1a1a]">
                <div className="cyber-mono text-[9px] text-[#444] mb-2">BY STATUS</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.nodes.byStatus).map(([status, count]) => (
                    <span
                      key={status}
                      className="cyber-mono text-[10px] px-2 py-1 border border-[#1a1a1a]"
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                        style={{
                          background:
                            status === 'ONLINE'
                              ? '#00FFCC'
                              : status === 'OFFLINE'
                              ? '#ff4444'
                              : status === 'DEGRADED'
                              ? '#FFCC00'
                              : '#0066FF',
                        }}
                      />
                      {status}: <span className="text-white">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Revenue & activity */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="cyber-panel p-5">
              <div className="cyber-mono text-[10px] text-[#888] tracking-[0.2em] mb-2">
                SUBSCRIPTION REVENUE
              </div>
              <div className="cyber-mono text-3xl text-[#FFCC00] cyber-text-glow-gold">
                {stats.subscriptions.totalRevenueEth.toFixed(4)}
              </div>
              <div className="cyber-mono text-xs text-[#666]">ETH (cumulative)</div>
            </div>
            <div className="cyber-panel p-5">
              <div className="cyber-mono text-[10px] text-[#888] tracking-[0.2em] mb-2">
                LOGS (24H)
              </div>
              <div className="cyber-mono text-3xl text-[#00FF66]">
                {stats.activity.logs24h}
              </div>
              <div className="cyber-mono text-xs text-[#666]">activity events</div>
            </div>
            <div className="cyber-panel p-5">
              <div className="cyber-mono text-[10px] text-[#888] tracking-[0.2em] mb-2">
                ADMIN ACTIONS (24H)
              </div>
              <div className="cyber-mono text-3xl text-[#FFCC00]">
                {stats.activity.adminActions24h}
              </div>
              <div className="cyber-mono text-xs text-[#666]">privileged operations</div>
            </div>
          </div>

          <div className="cyber-mono text-[9px] text-[#444] text-right">
            LAST SYNC: {new Date(stats.generatedAt).toLocaleString()}
          </div>
        </div>
      )}

      {/* === USERS TAB === */}
      {tab === 'users' && (
        <div>
          {/* Filters */}
          <div className="cyber-panel p-3 mb-4 flex flex-wrap gap-2 items-center">
            <input
              type="text"
              placeholder="SEARCH WALLET / USERNAME / EMAIL"
              value={userFilter.search}
              onChange={(e) => setUserFilter((f) => ({ ...f, search: e.target.value }))}
              className="cyber-mono text-[10px] bg-black border border-[#1a1a1a] px-3 py-1.5 text-white placeholder:text-[#444] focus:border-[#00FFCC] outline-none flex-1 min-w-[200px]"
            />
            <select
              value={userFilter.role}
              onChange={(e) => setUserFilter((f) => ({ ...f, role: e.target.value }))}
              className="cyber-mono text-[10px] bg-black border border-[#1a1a1a] px-3 py-1.5 text-white outline-none"
            >
              <option value="">ALL ROLES</option>
              <option value="USER">USER</option>
              <option value="OPERATOR">OPERATOR</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            </select>
            <select
              value={userFilter.status}
              onChange={(e) => setUserFilter((f) => ({ ...f, status: e.target.value }))}
              className="cyber-mono text-[10px] bg-black border border-[#1a1a1a] px-3 py-1.5 text-white outline-none"
            >
              <option value="">ALL STATUS</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="BANNED">BANNED</option>
            </select>
            <button
              onClick={loadUsers}
              className="cyber-btn !py-1.5 !px-3 !text-[10px]"
            >
              REFRESH
            </button>
            <span className="cyber-mono text-[10px] text-[#666] ml-auto">
              {usersTotal} SOULS
            </span>
          </div>

          {/* Users table */}
          <div className="cyber-panel overflow-x-auto">
            <table className="w-full cyber-mono text-[10px]">
              <thead>
                <tr className="border-b border-[#1a1a1a] text-[#666]">
                  <th className="p-3 text-left">WALLET</th>
                  <th className="p-3 text-left">ROLE</th>
                  <th className="p-3 text-left">STATUS</th>
                  <th className="p-3 text-right">TIER</th>
                  <th className="p-3 text-right">YIELD (ETH)</th>
                  <th className="p-3 text-right">NODES</th>
                  <th className="p-3 text-left">LAST LOGIN</th>
                  <th className="p-3 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-[#0A0A0A] hover:bg-[#00FFCC08]">
                    <td className="p-3 text-[#00FFCC]">
                      {u.walletAddress.slice(0, 8)}...{u.walletAddress.slice(-4)}
                    </td>
                    <td className="p-3">
                      <span
                        className="px-1.5 py-0.5 border"
                        style={{
                          color:
                            u.role === 'SUPER_ADMIN'
                              ? '#FFCC00'
                              : u.role === 'OPERATOR'
                              ? '#0066FF'
                              : '#888',
                          borderColor: 'currentColor',
                        }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        style={{
                          color:
                            u.status === 'ACTIVE'
                              ? '#00FFCC'
                              : u.status === 'SUSPENDED'
                              ? '#FFCC00'
                              : '#ff4444',
                        }}
                      >
                        ● {u.status}
                      </span>
                    </td>
                    <td className="p-3 text-right text-[#FFCC00]">
                      {u.subscriptionTier > 0 ? `T${u.subscriptionTier}` : '—'}
                    </td>
                    <td className="p-3 text-right text-white">
                      {u.totalYield.toFixed(5)}
                    </td>
                    <td className="p-3 text-right text-[#888]">{u._count.nodes}</td>
                    <td className="p-3 text-[#666]">
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleString().slice(5, 17)
                        : '—'}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-center">
                        {u.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleUserAction(u, 'suspend')}
                            className="text-[#FFCC00] hover:text-white px-1.5 py-0.5 border border-[#1a1a1a] hover:border-[#FFCC00] text-[9px]"
                            title="Suspend"
                          >
                            SUS
                          </button>
                        )}
                        {u.status === 'SUSPENDED' && (
                          <button
                            onClick={() => handleUserAction(u, 'activate')}
                            className="text-[#00FFCC] hover:text-white px-1.5 py-0.5 border border-[#1a1a1a] hover:border-[#00FFCC] text-[9px]"
                            title="Activate"
                          >
                            ACT
                          </button>
                        )}
                        {u.role === 'USER' && u.status !== 'BANNED' && (
                          <button
                            onClick={() => handleUserAction(u, 'promote-op')}
                            className="text-[#0066FF] hover:text-white px-1.5 py-0.5 border border-[#1a1a1a] hover:border-[#0066FF] text-[9px]"
                            title="Promote to Operator"
                          >
                            ↑OP
                          </button>
                        )}
                        {(u.role === 'OPERATOR' || u.role === 'SUPER_ADMIN') && (
                          <button
                            onClick={() => handleUserAction(u, 'demote')}
                            className="text-[#888] hover:text-white px-1.5 py-0.5 border border-[#1a1a1a] hover:border-[#888] text-[9px]"
                            title="Demote to User"
                          >
                            ↓U
                          </button>
                        )}
                        {u.status !== 'BANNED' && u.role !== 'SUPER_ADMIN' && (
                          <button
                            onClick={() => handleUserAction(u, 'ban')}
                            className="text-[#ff4444] hover:text-white px-1.5 py-0.5 border border-[#1a1a1a] hover:border-[#ff4444] text-[9px]"
                            title="Ban"
                          >
                            BAN
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-[#444]">
                      NO SOULS FOUND · TRY ADJUSTING FILTERS
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === LOGS TAB === */}
      {tab === 'logs' && (
        <div className="cyber-panel p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="cyber-mono text-[10px] text-[#888] tracking-[0.2em]">
              ACTIVITY LOGS · {logsTotal} ENTRIES
            </div>
            <button
              onClick={() => loadLogs('activity')}
              className="cyber-btn !py-1.5 !px-3 !text-[10px]"
            >
              REFRESH
            </button>
          </div>
          <div className="h-[600px] overflow-y-auto cyber-mono text-[11px] space-y-1">
            {logs.map((log) => {
              let color = '#FFFFFF';
              if (log.level === 'SUCCESS') color = '#00FFCC';
              else if (log.level === 'WARN') color = '#FFCC00';
              else if (log.level === 'ERROR') color = '#ff4444';
              else if (log.level === 'INFO') color = '#888';
              const sectorColor =
                log.sector === 'SOCIAL'
                  ? '#0066FF'
                  : log.sector === 'ECOM'
                  ? '#FFCC00'
                  : log.sector === 'CRYPTO'
                  ? '#00FFCC'
                  : '#666';
              return (
                <div key={log.id} className="flex gap-3 py-1 border-b border-[#0A0A0A]">
                  <span className="text-[#444] flex-shrink-0">
                    {new Date(log.createdAt).toISOString().slice(11, 19)}
                  </span>
                  {log.sector && (
                    <span
                      className="flex-shrink-0 px-1 border"
                      style={{ color: sectorColor, borderColor: sectorColor }}
                    >
                      {log.sector}
                    </span>
                  )}
                  <span style={{ color }}>{log.message}</span>
                  {log.user && (
                    <span className="text-[#444] ml-auto flex-shrink-0">
                      {log.user.walletAddress.slice(0, 6)}...{log.user.walletAddress.slice(-4)}
                    </span>
                  )}
                </div>
              );
            })}
            {logs.length === 0 && !loading && (
              <div className="text-center text-[#444] py-8">NO LOG ENTRIES</div>
            )}
          </div>
        </div>
      )}

      {/* === ADMIN ACTIONS TAB === */}
      {tab === 'admin-actions' && (
        <div className="cyber-panel p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="cyber-mono text-[10px] text-[#888] tracking-[0.2em]">
              ADMIN ACTION AUDIT LOG · {logsTotal} ENTRIES
            </div>
            <button
              onClick={() => loadLogs('admin')}
              className="cyber-btn !py-1.5 !px-3 !text-[10px]"
            >
              REFRESH
            </button>
          </div>
          <div className="h-[600px] overflow-y-auto cyber-mono text-[11px] space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-3 py-1.5 border-b border-[#0A0A0A]">
                <span className="text-[#444] flex-shrink-0">
                  {new Date(log.createdAt).toISOString().slice(0, 19).replace('T', ' ')}
                </span>
                <span className="text-[#FFCC00] flex-shrink-0 font-bold">
                  {log.action}
                </span>
                <span className="text-[#bbb]">
                  by <span className="text-[#00FFCC]">{log.admin?.walletAddress.slice(0, 6)}...{log.admin?.walletAddress.slice(-4)}</span>
                  {log.targetUser && (
                    <> on <span className="text-[#0066FF]">{log.targetUser.walletAddress.slice(0, 6)}...{log.targetUser.walletAddress.slice(-4)}</span></>
                  )}
                </span>
                {log.reason && (
                  <span className="text-[#666] italic ml-auto">"{log.reason}"</span>
                )}
              </div>
            ))}
            {logs.length === 0 && !loading && (
              <div className="text-center text-[#444] py-8">NO ADMIN ACTIONS YET</div>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}

// ============================================================
// Sub-components
// ============================================================

function KpiCard({
  label,
  value,
  subtext,
  color,
}: {
  label: string;
  value: string | number;
  subtext: string;
  color: string;
}) {
  return (
    <div className="cyber-panel p-5">
      <div className="cyber-mono text-[9px] text-[#888] tracking-[0.2em] mb-2">
        {label}
      </div>
      <div
        className="cyber-mono text-3xl font-black"
        style={{ color, textShadow: `0 0 12px ${color}55` }}
      >
        {value}
      </div>
      <div className="cyber-mono text-[10px] text-[#666] mt-1">{subtext}</div>
    </div>
  );
}

function StatBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between cyber-mono text-[10px] mb-1">
        <span className="text-[#888]">{label}</span>
        <span style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 bg-[#0A0A0A] border border-[#1a1a1a] relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
      </div>
    </div>
  );
}
