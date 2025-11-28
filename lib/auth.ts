export const ADMIN_ID = "connectnowadmin";
export const ADMIN_PASSWORD = "connectnow2025admintest";

export interface LoginCredentials {
  id: string;
  password: string;
}

export function validateCredentials({ id, password }: LoginCredentials): boolean {
  return id === ADMIN_ID && password === ADMIN_PASSWORD;
}


