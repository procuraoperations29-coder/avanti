'use client'
import { useState, useEffect } from 'react'
import { getVisibleSettingsTabs, can, type SettingsTab } from '@/lib/permissions'

export default function SettingsPage() {
  const [me, setMe] = useState<any>(null)
  const [org, setOrg] = useState<any>(null)
  const [tab, setTab] = useState<SettingsTab>('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Profile state
  const [fullName, setFullName] = useState('')
  const [title, setTitle] = useState('')
  const [phone, setPhone] = useState('')

  // Organisation state (owners only)
  const [orgName, setOrgName] = useState('')
  const [industry, setIndustry] = useState('')

  // Notification prefs
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifBlocker, setNotifBlocker] = useState(true)
  const [notifWeekly, setNotifWeekly] = useState(true)

  useEffect(() => {
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(data => {
      if (data) {
        setMe(data)
        setOrg(data.tenant)
        setFullName(data.full_name || '')
        setTitle(data.title || '')
        setPhone(data.phone || '')
        setOrgName(data.tenant?.name || '')
        setIndustry(data.tenant?.industry || '')
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ padding:24, color:'var(--muted)', fontSize:13 }}>
        Loading settings...
      </div>
    )
  }

  if (!me) {
    return (
      <div style={{ padding:24, color:'var(--red)', fontSize:13 }}>
        Could not load your account.
      </div>
    )
  }

  const role = me.role
  const visibleTabs = getVisibleSettingsTabs(role)

  // Tab labels
  const tabLabels: Record<SettingsTab, string> = {
    profile:       'Profile',
    notifications: 'Notifications',
    organisation:  'Organisation',
    billing:       'Billing',
    limits:        'Plan & Limits',
  }

  async function saveProfile() {
    setSaving(true); setMsg('')
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, title, phone }),
      })
      if (res.ok) setMsg('✅ Profile saved')
      else setMsg('❌ Save failed')
    } catch { setMsg('❌ Save failed') }
    finally { setSaving(false); setTimeout(() => setMsg(''), 3000) }
  }

  async function saveOrg() {
    setSaving(true); setMsg('')
    try {
      const res = await fetch('/api/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName, industry }),
      })
      if (res.ok) setMsg('✅ Organisation saved')
      else setMsg('❌ Save failed')
    } catch { setMsg('❌ Save failed') }
    finally { setSaving(false); setTimeout(() => setMsg(''), 3000) }
  }

  const card: React.CSSProperties = {
    background:'var(--card)', border:'1px solid var(--b)',
    borderRadius:12, padding:20, marginBottom:16,
  }

  const labelStyle: React.CSSProperties = {
    fontSize:11, fontWeight:600, textTransform:'uppercase' as const,
    letterSpacing:'0.05em', color:'var(--muted)', marginBottom:6,
  }

  const inputStyle: React.CSSProperties = {
    width:'100%', padding:'9px 12px', borderRadius:7,
    border:'1px solid var(--b)', background:'var(--bg)',
    color:'var(--text)', fontSize:13, outline:'none',
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <header style={{ height:54, flexShrink:0, display:'flex', alignItems:'center',
                        padding:'0 24px', borderBottom:'1px solid var(--b)',
                        background:'var(--bg2)' }}>
        <span style={{ fontWeight:700, fontSize:14.5, color:'var(--text)' }}>Settings</span>
      </header>

      <div style={{ flex:1, overflowY:'auto', padding:24, maxWidth:800 }}>
        {/* Tab navigation */}
        <div style={{ display:'flex', gap:4, marginBottom:24, background:'var(--card)',
                       borderRadius:10, padding:4, width:'fit-content', flexWrap:'wrap' }}>
          {visibleTabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
                    style={{ padding:'7px 16px', borderRadius:7, border:'none',
                              cursor:'pointer', fontSize:12.5, fontWeight:500,
                              background: tab===t ? 'var(--bg2)' : 'transparent',
                              color: tab===t ? 'var(--text)' : 'var(--muted)' }}>
              {tabLabels[t]}
            </button>
          ))}
        </div>

        {/* Message */}
        {msg && (
          <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:16,
                         background: msg.startsWith('✅') ? 'rgba(31,202,122,0.08)' : 'rgba(239,79,79,0.08)',
                         color: msg.startsWith('✅') ? 'var(--green)' : 'var(--red)',
                         fontSize:13, fontWeight:500 }}>
            {msg}
          </div>
        )}

        {/* PROFILE TAB - everyone */}
        {tab === 'profile' && (
          <div style={card}>
            <h3 style={{ fontSize:15, fontWeight:600, color:'var(--text)', marginBottom:16 }}>
              Your profile
            </h3>
            <div style={{ marginBottom:14 }}>
              <div style={labelStyle}>Full name</div>
              <input value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={labelStyle}>Email</div>
              <input value={me.email} disabled style={{ ...inputStyle, opacity:0.6 }} />
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={labelStyle}>Title / Job role</div>
              <input value={title} onChange={e => setTitle(e.target.value)}
                     placeholder="e.g. Head of Operations" style={inputStyle} />
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={labelStyle}>Phone (optional)</div>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                     placeholder="+234..." style={inputStyle} />
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={labelStyle}>Your role in the organisation</div>
              <input value={role.charAt(0).toUpperCase() + role.slice(1)} disabled
                     style={{ ...inputStyle, opacity:0.6 }} />
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>
                Your role is set by your organisation owner.
              </div>
            </div>
            <button onClick={saveProfile} disabled={saving}
                    style={{ padding:'10px 20px', borderRadius:8, border:'none',
                              background:'var(--gold)', color:'#07080f', fontWeight:700,
                              fontSize:13, cursor:'pointer' }}>
              {saving ? 'Saving...' : 'Save profile'}
            </button>
          </div>
        )}

        {/* NOTIFICATIONS TAB - everyone */}
        {tab === 'notifications' && (
          <div style={card}>
            <h3 style={{ fontSize:15, fontWeight:600, color:'var(--text)', marginBottom:16 }}>
              Notification preferences
            </h3>
            {[
              { v: notifEmail,   set: setNotifEmail,   label: 'Daily email reminders for check-ins' },
              { v: notifBlocker, set: setNotifBlocker, label: 'Email alerts when team members report blockers' },
              { v: notifWeekly,  set: setNotifWeekly,  label: 'Weekly summary email (Mondays)' },
            ].map((opt, i) => (
              <label key={i} style={{ display:'flex', alignItems:'center', gap:10,
                                       padding:'12px 0', borderBottom:'1px solid var(--b)',
                                       cursor:'pointer' }}>
                <input type="checkbox" checked={opt.v} onChange={e => opt.set(e.target.checked)}
                       style={{ width:18, height:18 }} />
                <span style={{ fontSize:13, color:'var(--text)' }}>{opt.label}</span>
              </label>
            ))}
          </div>
        )}

        {/* ORGANISATION TAB - owners only */}
        {tab === 'organisation' && can.editOrgSettings(role) && (
          <div style={card}>
            <h3 style={{ fontSize:15, fontWeight:600, color:'var(--text)', marginBottom:16 }}>
              Organisation details
            </h3>
            <div style={{ marginBottom:14 }}>
              <div style={labelStyle}>Company name</div>
              <input value={orgName} onChange={e => setOrgName(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={labelStyle}>Industry</div>
              <select value={industry} onChange={e => setIndustry(e.target.value)} style={inputStyle}>
                <option value="">Select industry</option>
                <option value="fintech">Financial services / Fintech</option>
                <option value="tech">Technology / SaaS</option>
                <option value="consulting">Consulting</option>
                <option value="healthcare">Healthcare</option>
                <option value="retail">Retail / E-commerce</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button onClick={saveOrg} disabled={saving}
                    style={{ padding:'10px 20px', borderRadius:8, border:'none',
                              background:'var(--gold)', color:'#07080f', fontWeight:700,
                              fontSize:13, cursor:'pointer' }}>
              {saving ? 'Saving...' : 'Save organisation'}
            </button>
          </div>
        )}

        {/* BILLING TAB - owners/admins only */}
        {tab === 'billing' && can.manageBilling(role) && (
          <div style={card}>
            <h3 style={{ fontSize:15, fontWeight:600, color:'var(--text)', marginBottom:16 }}>
              Billing & Subscription
            </h3>
            <div style={{ padding:16, background:'var(--bg2)', borderRadius:10, marginBottom:16 }}>
              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>Current plan</div>
              <div style={{ fontSize:22, fontWeight:700, color:'var(--text)', textTransform:'capitalize' as const }}>
                {org?.plan_tier || 'Free'}
              </div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>
                {org?.plan_tier === 'business'
                  ? `${org?.seats_total || 0} seats · ${org?.billing_cycle || 'monthly'} billing`
                  : '3 free seats · Upgrade to Business for unlimited'}
              </div>
            </div>
            {org?.plan_tier !== 'business' && (
              <button
                onClick={async () => {
                  setSaving(true); setMsg('')
                  try {
                    const res = await fetch('/api/payments/initialize', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ seats: (org?.seats_total || 3) + 1, cycle: 'monthly' }),
                    })
                    const data = await res.json()
                    if (data.authorization_url) {
                      window.location.href = data.authorization_url
                    } else {
                      setMsg('❌ ' + (data.error || 'Payment initialization failed'))
                    }
                  } catch {
                    setMsg('❌ Something went wrong. Please try again.')
                  } finally {
                    setSaving(false)
                  }
                }}
                disabled={saving}
                style={{ display:'inline-block', padding:'10px 20px', borderRadius:8,
                         background:'var(--gold)', color:'#07080f', fontWeight:700,
                         fontSize:13, border:'none', cursor: saving ? 'not-allowed' : 'pointer',
                         opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Initializing…' : 'Upgrade to Business →'}
              </button>
            )}
          </div>
        )}

        {/* LIMITS TAB - owners/admins only */}
        {tab === 'limits' && can.viewLimits(role) && (
          <div style={card}>
            <h3 style={{ fontSize:15, fontWeight:600, color:'var(--text)', marginBottom:16 }}>
              Plan limits
            </h3>
            {[
              ['Users (seats)', org?.plan_tier === 'business' ? `${org?.seats_total || 0}` : '3 max'],
              ['Projects', org?.plan_tier === 'business' ? 'Unlimited' : '3 max'],
              ['Objectives', org?.plan_tier === 'business' ? 'Unlimited' : '5 max'],
              ['KPIs', org?.plan_tier === 'business' ? 'Unlimited' : '5 max'],
              ['Tasks', org?.plan_tier === 'business' ? 'Unlimited' : '20 max'],
              ['Departments', org?.plan_tier === 'business' ? 'Unlimited' : '2 max'],
            ].map(([l, v]) => (
              <div key={l as string} style={{ display:'flex', justifyContent:'space-between',
                                                 padding:'10px 0', borderBottom:'1px solid var(--b)' }}>
                <span style={{ fontSize:13, color:'var(--text)' }}>{l}</span>
                <span style={{ fontSize:13, fontWeight:600,
                                color: v === 'Unlimited' ? 'var(--green)' : 'var(--muted)' }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
