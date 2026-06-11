import { Module, DynamicModule, Global } from '@nestjs/common';
import { VaultService } from './vault.service';

export interface VaultModuleOptions {
  vaultAddr: string;
  vaultToken: string;
  mountPath: string; // it would be default as 'secret'
}

export const VAULT_OPTIONS = 'VAULT_OPTIONS';
@Global() // registering the VaultModule in AppModule once
@Module({})
export class VaultModule {
  // forRoot() is a NestJS convention for 'configure once at app startup'

  static forRoot(options: VaultModuleOptions): DynamicModule {
    return {
      module: VaultModule,

      providers: [
        {
          provide: VAULT_OPTIONS,
          useValue: options,
        },
        VaultService,
      ],
      exports: [VaultService],
    };
  }

  // forRootAsync() - use this when options come from ConfigService. This is production
  // pattern - config reads from env vars.

  static forRootAsync(options: {
    useFactory: (
      ...args: any[]
    ) => VaultModuleOptions | Promise<VaultModuleOptions>;
    inject?: any[];
    imports?: any[];
  }): DynamicModule {
    return {
      module: VaultModule,
      imports: options.imports || [],
      providers: [
        {
          provide: VAULT_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        VaultService,
      ],
      exports: [VaultService],
    };
  }
}
