import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import * as Bull from 'bullmq';
import { BullMetadataAccessor } from './bull-metadata.accessor';
import { BullExplorer } from './bull.explorer';
import {
  createQueueOptionProviders,
  createQueueProviders,
} from './bull.providers';
import {
  createConditionalDepHolder,
  IConditionalDepHolder,
} from './helpers/create-conditional-dep-holder.helper';
import {
  SharedBullAsyncConfiguration,
  SharedBullConfigurationFactory,
} from './interfaces';
import {
  BullModuleAsyncOptions,
  BullModuleOptions,
  BullOptionsFactory,
} from './interfaces/bull-module-options.interface';
import { getSharedConfigToken } from './utils';
import { getQueueOptionsToken } from './utils/get-queue-options-token.util';

@Module({})
export class BullModule {
  /**
   * Registers a globally available configuration for all queues.
   *
   * @param bullConfig shared bull configuration object
   */
  static forRoot(bullConfig: Bull.QueueOptions): DynamicModule;
  /**
   * Registers a globally available configuration under a specified "configKey".
   *
   * @param configKey a key under which the configuration should be available
   * @param sharedBullConfig shared bull configuration object
   */
  static forRoot(
    configKey: string,
    bullConfig: Bull.QueueOptions,
  ): DynamicModule;
  /**
   * Registers a globally available configuration for all queues
   * or using a specified "configKey" (if passed).
   *
   * @param keyOrConfig a key under which the configuration should be available or a bull configuration object
   * @param bullConfig bull configuration object
   */
  static forRoot(
    keyOrConfig: string | Bull.QueueOptions,
    bullConfig?: Bull.QueueOptions,
  ): DynamicModule {
    const [configKey, sharedBullConfig] =
      typeof keyOrConfig === 'string'
        ? [keyOrConfig, bullConfig]
        : [undefined, keyOrConfig];

    const sharedBullConfigProvider: Provider = {
      provide: getSharedConfigToken(configKey),
      useValue: sharedBullConfig,
    };

    return {
      global: true,
      module: BullModule,
      providers: [sharedBullConfigProvider],
      exports: [sharedBullConfigProvider],
    };
  }

  /**
   * Registers a globally available configuration for all queues.
   *
   * @param asyncBullConfig shared bull configuration async factory
   */
  static forRootAsync(
    asyncBullConfig: SharedBullAsyncConfiguration,
  ): DynamicModule;
  /**
   * Registers a globally available configuration under a specified "configKey".
   *
   * @param configKey a key under which the configuration should be available
   * @param asyncBullConfig shared bull configuration async factory
   */
  static forRootAsync(
    configKey: string,
    asyncBullConfig: SharedBullAsyncConfiguration,
  ): DynamicModule;
  /**
   * Registers a globally available configuration for all queues
   * or using a specified "configKey" (if passed).
   *
   * @param keyOrAsyncConfig a key under which the configuration should be available or a bull configuration object
   * @param asyncBullConfig shared bull configuration async factory
   */
  static forRootAsync(
    keyOrAsyncConfig: string | SharedBullAsyncConfiguration,
    asyncBullConfig?: SharedBullAsyncConfiguration,
  ): DynamicModule {
    const [configKey, asyncSharedBullConfig] =
      typeof keyOrAsyncConfig === 'string'
        ? [keyOrAsyncConfig, asyncBullConfig]
        : [undefined, keyOrAsyncConfig];

    const imports = this.getUniqImports([asyncSharedBullConfig]);
    const providers = this.createAsyncSharedConfigurationProviders(
      configKey,
      asyncSharedBullConfig,
    );

    return {
      global: true,
      module: BullModule,
      imports,
      providers,
      exports: providers,
    };
  }

  static registerQueue(...options: BullModuleOptions[]): DynamicModule {
    const queueProviders = createQueueProviders([].concat(options));
    const queueOptionProviders = createQueueOptionProviders([].concat(options));
    return {
      module: BullModule,
      imports: [BullModule.registerCore()],
      providers: [...queueOptionProviders, ...queueProviders],
      exports: queueProviders,
    };
  }

  static registerQueueAsync(
    ...options: BullModuleAsyncOptions[]
  ): DynamicModule {
    const optionsArr = [].concat(options);
    const queueProviders = createQueueProviders(optionsArr);
    const imports = this.getUniqImports(optionsArr);
    const asyncQueueOptionsProviders = options
      .map((queueOptions) => this.createAsyncProviders(queueOptions))
      .reduce((a, b) => a.concat(b), []);

    return {
      imports: imports.concat(BullModule.registerCore()),
      module: BullModule,
      providers: [...asyncQueueOptionsProviders, ...queueProviders],
      exports: queueProviders,
    };
  }

  private static createAsyncProviders(
    options: BullModuleAsyncOptions,
  ): Provider[] {
    const optionalSharedConfigHolder = createConditionalDepHolder(
      getSharedConfigToken(options.configKey),
    );

    if (options.useExisting || options.useFactory) {
      return [
        optionalSharedConfigHolder,
        this.createAsyncOptionsProvider(options, optionalSharedConfigHolder),
      ];
    }
    if (!options.useClass) {
      // fallback to the "registerQueue" in case someone accidentally used the "registerQueueAsync" instead
      return createQueueOptionProviders([options]);
    }
    const useClass = options.useClass as Type<BullOptionsFactory>;
    return [
      optionalSharedConfigHolder,
      this.createAsyncOptionsProvider(options, optionalSharedConfigHolder),
      {
        provide: useClass,
        useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    asyncOptions: BullModuleAsyncOptions,
    optionalSharedConfigHolderRef: Type<
      IConditionalDepHolder<Bull.QueueOptions>
    >,
  ): Provider {
    if (asyncOptions.useFactory) {
      return {
        provide: getQueueOptionsToken(asyncOptions.name),
        useFactory: async (
          optionalDepHolder: IConditionalDepHolder<Bull.QueueOptions>,
          ...factoryArgs: unknown[]
        ) => {
          return {
            ...optionalDepHolder.getDependencyRef(asyncOptions.name),
            ...(await asyncOptions.useFactory(...factoryArgs)),
          };
        },
        inject: [optionalSharedConfigHolderRef, ...(asyncOptions.inject || [])],
      };
    }
    // `as Type<BullOptionsFactory>` is a workaround for microsoft/TypeScript#31603
    const inject = [
      (asyncOptions.useClass ||
        asyncOptions.useExisting) as Type<BullOptionsFactory>,
    ];
    return {
      provide: getQueueOptionsToken(asyncOptions.name),
      useFactory: async (
        optionalDepHolder: IConditionalDepHolder<Bull.QueueOptions>,
        optionsFactory: BullOptionsFactory,
      ) => {
        return {
          ...optionalDepHolder.getDependencyRef(asyncOptions.name),
          ...(await optionsFactory.createBullOptions()),
        };
      },
      inject: [optionalSharedConfigHolderRef, ...inject],
    };
  }

  private static createAsyncSharedConfigurationProviders(
    configKey: string | undefined,
    options: SharedBullAsyncConfiguration,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncSharedConfigurationProvider(configKey, options)];
    }
    const useClass = options.useClass as Type<SharedBullConfigurationFactory>;
    return [
      this.createAsyncSharedConfigurationProvider(configKey, options),
      {
        provide: useClass,
        useClass,
      },
    ];
  }

  private static createAsyncSharedConfigurationProvider(
    configKey: string | undefined,
    options: SharedBullAsyncConfiguration,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: getSharedConfigToken(configKey),
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }
    // `as Type<SharedBullConfigurationFactory>` is a workaround for microsoft/TypeScript#31603
    const inject = [
      (options.useClass ||
        options.useExisting) as Type<SharedBullConfigurationFactory>,
    ];
    return {
      provide: getSharedConfigToken(configKey),
      useFactory: async (optionsFactory: SharedBullConfigurationFactory) =>
        optionsFactory.createSharedConfiguration(),
      inject,
    };
  }

  private static registerCore() {
    return {
      global: true,
      module: BullModule,
      imports: [DiscoveryModule],
      providers: [BullExplorer, BullMetadataAccessor],
    };
  }

  private static getUniqImports(
    options: Array<BullModuleAsyncOptions | SharedBullAsyncConfiguration>,
  ) {
    return (
      options
        .map((option) => option.imports)
        .reduce((acc, i) => acc.concat(i || []), [])
        .filter((v, i, a) => a.indexOf(v) === i) || []
    );
  }
}
