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
});
