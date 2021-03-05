import { Test, TestingModule } from '@nestjs/testing';
import { Queue } from 'bullmq';
import { BullModule, getQueueToken } from '../lib';

describe('BullModule', () => {
  describe('registerQueue', () => {
    let moduleRef: TestingModule;

    describe('single configuration', () => {
      const fakeProcessor = jest.fn();

      beforeAll(async () => {
        moduleRef = await Test.createTestingModule({
          imports: [
            BullModule.registerQueue({
              name: 'test',
              connection: {
                host: '0.0.0.0',
                port: 6380,
              },
              processors: [fakeProcessor],
            }),
          ],
        }).compile();
      });
      afterAll(async () => {
        await moduleRef.close();
      });
      it('should inject the queue with the given name', () => {
        const queue = moduleRef.get<Queue>(getQueueToken('test'));

        expect(queue).toBeDefined();
        expect(queue.name).toEqual('test');
      });
    });

    describe('multiple configurations', () => {
      beforeAll(async () => {
        moduleRef = await Test.createTestingModule({
          imports: [
            BullModule.registerQueue(
              {
                name: 'test1',
                connection: {
                  host: '0.0.0.0',
                  port: 6380,
                },
              },
              {
                name: 'test2',
                connection: {
                  host: '0.0.0.0',
                  port: 6380,
                },
              },
            ),
          ],
        }).compile();
      });
      afterAll(async () => {
        await moduleRef.close();
      });
      it('should inject the queue with name "test1"', () => {
        const queue: Queue = moduleRef.get<Queue>(getQueueToken('test1'));
        expect(queue).toBeDefined();
        expect(queue.name).toEqual('test1');
      });
      it('should inject the queue with name "test2"', () => {
        const queue: Queue = moduleRef.get<Queue>(getQueueToken('test2'));
        expect(queue).toBeDefined();
        expect(queue.name).toEqual('test2');
      });
    });
  });

  describe('forRoot + registerQueue', () => {
    let moduleRef: TestingModule;

    describe('single configuration', () => {
      const fakeProcessor = jest.fn();
      beforeAll(async () => {
        moduleRef = await Test.createTestingModule({
          imports: [
            BullModule.forRoot({
              connection: {
                host: '0.0.0.0',
                port: 6380,
              },
            }),
            BullModule.registerQueue({
              name: 'test',
              processors: [fakeProcessor],
            }),
          ],
        }).compile();
      });
      afterAll(async () => {
        await moduleRef.close();
      });

      it('should inject the queue with the given name', () => {
        const queue: Queue = moduleRef.get<Queue>(getQueueToken('test'));
        expect(queue).toBeDefined();
        expect(queue.name).toEqual('test');
      });
    });

    describe('multiple configurations', () => {
      beforeAll(async () => {
        moduleRef = await Test.createTestingModule({
          imports: [
            BullModule.forRoot({
              connection: {
                host: '0.0.0.0',
                port: 6380,
              },
            }),
            BullModule.registerQueue({ name: 'test1' }, { name: 'test2' }),
          ],
        }).compile();
      });
      afterAll(async () => {
        await moduleRef.close();
      });
      it('should inject the queue with name "test1"', () => {
        const queue = moduleRef.get<Queue>(getQueueToken('test1'));

        expect(queue).toBeDefined();
        expect(queue.name).toEqual('test1');
      });
      it('should inject the queue with name "test2"', () => {
        const queue = moduleRef.get<Queue>(getQueueToken('test2'));

        expect(queue).toBeDefined();
        expect(queue.name).toEqual('test2');
      });
    });
  });

  describe('registerQueueAsync', () => {
    let moduleRef: TestingModule;

    describe('single configuration', () => {
      describe('useFactory', () => {
        const fakeProcessor = jest.fn();
        beforeAll(async () => {
          moduleRef = await Test.createTestingModule({
            imports: [
              BullModule.registerQueueAsync({
                name: 'test',
                useFactory: () => ({
                  processors: [fakeProcessor],
                  redis: {
                    host: '0.0.0.0',
                    port: 6380,
                  },
                }),
              }),
            ],
          }).compile();
        });
        afterAll(async () => {
          await moduleRef.close();
        });
        it('should inject the queue with the given name', () => {
          const queue: Queue = moduleRef.get<Queue>(getQueueToken('test'));
          expect(queue).toBeDefined();
          expect(queue.name).toEqual('test');
        });
        it('the injected queue should have the given processor', () => {
          const queue: Queue = moduleRef.get<Queue>(getQueueToken('test'));
        });
      });
    });
    describe('multiple configurations', () => {
      describe('useFactory', () => {
        beforeAll(async () => {
          moduleRef = await Test.createTestingModule({
            imports: [
              BullModule.registerQueueAsync(
                {
                  name: 'test1',
                  useFactory: () => ({
                    connection: {
                      host: '0.0.0.0',
                      port: 6380,
                    },
                  }),
                },
                {
                  name: 'test2',
                  useFactory: () => ({
                    connection: {
                      host: '0.0.0.0',
                      port: 6380,
                    },
                  }),
                },
              ),
            ],
          }).compile();
        });
        afterAll(async () => {
          await moduleRef.close();
        });
        it('should inject the queue with name "test1"', () => {
          const queue: Queue = moduleRef.get<Queue>(getQueueToken('test1'));
          expect(queue).toBeDefined();
          expect(queue.name).toEqual('test1');
        });
        it('should inject the queue with name "test2"', () => {
          const queue: Queue = moduleRef.get<Queue>(getQueueToken('test2'));
          expect(queue).toBeDefined();
          expect(queue.name).toEqual('test2');
        });
      });
    });
  });

  describe('forRootAsync + registerQueueAsync', () => {
    let moduleRef: TestingModule;

    describe('single configuration', () => {
      describe('useFactory', () => {
        const fakeProcessor = jest.fn();
        beforeAll(async () => {
          moduleRef = await Test.createTestingModule({
            imports: [
              BullModule.forRootAsync({
                useFactory: () => ({
                  connection: {
                    host: '0.0.0.0',
                    port: 6380,
                  },
                }),
              }),
              BullModule.registerQueueAsync({
                name: 'test',
                useFactory: () => ({
                  processors: [fakeProcessor],
                }),
              }),
            ],
          }).compile();
        });
        afterAll(async () => {
          await moduleRef.close();
        });
        it('should inject the queue with the given name', () => {
          const queue = moduleRef.get<Queue>(getQueueToken('test'));

          expect(queue).toBeDefined();
          expect(queue.name).toEqual('test');
        });
        it('the injected queue should have the given processor', () => {
          const queue = moduleRef.get<Queue>(getQueueToken('test'));
        });
      });
    });

    describe('multiple configurations', () => {
      describe('useFactory', () => {
        beforeAll(async () => {
          moduleRef = await Test.createTestingModule({
            imports: [
              BullModule.forRootAsync({
                useFactory: () => ({
                  connection: {
                    host: '0.0.0.0',
                    port: 6380,
                  },
                }),
              }),
              BullModule.registerQueueAsync({ name: 'test1' }),
              BullModule.registerQueue({ name: 'test2' }),
            ],
          }).compile();
        });
        afterAll(async () => {
          await moduleRef.close();
        });
        it('should inject the queue with name "test1"', () => {
          const queue = moduleRef.get<Queue>(getQueueToken('test1'));

          expect(queue).toBeDefined();
          expect(queue.name).toEqual('test1');
        });
        it('should inject the queue with name "test2"', () => {
          const queue = moduleRef.get<Queue>(getQueueToken('test2'));

          expect(queue).toBeDefined();
          expect(queue.name).toEqual('test2');
        });
      });
    });
  });

  describe('forRootAsync + registerQueueAsync', () => {
    let moduleRef: TestingModule;

    describe('single configuration', () => {
      describe('useFactory', () => {
        const fakeProcessor = jest.fn();
        beforeAll(async () => {
          moduleRef = await Test.createTestingModule({
            imports: [
              BullModule.forRootAsync({
                useFactory: () => ({
                  connection: {
                    host: '0.0.0.0',
                    port: 6380,
                  },
                }),
              }),
              BullModule.registerQueueAsync({
                name: 'test',
                useFactory: () => ({
                  processors: [fakeProcessor],
                }),
              }),
            ],
          }).compile();
        });
        afterAll(async () => {
          await moduleRef.close();
        });
        it('should inject the queue with the given name', () => {
          const queue = moduleRef.get<Queue>(getQueueToken('test'));

          expect(queue).toBeDefined();
          expect(queue.name).toEqual('test');
        });
      });
    });

    describe('multiple shared configurations', () => {
      describe('useFactory', () => {
        beforeAll(async () => {
          moduleRef = await Test.createTestingModule({
            imports: [
              BullModule.forRootAsync({
                useFactory: () => ({
                  connection: {
                    host: '0.0.0.0',
                    port: 6380,
                  },
                }),
              }),
              BullModule.registerQueueAsync({ name: 'test1' }),
              BullModule.registerQueue({
                name: 'test2',
              }),
            ],
          }).compile();
        });
        afterAll(async () => {
          await moduleRef.close();
        });
        it('should inject the queue with name "test1"', () => {
          const queue = moduleRef.get<Queue>(getQueueToken('test1'));

          expect(queue).toBeDefined();
          expect(queue.name).toEqual('test1');
        });
        it('should inject the queue with name "test2"', () => {
          const queue = moduleRef.get<Queue>(getQueueToken('test2'));

          expect(queue).toBeDefined();
          expect(queue.name).toEqual('test2');
        });
      });
    });
  });

  describe('full flow (job handling)', () => {
    const fakeProcessor = jest.fn();
    let testingModule: TestingModule;

    beforeAll(async () => {
      testingModule = await Test.createTestingModule({
        imports: [
          BullModule.registerQueue({
            name: 'full_flow',
            connection: {
              host: '0.0.0.0',
              port: 6380,
            },
            processors: [fakeProcessor],
          }),
        ],
      }).compile();
    });
    afterAll(async () => {
      await testingModule.close();
    });

    it('should process jobs with the given processors', async () => {
      const queue = testingModule.get<Queue>(getQueueToken('full_flow'));

      await queue.add('job1', null);

      return new Promise<void>((resolve) => {
        setTimeout(async () => {
          expect(fakeProcessor).toHaveBeenCalledTimes(1);
          resolve();
        }, 1000);
      });
    });
  });
});
