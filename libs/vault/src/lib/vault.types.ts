export interface VaultConfig {
  endpoint: string;
  token: string;
}

export interface VaultSecret {
  [key: string]: string;
}
