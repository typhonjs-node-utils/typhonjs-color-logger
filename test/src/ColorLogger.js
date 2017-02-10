import { assert } from 'chai';

import logger     from '../../src/ColorLogger.js';

// TODO: Add more tests!
describe('ColorLogger:', () =>
{
   // let oldConsole;

   // beforeEach(() => { oldConsole = console.log; });
   // afterEach(() => { console.log = oldConsole; });

   it('warn:', () =>
   {
      const result = logger.warn('A warning!');

      assert(result.startsWith('\u001b[33m[W]'));
   });

   describe('invalid log levels:', () =>
   {
      it('random:', () => assert.isFalse(logger.isValidLogLevel('random')));
      it('number:', () => assert.isFalse(logger.isValidLogLevel(2)));
      it('object:', () => assert.isFalse(logger.isValidLogLevel({})));
      it('array:', () => assert.isFalse(logger.isValidLogLevel([])));
   });

   describe('valid log levels:', () =>
   {
      it('off:', () => assert.isTrue(logger.isValidLogLevel('off')));
      it('fatal:', () => assert.isTrue(logger.isValidLogLevel('fatal')));
      it('error:', () => assert.isTrue(logger.isValidLogLevel('error')));
      it('warn:', () => assert.isTrue(logger.isValidLogLevel('warn')));
      it('info:', () => assert.isTrue(logger.isValidLogLevel('info')));
      it('verbose:', () => assert.isTrue(logger.isValidLogLevel('verbose')));
      it('debug:', () => assert.isTrue(logger.isValidLogLevel('debug')));
      it('trace:', () => assert.isTrue(logger.isValidLogLevel('trace')));
      it('all:', () => assert.isTrue(logger.isValidLogLevel('all')));
   });
});
