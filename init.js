const inquirer = require('inquirer')
const path = require('path')
const fs = require('fs')
const chalk = require('chalk')

// returns comma joined partial value
const file = path.join(process.cwd(), '.debugs')
if(fs.existsSync(file)){
  try {
    const debugs = JSON.parse(fs.readFileSync(file))
    process.env.DEBUG = debugs['env-debug'].join(',') 
    module.exports = process.env.DEBUG
  } catch (error) {
    throw error
  } 
} else {
  module.exports = ''
}