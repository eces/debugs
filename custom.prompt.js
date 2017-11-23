/**
 * `checkbox-search` type prompt
 * https://github.com/LZoog/inquirer-checkbox-search
 */

const _ = require('lodash')
const util = require('util')
const chalk = require('chalk')
const cliCursor = require('cli-cursor')
const figures = require('figures')
const Base = require('inquirer/lib/prompts/base')
const observe = require('inquirer/lib/utils/events')
const readline = require('inquirer/lib/utils/readline')
const Paginator = require('inquirer/lib/utils/paginator')
const Choices = require('inquirer/lib/objects/choices')

/**
 * Module exports
 */
module.exports = Prompt

/**
 * Constructor
 */
function Prompt() {
  Base.apply(this, arguments)

  if (!this.opt.source) {
    this.throwParamError('source')
  }

  this.initialChoices = this.opt.initialChoices || []
  this.currentChoices = []
  this.firstRender = true

  // Make sure no default is set (so it won't be printed)
  this.opt.default = null

  this.paginator = new Paginator()
}
util.inherits(Prompt, Base)

/**
 * Start the Inquiry session
 * @param  {Function} cb      Callback when prompt is done
 * @return {this}
 */
Prompt.prototype._run = function (cb) {
  this.done = cb
  const self = this
  const events = observe(this.rl)

  const validation = this.handleSubmitEvents(
    events.line.map(this.getCurrentValue.bind(this))
  )
  validation.success.forEach(this.onEnd.bind(this))
  validation.error.forEach(this.onError.bind(this))

  events.keypress.takeWhile(dontHaveAnswer).forEach(self.onKeypress.bind(this))

  function dontHaveAnswer() {
    return !self.answer
  }

  //call once at init
  self.search(null)
  return this
}

/**
 * Render the prompt to screen
 * @return {Prompt} self
 */
Prompt.prototype.render = function (error) {
  // Render question
  let message = this.getQuestion()
  let bottomContent = ''

  if (this.firstRender) {
    message += '(Type to filter, press ' + chalk.cyan.bold('<space>') + ' to select, ' + chalk.cyan.bold('<shift>') + '+' + chalk.cyan.bold('<space>') + ' to toggle all, ' + chalk.cyan.bold('<ctrl>') + '+' + chalk.cyan.bold('<space>') + ' to inverse selection)'

    // store initial choices to be referenced with selections and new searches
    this.initialChoices = this.currentChoices
  }

  if (this.status === 'answered') {
    message += chalk.cyan(this.shortAnswer || this.answerName || this.answer)
  } else if (this.searching) {
    message += this.rl.line
    bottomContent += '  ' + chalk.dim('Searching...')
  } else if (this.currentChoices.length) {
    const choicesStr = renderCurrentChoices(this.initialChoices, this.currentChoices, this.selected)
    message += this.rl.line
    bottomContent += this.paginator.paginate(choicesStr, this.selected, this.opt.pageSize)
  } else {
    message += this.rl.line
    bottomContent += '  ' + chalk.yellow('No results...')
  }

  if (error) {
    bottomContent = chalk.red('>> ') + error
  }

  this.firstRender = false
  this.screen.render(message, bottomContent)
}

/**
 * Capture all key presses
 * @param  {Object} e     The fired event
 */
Prompt.prototype.onKeypress = function(e) {
  let len
  const keyName = (e.key && e.key.name) || undefined

  const ctrlModifier = e.key.ctrl
  const shiftModifier = e.key.shift

  if (keyName === 'down') {
    len = this.currentChoices.length
    this.selected = (this.selected < len - 1) ? this.selected + 1 : 0
    this.ensureSelectedInRange()
    this.render()
    readline.up(this.rl, 2)
  } else if (keyName === 'up') {
    len = this.currentChoices.length
    this.selected = (this.selected > 0) ? this.selected - 1 : len - 1
    this.ensureSelectedInRange()
    this.render()
  } else if ((keyName === 'space') || keyName === 'right') {
    if (keyName === 'space') {
      this.rl.line = this.rl.line.replace(' ', '')
      this.rl.cursor -= 1
    }
    if (shiftModifier) {
      this.onAllKey()
      this.render()
    } else if (ctrlModifier) {
      this.onInverseKey()
      this.render()
    } else if (keyName === 'right' && this.rl.line.length > 0 && this.rl.line.length != this.rl.cursor) {
      this.render()
      return
    } else {
      this.toggleChoice(this.selected)
      this.render()
    }
  } else {
    this.render() //render input automatically
    // Only search if input has actually changed, not because of other keypresses
    if (this.lastSearchTerm !== this.rl.line) {
      this.search(this.rl.line) //trigger new search
    }
  }
}

Prompt.prototype.ensureSelectedInRange = function() {
  const selectedIndex = Math.min(this.selected, this.currentChoices.length) //not above currentChoices length - 1
  this.selected = Math.max(selectedIndex, 0) //not below 0
}

/**
 * Create new this.currentChoices based on search term
 * @param  {String} searchTerm     The string to filter by
 */
Prompt.prototype.search = function(searchTerm) {
  const self = this
  self.selected = 0

  //only render searching state after first time
  if (self.searchedOnce) {
    self.searching = true
    self.currentChoices = new Choices([])
    self.render() //now render current searching state
  } else {
    self.searchedOnce = true
  }

  self.lastSearchTerm = searchTerm
  const thisPromise = self.opt.source(self.answers, searchTerm)

  //store this promise for check in the callback
  self.lastPromise = thisPromise

  return thisPromise.then(function inner(choices) {
    //if another search is triggered before the current search finishes, don't set results
    if (thisPromise !== self.lastPromise) return

    // choices = new Choices(choices.filter(function(choice) {
    //   return choice.type !== 'separator'
    // }))
    choices = new Choices(choices)

    self.currentChoices = choices
    self.searching = false
    self.render()
  })
}

Prompt.prototype.onAllKey = function () {
  const self = this

  // return true if at least one currentChoice (from matching initialChoice) is not checked
  const shouldBeChecked = Boolean(this.currentChoices.choices.find(currentChoice => {
    if (currentChoice.type !== 'separator') {
      for (const initialChoice of self.initialChoices.choices) {
        if (initialChoice.name === currentChoice.name) {
          return !initialChoice.checked
        }
      }
    }
    return false
  }))

  this.currentChoices.choices.forEach(currentChoice => {
    if (currentChoice.type !== 'separator') {
      for (const initialChoice of self.initialChoices.choices) {
        if (initialChoice.name === currentChoice.name) {
          initialChoice.checked = shouldBeChecked
        }
      }
    }
  })
}

Prompt.prototype.onInverseKey = function () {
  const self = this

  this.currentChoices.choices.forEach(currentChoice => {
    if (currentChoice.type !== 'separator') {
      for (const initialChoice of self.initialChoices.choices) {
        if (currentChoice.name === initialChoice.name) {
          initialChoice.checked = !initialChoice.checked
        }
      }
    }
  })
}

Prompt.prototype.toggleChoice = function (index) {
  let separatorOffset = 0
  this.currentChoices.forEach((currentChoice, i) => {
    if (currentChoice.type === 'separator') {
      separatorOffset++
    }
  })
  const currentChoice = this.currentChoices.choices[index + separatorOffset]

  if (currentChoice !== undefined) {
    for (const initialChoice of this.initialChoices.choices) {

      if (currentChoice.name === initialChoice.name) {
        initialChoice.checked = !initialChoice.checked
      }
    }
  }
}

/**
 * When `enter` key is pressed
 */
Prompt.prototype.onEnd = function (state) {
  this.status = 'answered'
  this.answer = this.getCurrentValue().join(', ')

  // Rerender prompt (and clean subline error)
  this.render()

  this.screen.done()
  cliCursor.show()
  this.done(state.value)
}

Prompt.prototype.onError = function (state) {
  this.render(state.isValid)
}

Prompt.prototype.getCurrentValue = function () {
  const choices = this.initialChoices.filter(function (choice) {
    return Boolean(choice.checked) && !choice.disabled
  })

  this.selection = _.map(choices, 'short')
  return _.map(choices, 'value')
}

/**
 * Get the checkbox
 * @param  {Boolean} checked - add a X or not to the checkbox
 * @return {String} Composited checkbox string
 */
function getCheckbox(checked) {
  return checked ? chalk.green(figures.radioOn) : figures.radioOff
}

/**
 * Function for rendering current choices to screen
 * @param  {Array} initialChoices   Initial choices from first render
 * @param  {Array} currentChoices   Current choices to be displayed
 * @param  {Number} pointer         Position of the pointer
 * @return {String}                 Rendered content
 */
function renderCurrentChoices(initialChoices, currentChoices, pointer) {
  let output = ''
  let separatorOffset = 0

  currentChoices.forEach((currentChoice, i) => {
    if (currentChoice.type === 'separator') {
      separatorOffset++
      output += '  ' + currentChoice + '\n'
      return
    }

    const isSelected = (i - separatorOffset === pointer)
    output += isSelected ? chalk.cyan(figures.pointer) : ' '

    for (const initialChoice of initialChoices.choices) {
      if (currentChoice.name === initialChoice.name) {
        output += getCheckbox(initialChoice.checked) + '  ' + (initialChoice.checked ? chalk.cyan(initialChoice.name) : initialChoice.name)
      }
    }

    output += ' \n'
  })

  return output.replace(/\n$/, '')
}