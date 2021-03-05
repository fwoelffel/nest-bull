import { flatten, OnApplicationShutdown, Provider } from '@nestjs/common';
import * as Bull from 'bullmq';
import { Queue, Worker, QueueScheduler } from 'bullmq';
import { BullQueueProcessor } from './bull.types';
import { createConditionalDepHolder, IConditionalDepHolder } from './helpers';
import { BullModuleOptions } from './interfaces/bull-module-options.interface';
import {
  getQueueOptionsToken,
  getQueueToken,
  getSharedConfigToken,
} from './utils';
import {
  isAdvancedProcessor,
  isAdvancedSeparateProcessor,
  isProcessorCallback,
  isSeparateProcessor,
} from './utils/helpers';

function buildQueue(option: BullModuleOptions): Queue {
  const queue: Queue = new Queue(option.name ? option.name : 'default', option);
  const workers: Worker[] = [];

  const scheduler = new QueueScheduler(queue.name, option);

  if (option.processors) {
    option.processors.forEach((processor: BullQueueProcessor) => {
      if (isAdvancedProcessor(processor)) {
        workers.push(
          new Worker(queue.name, processor.callback, {
            concurrency: processor.concurrency,
            connection: option.connection,
          }),
        );
      } else if (isAdvancedSeparateProcessor(processor)) {
        workers.push(
          new Worker(queue.name, processor.path, {
            concurrency: processor.concurrency,
            connection: option.connection,
          }),
        );
      } else if (isSeparateProcessor(processor)) {
        workers.push(
          new Worker(queue.name, processor, {
            connection: option.connection,
          }),
        );
      } else if (isProcessorCallback(processor)) {
        workers.push(
          new Worker(queue.name, processor, {
            connection: option.connection,
          }),
        );
      }
    });
  }
  ((queue as unknown) as OnApplicationShutdown).onApplicationShutdown = function (
    this: Queue,
  ) {
    return Promise.all([...workers.map((w) => w.close()), this.close(), scheduler.close()]);
  };
  return queue;
}

export function createQueueOptionProviders(
  options: BullModuleOptions[],
): Provider[] {
  const providers = options.map((option) => {
    const optionalSharedConfigHolder = createConditionalDepHolder(
      getSharedConfigToken(option.configKey),
    );
    return [
      optionalSharedConfigHolder,
      {
        provide: getQueueOptionsToken(option.name),
        useFactory: (optionalDepHolder: IConditionalDepHolder<Bull.Queue>) => {
          return {
            ...optionalDepHolder.getDependencyRef(option.name),
            ...option,
          };
        },
        inject: [optionalSharedConfigHolder],
      },
    ];
  });
  return flatten(providers);
}

export function createQueueProviders(options: BullModuleOptions[]): Provider[] {
  return options.map((option) => ({
    provide: getQueueToken(option.name),
    useFactory: (o: BullModuleOptions) => {
      const queueName = o.name || option.name;
      return buildQueue({ ...o, name: queueName });
    },
    inject: [getQueueOptionsToken(option.name)],
  }));
}
