import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Test, TestingModule } from '@nestjs/testing';
import {Worker} from 'bullmq'
import { BullExplorer } from '../bull.explorer';
import { BullModule } from '../bull.module';
import { getQueueToken } from '../utils';

jest.mock('bullmq', () => ({
  ...jest.requireActual('bullmq'),
  Worker: jest.fn()
}))

describe('BullExplorer', () => {
  let bullExplorer: BullExplorer;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        BullModule.registerQueue({ name: 'test', connection: { port: 6380 } }),
      ],
    }).compile();

    bullExplorer = moduleRef.get(BullExplorer);
  });
  afterAll(async () => {
    await moduleRef.close();
  });

  afterEach(() => {
    (Worker as unknown as jest.Mock).mockClear();
  })

  describe('handleProcessor', () => {
    it('should create a Worker', () => {
      const instance = { handler: jest.fn() };
      const queue = { name: 'test' } as any;
      bullExplorer.handleProcessor(instance, 'handler', queue, null, false);
      expect(Worker).toHaveBeenCalledWith('test', expect.any(Function), {});
    });
    it('should set concurrency on a Worker', () => {
      const instance = { handler: jest.fn() };
      const queue = { name: 'test' } as any;
      const opts = { concurrency: 42 };
      bullExplorer.handleProcessor(
        instance,
        'handler',
        queue,
        null,
        false,
        opts,
      );
      expect(Worker).toHaveBeenCalledWith('test', expect.any(Function), opts)
    });
    it('should set concurrency on a Worker with a value of 0', () => {
      const instance = { handler: jest.fn() };
      const queue = { name: 'test' } as any;
      const opts = { concurrency: 0 };
      bullExplorer.handleProcessor(
        instance,
        'handler',
        queue,
        null,
        false,
        opts,
      );
      expect(Worker).toHaveBeenCalledWith('test', expect.any(Function), opts)
    });
  });

  describe('handleListener', () => {
    it('should add the given function to the queue listeners for the given event', () => {
      const instance = { handler: jest.fn() };
      const queue = { on: jest.fn() } as any;
      const opts = { eventName: 'test' } as any;
      const wrapper = new InstanceWrapper();
      bullExplorer.handleListener(
        instance,
        'handler',
        wrapper,
        queue,
        opts,
      );
      expect(queue.on).toHaveBeenCalledWith(
        opts.eventName,
        expect.any(Function),
      );
    });
  });

  describe('getQueue', () => {
    it('should return the queue matching the given token', async () => {
      const queueToken = getQueueToken('test');
      const fakeQueue = 'I am a fake queue';

      const moduleRef = await Test.createTestingModule({
        imports: [BullModule.registerQueue({ name: 'test' })],
      })
        .overrideProvider(queueToken)
        .useValue(fakeQueue)
        .compile();

      const explorer = moduleRef.get(BullExplorer);

      const queue = explorer.getQueue(queueToken, 'test');
      expect(queue).toBeDefined();
      expect(queue).toBe(fakeQueue);

      await moduleRef.close();
    });
  });
});
