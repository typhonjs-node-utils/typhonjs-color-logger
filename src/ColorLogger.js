import TraceFilter from './TraceFilter.js';

/**
 * Provides a color coded logger for ANSI terminal usage. In addition to providing a global scope logger
 * `typhonjs-color-logger` is optionally plugin enabled via `typhonjs-plugin-manager` and can self-register on an
 * eventbus with all methods exposed as event bindings.
 *
 * In the future an option to use CSS colors for browser usage will be enabled.
 *
 * There are several format options to display additional data / info including location where the log method is
 * invoked in addition to a time stamp. By default the time stamp option is disabled.
 *
 * When passing in an Error for logging the stack trace of the error will be used for info and trace creation. The
 * `trace` method will automatically generate a stack trace.
 *
 * format:
 * ``[LogLevel] [Time] [File] log text``
 *
 * Log level and color:
 * - fatal: light red
 * - error: red
 * - warn: yellow
 * - info: green
 * - debug: blue
 * - verbose: purple
 * - trace: light cyan
 *
 * Each log method for the log levels above have two alternate versions that are accessed by appending `Compact`,
 * `NoColor` or `Raw` to the method name. Or if using event bindings appending `:compact`, `:nocolor` or `:raw`. The no
 * color option with, well, no color outputting the message with the current log format and the raw format will output
 * just the raw message with no format or color applied.
 *
 * In addition trace inclusive and exclusive regexp filtering is available to eliminate spurious code removing it from
 * the stack trace. By default the typhonjs-color-logger and backbone-esnext-events is excluded from trace results.
 * Additionally the following events from typhonjs-plugin-manager are handled to automatically add and remove trace
 * filters from plugins added & removed via the event bindings: `typhonjs:plugin:manager:plugin:added`,
 * `typhonjs:plugin:manager:eventbus:changed`, and `typhonjs:plugin:manager:plugin:removed`. To skip auto
 * filter registration for a particular plugin set `logAutoFilter` to false in the associated plugins options.

 * @example
 * import logger from 'typhonjs-color-logger';
 *
 * // simple usage
 * logger.error('An error occurred!');
 *
 * @example
 * import PluginManager    from 'typhonjs-plugin-manager';
 * import eventbus         from 'backbone-esnext-eventbus';
 *
 * const pluginManager = new PluginManager({ eventbus });
 *
 * // This will automatically wire up typhonjs-color-logger to the eventbus.
 * pluginManager.add({ name: typhonjs-color-logger });
 *
 * // simple usage
 * eventbus.trigger('log:error', 'An error occurred!');
 *
 * @see https://www.npmjs.com/package/typhonjs-plugin-manager
 * @see https://www.npmjs.com/package/backbone-esnext-eventbus
 */
export class ColorLogger
{
   /**
    * Instantiates ColorLogger allowing optional options to be set.
    *
    * @param {ColorLoggerOptions}   [options] - Optional ColorLoggerOptions to set.
    */
   constructor(options = {})
   {
      if (typeof options !== 'object') { throw new TypeError(`'options' is not an object.`); }

      /**
       * Stores ColorLogger options.
       * @type {ColorLoggerOptions}
       * @private
       */
      this._options =
      {
         autoPluginFilters: false,
         consoleEnabled: true,
         filtersEnabled: true,
         showDate: false,
         showInfo: true
      };

      /**
       * @type number
       * @private
       */
      this._logLevel = s_LOG_LEVELS['info'];

      /**
       * Stores all exclusive trace filters.
       * @type {Map<string, TraceFilter>}
       * @private
       */
      this._exclusiveTraceFilters = new Map();

      /**
       * Stores all inclusive trace filters.
       * @type {Map<string, TraceFilter>}
       * @private
       */
      this._inclusiveTraceFilters = new Map();

      this.addFilter({ type: 'exclusive', name: 'typhonjs-color-logger', filterString: 'typhonjs-color-logger' });
      this.addFilter({ type: 'exclusive', name: 'backbone-esnext-events', filterString: 'backbone-esnext-events' });

      this.setOptions(options);
   }

   /**
    * Adds a new trace filter.
    *
    * @param {TraceFilterData}   config - The filter config to add.
    *
    * @returns {boolean} True if the filter was added.
    */
   addFilter(config)
   {
      if (typeof config !== 'object') { throw new TypeError(`'filterConfig' is not an 'object'.`); }
      if (typeof config.name !== 'string') { throw new TypeError(`'config.name' is not a 'string'.`); }
      if (typeof config.filterString !== 'string') { throw new TypeError(`'config.filterString' is not a 'string'.`); }

      if (config.type !== 'exclusive' && config.type !== 'inclusive')
      {
         this.error(`'config.type' must be 'exclusive' or 'inclusive'`);

         return false;
      }

      const filterMap = config.type === 'exclusive' ? this._exclusiveTraceFilters : this._inclusiveTraceFilters;

      if (filterMap.has(config.name))
      {
         this.warn(`A filter with name: '${config.name} already exists.`);

         return false;
      }

      const filter = new TraceFilter(config.name, config.filterString);

      if (typeof config.enabled === 'boolean') { filter.enabled = config.enabled; }

      filterMap.set(config.name, filter);

      return true;
   }

   /**
    * Initializes multiple trace filters in a single call.
    *
    * @param {Array<TraceFilterData>} filterConfigs - An array of filter config object hash entries.
    *
    * @returns {boolean} If true all filters were added successfully.
    */
   addFilters(filterConfigs = [])
   {
      if (!Array.isArray(filterConfigs)) { throw new TypeError(`'plugins' is not an array.`); }

      let success = true;

      for (const config of filterConfigs)
      {
         if (!this.addFilter(config)) { success = false; }
      }

      return success;
   }

   /**
    * Applies any exclusive then inclusive filters against a given value.
    *
    * @param {string}   value - A value to test against all filters.
    *
    * @returns {boolean} If true then the value matched a filter.
    * @private
    */
   _applyFilters(value)
   {
      // Early out if there are no trace filters.
      if (this._exclusiveTraceFilters.size === 0 && this._inclusiveTraceFilters.size === 0) { return false; }

      // Start filtered as false and if an exclusive filter matches then set it to true..
      let filtered = false;

      for (const filter of this._exclusiveTraceFilters.values())
      {
         if (filter.test(value)) { filtered = true; break; }
      }

      // If an exclusive filter matched then exit early.
      if (filtered) { return filtered; }

      // Invert filtered to being true if there are any inclusive filters. If an inclusive filter matches then set
      // it to false.
      filtered = this._inclusiveTraceFilters.size > 0;

      for (const filter of this._inclusiveTraceFilters.values())
      {
         if (filter.test(value)) { filtered = false; break; }
      }

      return filtered;
   }


   /**
    * Gets the filter data for a trace filter by name.
    *
    * @param {boolean|undefined} enabled - If enabled is a boolean it will return filters given their enabled state.
    *
    * @returns {Array<TraceFilterData>}
    */
   getAllFilterData(enabled = void 0)
   {
      if (typeof enabled !== 'boolean' && typeof enabled !== 'undefined')
      {
         throw new TypeError(`'enabled' is not a 'boolean' or 'undefined'.`);
      }

      const results = [];

      // Return all filter data if enabled is not defined.
      const allFilters = typeof enabled === 'undefined';

      for (const filter of this._exclusiveTraceFilters.values())
      {
         if (allFilters || filter.enabled === enabled)
         {
            results.push(
            {
               enabled: filter.enabled,
               filterString: filter.filterString,
               name: filter.name,
               type: 'exclusive'
            });
         }
      }

      for (const filter of this._inclusiveTraceFilters.values())
      {
         if (allFilters || filter.enabled === enabled)
         {
            results.push(
            {
               enabled: filter.enabled,
               filterString: filter.filterString,
               name: filter.name,
               type: 'inclusive'
            });
         }
      }

      return results;
   }

   /**
    * Gets the filter data for a trace filter by name.
    *
    * @param {string}   type - The type of filter; must be 'exclusive' or 'inclusive'.
    *
    * @param {string}   name - The name of the filter.
    *
    * @returns {TraceFilterData|undefined}
    */
   getFilterData(type, name)
   {
      if (type !== 'exclusive' && type !== 'inclusive')
      {
         throw new Error(`'type' must be 'exclusive' or 'inclusive'`);
      }

      const filterMap = type === 'exclusive' ? this._exclusiveTraceFilters : this._inclusiveTraceFilters;

      const filter = filterMap.get(name);

      if (filter instanceof TraceFilter)
      {
         return {
            enabled: filter.enabled,
            filterString: filter.filterString,
            name: filter.name,
            type
         };
      }

      return void 0;
   }

   /**
    * Gets a trace filter enabled state.
    *
    * @param {string}   type - The type of filter; must be 'exclusive' or 'inclusive'.
    *
    * @param {string}   name - The name of the filter.
    *
    * @returns {boolean} True if the filter enabled state was modified.
    */
   getFilterEnabled(type, name)
   {
      if (type !== 'exclusive' && type !== 'inclusive')
      {
         throw new Error(`'type' must be 'exclusive' or 'inclusive'`);
      }

      const filterMap = type === 'exclusive' ? this._exclusiveTraceFilters : this._inclusiveTraceFilters;

      const filter = filterMap.get(name);

      if (filter instanceof TraceFilter)
      {
         return filter.enabled;
      }

      return false;
   }

   /**
    * Get the log level
    *
    * @returns {*}
    */
   getLogLevel()
   {
      return this._logLevel;
   }

   /**
    * Returns a copy of the logger options.
    *
    * @returns {ColorLoggerOptions} - Logger options.
    */
   getOptions()
   {
      return JSON.parse(JSON.stringify(this._options));
   }

   /**
    * Generates log information from where the logger invocation originated.
    *
    * @param {Error}    error - An optional Error to trace instead of artificially generating one.
    *
    * @param {boolean}  [isFullTrace=true] - If true then process remaining trace.
    *
    * @return {{info: string, trace: String[]}} info: file name and line number; trace: remaining stack trace if
    *                                           enabled.
    */
   getTraceInfo(error, isFullTrace = true)
   {
      let info = 'no stack trace';
      const trace = [];

      let processError = error;

      if (!(processError instanceof Error))
      {
         try { throw new Error(); }
         catch (err) { processError = err; }
      }

      // Make sure there is a entry in `processError`.
      if (typeof processError.stack === 'string')
      {
         const lines = processError.stack.split('\n');

         let cntr = 0;

         for (; cntr < lines.length; cntr++)
         {
            if (this._options.filtersEnabled && this._applyFilters(lines[cntr])) { continue; }

            const matched = lines[cntr].match(/([\w\d\-_.]*:\d+:\d+)/);

            if (matched !== null)
            {
               info = matched[1];
               break;
            }
         }

         // If gathering trace info continue to push lines to `trace`. Ignoring any lines that originate from
         // ColorLogger or `backbone-esnext-events` plus an optional filter.
         if (isFullTrace)
         {
            for (; cntr < lines.length; cntr++)
            {
               if (this._options.filtersEnabled && this._applyFilters(lines[cntr])) { continue; }

               trace.push(lines[cntr]);
            }
         }
      }

      return { info, trace };
   }

   /**
    * Returns whether the given log level is enabled.
    *
    * @param {string}   level - log level
    * @returns {boolean}
    */
   isLevelEnabled(level)
   {
      const requestedLevel = s_LOG_LEVELS[level];

      if (typeof requestedLevel === 'undefined' || requestedLevel === null)
      {
         console.log(`isLevelEnabled - unknown log level: ${level}`);
         return false;
      }

      return s_IS_LEVEL_ENABLED(this.getLogLevel(), requestedLevel);
   }

   /**
    * Returns true if the given level is a valid log level.
    *
    * @param {string}   level - The log level string to test.
    *
    * @returns {boolean}
    */
   isValidLogLevel(level)
   {
      return typeof level === 'string' && typeof s_LOG_LEVELS[level] === 'number';
   }

   /**
    * Display log message.
    *
    * @param {string}   level - log level: `fatal`, `error`, `warn`, `info`, `debug`, `verbose`, `trace`.
    *
    * @param {boolean}  [compact=false] - If true then all JSON object conversion is compacted.
    *
    * @param {boolean}  [nocolor=false] - If true then no color is applied.
    *
    * @param {boolean}  [raw=false] - If true then just the raw message is logged at the given level.
    *
    * @param {boolean}  [time=false] - If true then message is logged at the given level with a timestamp.
    *
    * @param {...*}     msg - log message.
    *
    * @returns {string|undefined} formatted log message or undefined if log level is not enabled.
    * @private
    */
   _output(level, compact = false, nocolor = false, raw = false, time = false,  ...msg)
   {
      if (!s_IS_LEVEL_ENABLED(this.getLogLevel(), s_LOG_LEVELS[level])) { return; }

      const text = [];

      const isTrace = level === 'trace';

      for (const m of msg)
      {
         if (typeof m === 'object' && !(m instanceof Error))
         {
            text.push(compact ? JSON.stringify(m) : JSON.stringify(m, null, 3));
         }
         else if (m instanceof Error)
         {
            const result = this.getTraceInfo(m);

            text.push(`${m.message}\n${result.trace.join('\n')}`);
         }
         else
         {
            text.push(m);
         }
      }

      const color = nocolor ? '' : s_LEVEL_TO_COLOR[level];

      const spacer = raw ? '' : ' ';

      let info = '';
      let trace = '';

      if (this._options.showInfo && !raw && !time)
      {
         const infoSpace = nocolor ? '' : ' ';

         const result = this.getTraceInfo(void 0, isTrace);

         info = `${infoSpace}[${result.info}]`;
         trace = isTrace ? `\n${result.trace.join('\n')}\n` : '';
      }

      let now = '';

      if (time || (this._options.showDate && !raw))
      {
         const d = new Date();

         let month = d.getMonth() + 1;
         if (month < 10) { month = `0${month}`; }

         let date = d.getDate();
         if (date < 10) { date = `0${date}`; }

         let hour = d.getHours();
         if (hour < 10) { hour = `0${hour}`; }

         let minutes = d.getMinutes();
         if (minutes < 10) { minutes = `0${minutes}`; }

         let sec = d.getSeconds();
         if (sec < 10) { sec = `0${sec}`; }

         now = ` [${d.getFullYear()}-${month}-${date}T${hour}:${minutes}:${sec}.${d.getMilliseconds()}Z]`;
      }

      const log = `${color}${now}${info}${spacer}${trace}${text.join('\n')}[0m`;

      if (this._options.consoleEnabled)
      {
         console.log(log);
      }

      return log;
   }

   /**
    * Removes all trace filters.
    */
   removeAllFilters()
   {
      this._exclusiveTraceFilters.clear();
      this._inclusiveTraceFilters.clear();
   }

   /**
    * Removes a trace filter by name
    *
    * @param {string}   type - The type of filter; must be 'exclusive' or 'inclusive'.
    *
    * @param {string}   name - The name of the filter.
    *
    * @returns {boolean} True if the filter was removed.
    */
   removeFilter(type, name)
   {
      if (type !== 'exclusive' && type !== 'inclusive')
      {
         throw new Error(`'type' must be 'exclusive' or 'inclusive'`);
      }

      const filterMap = type === 'exclusive' ? this._exclusiveTraceFilters : this._inclusiveTraceFilters;

      return filterMap.delete(name);
   }

   /**
    * Sets a trace filters enabled state.
    *
    * @param {string}   type - The type of filter; must be 'exclusive' or 'inclusive'.
    *
    * @param {string}   name - The name of the filter.
    *
    * @param {boolean}  enabled - The new enabled state.
    *
    * @returns {boolean} True if the filter enabled state was modified.
    */
   setFilterEnabled(type, name, enabled)
   {
      if (type !== 'exclusive' && type !== 'inclusive')
      {
         throw new Error(`'type' must be 'exclusive' or 'inclusive'`);
      }

      const filterMap = type === 'exclusive' ? this._exclusiveTraceFilters : this._inclusiveTraceFilters;

      const filter = filterMap.get(name);

      if (filter instanceof TraceFilter)
      {
         filter.enabled = enabled;
         return true;
      }

      return false;
   }

   /**
    * Sets the current log level.
    *
    * @param {string}   level - log level
    * @returns {boolean}
    */
   setLogLevel(level)
   {
      const requestedLevel = s_LOG_LEVELS[level];

      if (typeof requestedLevel === 'undefined' || requestedLevel === null)
      {
         console.log(`setLogLevel - unknown log level: ${level}`);
         return false;
      }

      this._logLevel = requestedLevel;
      return true;
   }

   /**
    * Set optional parameters.
    *
    * @param {ColorLoggerOptions} options - Defines optional parameters to set.
    */
   setOptions(options = {})
   {
      if (typeof options !== 'object') { throw new TypeError(`'options' is not an 'object'.`); }

      if (typeof options.autoPluginFilters === 'boolean')
      {
         this._options.autoPluginFilters = options.autoPluginFilters;
      }

      if (typeof options.consoleEnabled === 'boolean') { this._options.consoleEnabled = options.consoleEnabled; }
      if (typeof options.filtersEnabled === 'boolean') { this._options.filtersEnabled = options.filtersEnabled; }
      if (typeof options.showDate === 'boolean') { this._options.showDate = options.showDate; }
      if (typeof options.showInfo === 'boolean') { this._options.showInfo = options.showInfo; }
   }

   // Logging methods -----------------------------------------------------------------------------------------------

   /**
    * Display fatal (light red) log.
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   fatal(...msg) { return this._output('fatal', false, false, false, false, ...msg); }

   /**
    * Display fatal (light red) log; objects compacted.
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   fatalCompact(...msg) { return this._output('fatal', true, false, false, false, ...msg); }

   /**
    * Display fatal log.
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   fatalNoColor(...msg) { return this._output('fatal', false, true, false, false, ...msg); }

   /**
    * Display raw fatal log (no style / no color).
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   fatalRaw(...msg) { return this._output('fatal', false, true, true, false, ...msg); }

   /**
    * Display fatal log (with time).
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   fatalTime(...msg) { return this._output('fatal', false, false, false, true, ...msg); }

   /**
    * Display error(red) log.
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   error(...msg) { return this._output('error', false, false, false, false, ...msg); }

   /**
    * Display error(red) log; objects compacted.
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   errorCompact(...msg) { return this._output('error', true, false, false, false, ...msg); }

   /**
    * Display error log.
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   errorNoColor(...msg) { return this._output('error', false, true, false, false, ...msg); }

   /**
    * Display raw error log (no style / no color).
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   errorRaw(...msg) { return this._output('error', false, true, true, false, ...msg); }

   /**
    * Display error log (with time).
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   errorTime(...msg) { return this._output('error', false, false, false, true, ...msg); }

   /**
    * Display warning (yellow) log.
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   warn(...msg) { return this._output('warn', false, false, false, false, ...msg); }

   /**
    * Display warning (yellow) log; objects compacted.
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   warnCompact(...msg) { return this._output('warn', true, false, false, false, ...msg); }

   /**
    * Display warning log.
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   warnNoColor(...msg) { return this._output('warn', false, true, false, false, ...msg); }

   /**
    * Display raw warn log (no style / no color).
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   warnRaw(...msg) { return this._output('warn', false, true, true, false, ...msg); }

   /**
    * Display warn log (with time).
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   warnTime(...msg) { return this._output('warn', false, false, false, true, ...msg); }

   /**
    * Display info (green) log.
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   info(...msg) { return this._output('info', false, false, false, false, ...msg); }

   /**
    * Display info (green) log; objects compacted.
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   infoCompact(...msg) { return this._output('info', true, false, false, false, ...msg); }

   /**
    * Display info log.
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   infoNoColor(...msg) { return this._output('info', false, true, false, false, ...msg); }

   /**
    * Display raw info log (no style / no color).
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   infoRaw(...msg) { return this._output('info', false, true, true, false, ...msg); }

   /**
    * Display info log (with time).
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   infoTime(...msg) { return this._output('info', false, false, false, true, ...msg); }

   /**
    * Display debug (blue) log.
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   debug(...msg) { return this._output('debug', false, false, false, false, ...msg); }

   /**
    * Display debug (blue) log; objects compacted.
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   debugCompact(...msg) { return this._output('debug', true, false, false, false, ...msg); }

   /**
    * Display debug log.
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   debugNoColor(...msg) { return this._output('debug', false, true, false, false, ...msg); }

   /**
    * Display raw debug log (no style / no color).
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   debugRaw(...msg) { return this._output('debug', false, true, true, false, ...msg); }

   /**
    * Display debug log (with time).
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   debugTime(...msg) { return this._output('debug', false, false, false, true, ...msg); }

   /**
    * Display verbose (purple) log.
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   verbose(...msg) { return this._output('verbose', false, false, false, false, ...msg); }

   /**
    * Display verbose (purple) log; objects compacted.
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   verboseCompact(...msg) { return this._output('verbose', true, false, false, false, ...msg); }

   /**
    * Display verbose log.
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   verboseNoColor(...msg) { return this._output('verbose', false, true, false, false, ...msg); }

   /**
    * Display raw verbose log (no style / no color).
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   verboseRaw(...msg) { return this._output('verbose', false, true, true, false, ...msg); }

   /**
    * Display verbose log (with time).
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   verboseTime(...msg) { return this._output('verbose', false, false, false, true, ...msg); }

   /**
    * Display trace (purple) log.
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   trace(...msg) { return this._output('trace', false, false, false, false, ...msg); }

   /**
    * Display trace (purple) log; objects compacted.
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   traceCompact(...msg) { return this._output('trace', true, false, false, false, ...msg); }

   /**
    * Display trace log.
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   traceNoColor(...msg) { return this._output('trace', false, true, false, false, ...msg); }

   /**
    * Display raw trace log (no style / no color).
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   traceRaw(...msg) { return this._output('trace', false, true, true, false, ...msg); }

   /**
    * Display trace log (with time).
    * @param {...*} msg - log message.
    * @returns {string} formatted log message.
    */
   traceTime(...msg) { return this._output('trace', false, false, false, true, ...msg); }
}

/**
 * ASCII ESCAPE SEQUENCE https://en.wikipedia.org/wiki/ANSI_escape_code#Colors
 * @type {{n: string, v: string, d: string, i: string, w: string, e: string}}
 */
const s_LEVEL_TO_COLOR =
{
   fatal: '[1;31m[F]', // light red
   error: '[31m[E]',   // red
   warn: '[33m[W]',    // yellow
   info: '[32m[I]',    // green
   debug: '[34m[D]',   // blue
   verbose: '[35m[V]', // purple
   trace: '[1;36m[T]'  // light cyan
};

/**
 * Stores the log level name to level value.
 * @type {{off: number, fatal: number, error: number, warn: number, info: number, verbose: number, debug: number, trace: number, all: number}}
 */
const s_LOG_LEVELS =
{
   off: 8,
   fatal: 7,
   error: 6,
   warn: 5,
   info: 4,
   verbose: 3,
   debug: 2,
   trace: 1,
   all: 0
};

/**
 * Validates that the current / requested levels are numbers and that current level is less than requested level.
 *
 * @param {number}   currentLevel - The current ColorLogger level.
 *
 * @param {number}   requestedLevel - The requested level to log.
 *
 * @returns {boolean} True if the requested level is greater than or equal to the current enabled log level.
 */
const s_IS_LEVEL_ENABLED = (currentLevel, requestedLevel) =>
{
   return Number.isInteger(currentLevel) && Number.isInteger(requestedLevel) && currentLevel <= requestedLevel;
};

/**
 * The default logger instance.
 * @type {ColorLogger}
 */
const logger = new ColorLogger();

export default logger;

/**
 * Wires up Logger on the plugin eventbus.
 *
 * @param {PluginEvent} ev - The plugin event.
 *
 * @see https://www.npmjs.com/package/typhonjs-plugin-manager
 *
 * @ignore
 */
export function onPluginLoad(ev)
{
   const eventbus = ev.eventbus;

   let eventPrepend = '';

   const options = ev.pluginOptions;

   // Apply any plugin options.
   if (typeof options === 'object')
   {
      logger.setOptions(options);

      // If `eventPrepend` is defined then it is prepended before all event bindings.
      if (typeof options.eventPrepend === 'string') { eventPrepend = `${options.eventPrepend}:`; }

      if (Array.isArray(options.filterConfigs)) { logger.addFilters(options.filterConfigs); }
   }

   eventbus.on(`${eventPrepend}log:fatal`, logger.fatal, logger);
   eventbus.on(`${eventPrepend}log:fatal:compact`, logger.fatalCompact, logger);
   eventbus.on(`${eventPrepend}log:fatal:nocolor`, logger.fatalNoColor, logger);
   eventbus.on(`${eventPrepend}log:fatal:raw`, logger.fatalRaw, logger);
   eventbus.on(`${eventPrepend}log:fatal:time`, logger.fatalTime, logger);
   eventbus.on(`${eventPrepend}log:error`, logger.error, logger);
   eventbus.on(`${eventPrepend}log:error:compact`, logger.errorCompact, logger);
   eventbus.on(`${eventPrepend}log:error:nocolor`, logger.errorNoColor, logger);
   eventbus.on(`${eventPrepend}log:error:raw`, logger.errorRaw, logger);
   eventbus.on(`${eventPrepend}log:error:time`, logger.errorTime, logger);
   eventbus.on(`${eventPrepend}log:warn`, logger.warn, logger);
   eventbus.on(`${eventPrepend}log:warn:compact`, logger.warnCompact, logger);
   eventbus.on(`${eventPrepend}log:warn:nocolor`, logger.warnNoColor, logger);
   eventbus.on(`${eventPrepend}log:warn:raw`, logger.warnRaw, logger);
   eventbus.on(`${eventPrepend}log:warn:time`, logger.warnTime, logger);
   eventbus.on(`${eventPrepend}log:info`, logger.info, logger);
   eventbus.on(`${eventPrepend}log:info:compact`, logger.infoCompact, logger);
   eventbus.on(`${eventPrepend}log:info:nocolor`, logger.infoNoColor, logger);
   eventbus.on(`${eventPrepend}log:info:raw`, logger.infoRaw, logger);
   eventbus.on(`${eventPrepend}log:info:time`, logger.infoTime, logger);
   eventbus.on(`${eventPrepend}log:debug`, logger.debug, logger);
   eventbus.on(`${eventPrepend}log:debug:compact`, logger.debugCompact, logger);
   eventbus.on(`${eventPrepend}log:debug:nocolor`, logger.debugNoColor, logger);
   eventbus.on(`${eventPrepend}log:debug:raw`, logger.debugRaw, logger);
   eventbus.on(`${eventPrepend}log:debug:time`, logger.debugTime, logger);
   eventbus.on(`${eventPrepend}log:verbose`, logger.verbose, logger);
   eventbus.on(`${eventPrepend}log:verbose:compact`, logger.verboseCompact, logger);
   eventbus.on(`${eventPrepend}log:verbose:nocolor`, logger.verboseNoColor, logger);
   eventbus.on(`${eventPrepend}log:verbose:raw`, logger.verboseRaw, logger);
   eventbus.on(`${eventPrepend}log:verbose:time`, logger.verboseTime, logger);
   eventbus.on(`${eventPrepend}log:trace`, logger.trace, logger);
   eventbus.on(`${eventPrepend}log:trace:compact`, logger.traceCompact, logger);
   eventbus.on(`${eventPrepend}log:trace:nocolor`, logger.traceNoColor, logger);
   eventbus.on(`${eventPrepend}log:trace:raw`, logger.traceRaw, logger);
   eventbus.on(`${eventPrepend}log:trace:time`, logger.traceTime, logger);

   eventbus.on(`${eventPrepend}log:filter:add`, logger.addFilter, logger);
   eventbus.on(`${eventPrepend}log:filter:data:get:all`, logger.getAllFilterData, logger);
   eventbus.on(`${eventPrepend}log:filter:data:get`, logger.getFilterData, logger);
   eventbus.on(`${eventPrepend}log:filter:enabled:get`, logger.getFilterEnabled, logger);
   eventbus.on(`${eventPrepend}log:filter:enabled:set`, logger.setFilterEnabled, logger);
   eventbus.on(`${eventPrepend}log:filter:remove`, logger.removeFilter, logger);
   eventbus.on(`${eventPrepend}log:filter:remove:all`, logger.removeAllFilters, logger);
   eventbus.on(`${eventPrepend}log:level:get`, logger.getLogLevel, logger);
   eventbus.on(`${eventPrepend}log:level:is:enabled`, logger.isLevelEnabled, logger);
   eventbus.on(`${eventPrepend}log:level:is:valid`, logger.isValidLogLevel, logger);
   eventbus.on(`${eventPrepend}log:level:set`, logger.setLogLevel, logger);
   eventbus.on(`${eventPrepend}log:options:get`, logger.getOptions, logger);
   eventbus.on(`${eventPrepend}log:options:set`, logger.setOptions, logger);
   eventbus.on(`${eventPrepend}log:trace:info:get`, logger.getTraceInfo, logger);

   // Add plugin auto filter support for added plugins.
   eventbus.on('typhonjs:plugin:manager:plugin:added', (plugin) =>
   {
      // Always ignore adding an inclusive filter when typhonjs-color-logger is added.
      if (typeof plugin.name === 'string' && plugin.name === 'typhonjs-color-logger') { return; }

      if (logger.getOptions().autoPluginFilters && typeof plugin.scopedName === 'string' &&
       typeof plugin.targetEscaped === 'string' && typeof plugin.options === 'object')
      {
         // Skip auto filtering if the given plugin has logAutoFilter defined and it is false.
         if (typeof plugin.options.logAutoFilter === 'boolean' && !plugin.options.logAutoFilter) { return; }

         // Allow plugin options to override default 'inclusive' filter potentially making it 'exclusive'.
         const type = plugin.options.logAutoFilterType !== 'exclusive' ? 'inclusive' : 'exclusive';

         logger.addFilter({ type, name: plugin.scopedName, filterString: plugin.targetEscaped });
      }
   });

   // Add plugin auto filter re-registration support when plugin managers change eventbus / event binding prepend.
   eventbus.on('typhonjs:plugin:manager:eventbus:changed', (plugin) =>
   {
      if (logger.getOptions().autoPluginFilters && typeof plugin.scopedName === 'string' &&
       typeof plugin.targetEscaped === 'string' && typeof plugin.options === 'object')
      {
         // Skip auto filtering if the given plugin has logAutoFilter defined and it is false.
         if (typeof plugin.options.logAutoFilter === 'boolean' && !plugin.options.logAutoFilter) { return; }

         // Allow plugin options to override default 'inclusive' filter potentially making it 'exclusive'.
         const type = plugin.options.logAutoFilterType !== 'exclusive' ? 'inclusive' : 'exclusive';

         logger.removeFilter(type, plugin.oldScopedName);
         logger.addFilter({ type, name: plugin.newScopedName, filterString: plugin.targetEscaped });
      }
   });

   // Add plugin auto filter support for removed plugins.
   eventbus.on('typhonjs:plugin:manager:plugin:removed', (plugin) =>
   {
      if (logger.getOptions().autoPluginFilters && typeof plugin.scopedName === 'string' &&
       typeof plugin.options === 'object')
      {
         // Skip auto filtering if the given plugin has logAutoFilter defined and it is false.
         if (typeof plugin.options.logAutoFilter === 'boolean' && !plugin.options.logAutoFilter) { return; }

         // Allow plugin options to override default 'inclusive' filter potentially making it 'exclusive'.
         const type = plugin.options.logAutoFilterType !== 'exclusive' ? 'inclusive' : 'exclusive';

         logger.removeFilter(type, plugin.scopedName);
      }
   });
}

/**
 * Removes any trace filters when unloading plugin.
 *
 * @param {PluginEvent} ev - The plugin event.
 *
 * @see https://www.npmjs.com/package/typhonjs-plugin-manager
 *
 * @ignore
 */
export function onPluginUnload()
{
   logger.removeAllFilters();
}
