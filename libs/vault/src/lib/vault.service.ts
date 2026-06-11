import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { VAULT_OPTIONS, VaultModuleOptions } from './vault.module';
import { VaultSecret } from './vault.types';

@Injectable()
export class VaultService implements OnModuleInit {
  private readonly logger = new Logger(VaultService.name);
  private readonly baseUrl: string;
  private readonly mountPath: string;

  // @Inject(VAULT_OPTIONS) pulls the options object we registered.
  // NestJS resolves this automatically - since we need not to call new VaultService()

  constructor(
    @Inject(VAULT_OPTIONS) private readonly options: VaultModuleOptions,
  ) {
    this.baseUrl = options.vaultAddr;
    this.mountPath = options.mountPath || 'secret';
    this.logger.log(
      `VaultService initialized with mountPath: ${this.mountPath}`,
    );
  }

  async onModuleInit(): Promise<void> {
    this.logger.log(`Connecting to Vault at ${this.baseUrl}`);
    try {
      await this.healthCheck();
      this.logger.log('Vault connection successful');
    } catch (error) {
      this.logger.error('Vault health check failed: ${error.message}');
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
  }

  async getSecret(path: string): Promise<VaultResponse> {
    try {
      const url = `${this.baseUrl}/v1/${this.mountPath}/data/${path}`;

      const response = await fetch(url, {
        headers: {
          'X-Vault-Token': this.options.vaultToken,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      return result.data.data;
    } catch (error) {
      console.error('Vault read failed:', error);
      throw new Error('Failed to read from Vault');
    }
  }

  async getSecretValue(path: string, key: string): Promise<string> {
    const secret = await this.getSecret(path);
    const value = secret[key];
    if (!value) throw new Error(`Key ${key} not found in secret ${path}`);
    return value;
  }

  // Implementing actual probe as needed (e.g. HTTP call to Vault's /v1/sys/health).
  async healthCheck(): Promise<void> {
    return Promise.resolve();
  }
}
