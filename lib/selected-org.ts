const SELECTED_ORG_KEY = 'connectnow_selected_org';

export function getSelectedOrgId(): string | null {
    if (typeof window === 'undefined') return null;
    const value = localStorage.getItem(SELECTED_ORG_KEY);
    return value && value.trim() ? value : null;
}

export function setSelectedOrgId(orgId: string) {
    if (typeof window === 'undefined') return;
    if (!orgId || !orgId.trim()) return;
    localStorage.setItem(SELECTED_ORG_KEY, orgId);
}

export function clearSelectedOrgId() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SELECTED_ORG_KEY);
}
