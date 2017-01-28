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

      assert.strictEqual(result, '\u001b[33m[W] [runnable.js:345:21] A warning!\u001b[0m');
   });
});
