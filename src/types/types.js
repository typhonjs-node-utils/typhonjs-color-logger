/**
 * Provides ColorLoggerOptions
 * @typedef {object}    ColorLoggerOptions
 * @property {boolean}  [autoPluginFilters=false] - If true inclusive trace filters are added / removed automatically in
 *                                                 response to 'typhonjs:plugin:manager:plugin:added' and
 *                                                 'typhonjs:plugin:manager:plugin:removed'.
 * @property {boolean}  [consoleEnabled=true] - If true output to `console.log` is enabled.
 * @property {boolean}  [filtersEnabled=true] - If true trace filters are applied in `_getInfo`.
 * @property {boolean}  [showDate=false] - If true the date is added to format results
 * @property {boolean}  [showInfo=true] - If true the location of where the log method is invoked is added to output.
 */

/**
 * Defines a trace filter.
 * @typedef {object}    TraceFilterData
 * @property {boolean}  [enabled=true] - The enabled state of the filter.
 * @property {string}   filterString - The raw filter string used to create the RegExp.
 * @property {string}   name - The filter name.
 * @property {string}   type - The filter type: 'exclusive' or 'inclusive'.
 */
