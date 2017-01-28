![typhonjs-color-logger](https://i.imgur.com/lVMXg3h.png)

[![NPM](https://img.shields.io/npm/v/typhonjs-color-logger.svg?label=npm)](https://www.npmjs.com/package/typhonjs-color-logger)
[![Documentation](http://docs.typhonjs.io/typhonjs-node-utils/typhonjs-color-logger/badge.svg)](http://docs.typhonjs.io/typhonjs-node-utils/typhonjs-color-logger/)
[![Code Style](https://img.shields.io/badge/code%20style-allman-yellowgreen.svg?style=flat)](https://en.wikipedia.org/wiki/Indent_style#Allman_style)
[![License](https://img.shields.io/badge/license-MPLv2-yellowgreen.svg?style=flat)](https://github.com/typhonjs-node-utils/typhonjs-color-logger/blob/master/LICENSE)
[![Gitter](https://img.shields.io/gitter/room/typhonjs/TyphonJS.svg)](https://gitter.im/typhonjs/TyphonJS)

[![Build Status](https://travis-ci.org/typhonjs-node-utils/typhonjs-color-logger.svg?branch=master)](https://travis-ci.org/typhonjs-node-utils/typhonjs-color-logger)
[![Coverage](https://img.shields.io/codecov/c/github/typhonjs-node-utils/typhonjs-color-logger.svg)](https://codecov.io/github/typhonjs-node-utils/typhonjs-color-logger)
[![Dependency Status](https://david-dm.org/typhonjs-node-utils/typhonjs-color-logger.svg)](https://david-dm.org/typhonjs-node-utils/typhonjs-color-logger)

Provides a color coded logger for ANSI terminal usage. In addition to providing a global scope logger
`typhonjs-color-logger` is optionally plugin enabled via `typhonjs-plugin-manager` and can self-register on an
eventbus with all methods exposed as event bindings.

In the future an option to use CSS colors for browser usage will be enabled.

There are several format options to display additional data / info including location where the log method is
invoked in addition to a time stamp. By default the time stamp option is disabled.

When passing in an Error for logging the stack trace of the error will be used for info and trace creation. The
`trace` method will automatically generate a stack trace.

format:
`[LogLevel] [Time] [File] log text`

Log level and color:
- fatal: light red
- error: red
- warn: yellow
- info: green
- debug: blue
- verbose: purple
- trace: light cyan

Each log method for the log levels above have two alternate versions that are accessed by appending `NoColor` or
`Raw` to the method name. Or if using event bindings appending `:nocolor` or `:raw`. The no color option with, well,
no color outputting the message with the current log format and the raw format will output just the raw message with
no format or color applied.

In addition trace inclusive and exclusive regexp filtering is available to eliminate spurious code removing it from
the stack trace. By default the typhonjs-color-logger and backbone-esnext-events is excluded from trace results.
Additionally the following events from typhonjs-plugin-manager are handled to automatically add and remove trace
filters from plugins added & removed via the event bindings: `typhonjs:plugin:manager:added:plugin`,
`typhonjs:plugin:manager:plugin:changed:eventbus`, and `typhonjs:plugin:manager:removed:plugin`. To skip auto
filter registration for a particular plugin set `logAutoFilter` to false in the associated plugins options.

A simple example:
```
import logger from 'typhonjs-color-logger';

// simple usage
logger.error('An error occurred!');
```

Example `typhonjs-plugin-manager` usage:
```
import PluginManager    from 'typhonjs-plugin-manager';
import eventbus         from 'backbone-esnext-eventbus';

const pluginManager = new PluginManager({ eventbus });

// This will automatically wire up typhonjs-color-logger to the eventbus.
pluginManager.add({ name: typhonjs-color-logger });

// simple usage
eventbus.trigger('log:error', 'An error occurred!');
```

Please see:
- https://www.npmjs.com/package/typhonjs-plugin-manager
- https://www.npmjs.com/package/backbone-esnext-eventbus
