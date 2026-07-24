export type SettingsTab =
  | 'profile'
  | 'notifications'
  | 'organisation'
  | 'billing'
  | 'limits'

type Role = string

export function getVisibleSettingsTabs(role: Role): SettingsTab[] {
  const tabs: SettingsTab[] = ['profile', 'notifications']

  if (can.editOrgSettings(role)) {
    tabs.push('organisation')
  }

  if (can.manageBilling(role)) {
    tabs.push('billing')
  }

  if (can.viewLimits(role)) {
    tabs.push('limits')
  }

  return tabs
}

export const can = {
  editOrgSettings(role: Role) {
    return role === 'owner'
  },

  manageBilling(role: Role) {
    return role === 'owner' || role === 'admin'
  },

  viewLimits(role: Role) {
    return role === 'owner' || role === 'admin'
  },
}