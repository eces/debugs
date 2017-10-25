const inquirer = require('inquirer')
const path = require('path')
const fs = require('fs')
const chalk = require('chalk')

// returns comma joined partial value
if (['--c', '-v', 'value'].includes(process.argv[2])) {
  const file = path.join(process.cwd(), '.debugs')
  if(fs.existsSync(file)){
    try {
      const debugs = JSON.parse(fs.readFileSync(file))
      console.log(debugs['env-debug'].join(','))
    } catch (error) {
      console.log(chalk.red(error))
      return
    }
  } else {
    
  }
  return
}

// returns full value
if (['--init', '-i', 'init'].includes(process.argv[2])) {
  const file = path.join(process.cwd(), '.debugs')
  if(fs.existsSync(file)){
    try {
      const debugs = JSON.parse(fs.readFileSync(file))
      console.log('export DEBUG='+debugs['env-debug'].join(','))
    } catch (error) {
      console.log(chalk.red(error))
      return
    }
  }
  return
}

// find package.json at current working directory
const __package = path.join(process.cwd(), 'package.json')

if(!fs.existsSync(__package)){
  console.log(chalk.red('package.json not found'))
  return
}

// add debugs: [] if not defined
const pkg = require(__package)
if(!pkg.debugs || pkg.debugs.length === undefined){
  pkg.debugs = []
  const file = fs.readFileSync(__package, 'utf8')
  const indent = require('detect-indent')(file).indent
  fs.writeFileSync(__package, JSON.stringify(pkg, null, indent))
  console.log(chalk.green('"debugs": []'), chalk('added to package.json'))
}

// load last checked items
let current = []
const file = path.join(process.cwd(), '.debugs')
if(fs.existsSync(file)){
  try {
    const debugs = JSON.parse(fs.readFileSync(file))
    current = debugs['env-debug']
  } catch (error) {
    console.log(chalk.red('package.json invalid: '), error)
    return
  }
}

// inform nothing to choose
if(pkg.debugs.length === 0){
  console.log(chalk.yellow('Nothing to choose. Please add items to debugs: [] on package.json '))
  return
}

const prompt = inquirer.createPromptModule()
prompt([
  {
    type: 'checkbox',
    message: 'DEBUG=',
    name: 'env-debug',
    choices: () => {
      // resolve debugs[] on current and subdirectory
      require_debugs = (extra_path, base_path = process.cwd()) => {
        const current_path = path.join(base_path, extra_path)
        const pkg = require(current_path)
        if(pkg.debugs){
          const list = []
          pkg.debugs.forEach( e => {
            if(e.endsWith('.json')){
              // recursively
              list.push(...require_debugs(e, path.dirname(current_path)))
            }else{
              list.push(e)
            }
          })
          return list
        }else{
          return []
        }
      }
      const list = require_debugs('package.json')
        
      const current_list = list.map( e => {
        return {
          name: e,
          checked: current.includes(e),
        }
      })
      current_list.unshift(new inquirer.Separator(' ~~~ '))
      
      return current_list
    },
    // validate: (answer) => {
    //   return true
    // }
  }
]).then( r => {
  fs.writeFileSync(
    path.join(process.cwd(), '.debugs'),
    JSON.stringify(r)
  )
  return
}).catch( err => {
  console.log(chalk.red(err))
  process.exit(-1)
  return
}).then( () => {
  process.exit(0)
})