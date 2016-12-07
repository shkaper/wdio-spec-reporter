import events from 'events'
import humanizeDuration from 'humanize-duration'
import colors from 'colors/safe'


const DURATION_LONG = {
    units: ['m', 's'],
    round: true,
    spacer: '',
}

const DURATION_SHORT = {
    units: ['ms'],
    round: false,
}

/**
 * Initialize a new `step-by-step-reporter` test reporter.
 *
 * @param {Runner} runner
 * @api public
 */
class StepByStepReporter extends events.EventEmitter {

    static get reporterName() {
        return 'step-by-step-reporter'
    }

    constructor(baseReporter, config, options = {}) {
        super()

        this.baseReporter = baseReporter
        this.config = config
        this.options = options
        this.shortEnglishHumanizer = humanizeDuration.humanizer({
            language: 'shortEn',
            languages: {
                shortEn: {
                    h: () => 'h',
                    m: () => 'm',
                    s: () => 's',
                    ms: () => 'ms'
                }
            }
        })

        this.errorCount = 0
        this.specs = {}
        this.results = {}

        this.on('runner:start', function(runner) {
            const cid = runner.cid
            const stats = this.baseReporter.stats
            const results = stats.runners[cid]
            const combo = StepByStepReporter.getBrowserCombo(results.capabilities)

            this.specs[runner.cid] = runner.specs
            this.results[runner.cid] = {
                passing: 0,
                pending: 0,
                failing: 0
            }
            this.currentPassing = 0
            console.log(colors.bold(`Running: ${combo}`));
        })

        this.on('suite:start', function(suite) {
            //if parent == null then it's a feature, otherwise a scenario
            console.log(' ')
            if (!suite.parent) {
                console.log(colors.bold(`${this.getIndent(0)}Feature: ${suite.title} (${suite.file})`))
            } else {
                console.log(colors.bold(`${this.getIndent(1)}Scenario: ${suite.title} (${suite.file})`))
            }
        })

        this.on('test:pending', function(test) {
            this.printTestResult(test, 'pending')
            this.results[test.cid].pending++
        })

        this.on('test:pass', function(test) {
            this.printTestResult(test, 'pass')
            this.currentPassing++
            this.results[test.cid].passing++
        })

        this.on('test:fail', function(test) {
            this.printTestResult(test, 'fail')
            this.results[test.cid].failing++
        })

        this.on('suite:end', function(suite) {
            let duration = this.shortEnglishHumanizer(suite.duration, DURATION_LONG)
            if (suite.parent) {
                console.log(`${this.getIndent(1)}Scenario duration: ${duration}. Tests: ${this.currentPassing}`)
            } else {
                console.log(`${this.getIndent(0)}Feature duration: ${duration}. Passing: ${this.results[suite.cid].passing}, failing: ${this.results[suite.cid].failing}, pending: ${this.results[suite.cid].pending}`)
            }
            this.currentPassing = 0
        })

        this.on('runner:end', function(runner) {
            this.printSuiteResult(runner)
        })
    }

    getSymbol(state) {
        const {symbols} = this.baseReporter
        let symbol = '?' // in case of an unknown state

        switch (state) {
            case 'pass':
                symbol = symbols.ok
                break
            case 'pending':
                symbol = '-'
                break
            case 'fail':
                this.errorCount++
                symbol = this.errorCount + ')'
                break
        }

        return symbol
    }

    static getBrowserCombo(caps, verbose = true) {
        const device = caps.deviceName
        const browser = caps.browserName
        const version = caps.version || caps.platformVersion
        const platform = caps.platform || caps.platformName

        /**
         * mobile capabilities
         */
        if (device) {
            const program = (caps.app || '').replace('sauce-storage:', '') || caps.browserName
            const executing = program ? `executing ${program}` : ''

            if (!verbose) {
                return `${device} ${platform} ${version}`
            }

            return `${device} on ${platform} ${version} ${executing}`.trim()
        }

        if (!verbose) {
            return (browser + ' ' + (version || '') + ' ' + (platform || '')).trim()
        }

        return browser + (version ? ` (v${version})` : '') + (platform ? ` on ${platform}` : '')
    }

    getFailureList(failures, preface) {
        let output = ''

        failures.forEach((test, i) => {
            const title = typeof test.parent !== 'undefined' ? test.parent + ' ' + test.title : test.title
            output += `${preface.trim()}\n`
            output += preface + ' ' + this.baseReporter.color('error title', `${(i + 1)}) ${title}:`) + '\n'
            output += preface + ' ' + this.baseReporter.color('error message', test.err.message) + '\n'
            if (test.err.stack) {
                const stack = test.err.stack.split(/\n/g).map((l) => `${preface} ${this.baseReporter.color('error stack', l)}`).join('\n')
                output += `${stack}\n`
            } else {
                output += `${preface} ${this.baseReporter.color('error stack', 'no stack available')}\n`
            }
        })

        return output
    }

    getSuiteResult(runner) {
        const cid = runner.cid
        const stats = this.baseReporter.stats
        const results = stats.runners[cid]
        const preface = ''
        const specHash = stats.getSpecHash(runner)
        const spec = results.specs[specHash]
        const combo = StepByStepReporter.getBrowserCombo(results.capabilities)
        const failures = stats.getFailures().filter((f) => f.cid === cid || Object.keys(f.runner).indexOf(cid) > -1)

        /**
         * don't print anything if no specs where executed
         */
        if (Object.keys(spec.suites).length === 0) {
            return ''
        }

        this.errorCount = 0
        let output = ''

        output += '------------------------------------------------------------------\n'
        output += `${preface} Session ID: ${results.sessionID}\n`
        output += `${preface} Feature: ${this.specs[cid]}\n`
        output += `${preface} Running: ${combo}\n`
        output += `${preface}\n`
        output += this.getFailureList(failures, preface)
        output += `${preface}\n`
        return output
    }

    printSuiteResult(runner) {
        console.log(this.getSuiteResult(runner))
    }

    getIndent(indents = 1) {
        return '  ' + '  '.repeat(indents)
    }

    printTestResult(test, state) {
        let indent = this.getIndent(3)
        let duration
        let durationColor
        if (test.duration) {
            if (test.duration >= 5000) {
                durationColor = 'red'
            } else if (test.duration >= 1000) {
                durationColor = 'yellow'
            } else {
                durationColor = 'green'
            }
            duration = colors[durationColor](this.shortEnglishHumanizer(test.duration, DURATION_SHORT))
        }
        let symbol = this.getSymbol(state)
        let output = ''
        switch (state) {
            case 'fail':
                output += `${indent}${colors.red(symbol)} ${test.title} (${duration})\n`
                output += `${colors.red.bold(test.err.message)}\n`
                output += `Callstack:\n`
                output += `${colors.bold(test.err.stack)}\n`
                break
            case 'pass':
                output += `${indent}${colors.green(symbol)} ${test.title} (${duration})`
                break
            case 'pending':
                output += `${indent}${colors.cyan(symbol)} ${colors.cyan(test.title)}`
        }
        console.log(output)
    }

}

export default StepByStepReporter
