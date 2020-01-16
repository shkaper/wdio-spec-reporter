WDIO step-by-step reporter
==================

> A WebdriverIO plugin to report in step-by-step style.

## Installation

The easiest way is to keep `wdio-spec-reporter` as a devDependency in your `package.json`.

```json
{
  "devDependencies": {
    "step-by-step-reporter": "https://github.com/shkaper/wdio-spec-reporter.git#master"
  }
}
```

Instructions on how to install `WebdriverIO` can be found [here](http://webdriver.io/guide/getstarted/install.html).

## Configuration

To use this reporter, require it in your wdio.conf.js and add to `reporters` array:

```js
// wdio.conf.js
const StepByStepReporter = require('step-by-step-reporter')

module.exports = {
  // ...
  reporters: [StepByStepReporter],
  // ...
};
```

----

For more information on WebdriverIO see the [homepage](http://webdriver.io).
