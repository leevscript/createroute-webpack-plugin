const path = require('path')
const _ = require('lodash')
const Glob = require('glob')
const pify = require('pify')
const fs = require('fs-extra')
const chokidar = require('chokidar')

const glob = pify(Glob)
const DYNAMIC_ROUTE_REGEX = /^\/(:|\*)/
const ID = 'createRoute-webpack-plugin'

module.exports = class {
  constructor({pagesDir, outputDir = path.dirname(pagesDir), mixin = {}}) {
    this.pagesDir = pagesDir
    this.outputDir = outputDir
    this.mixin = mixin
    this.watching = false
    this.watcher = null
  }

  apply(compiler) {
    if ('hooks' in compiler) { // webpack 4
      compiler.hooks.run.tapAsync(ID, run.bind(this))
      compiler.hooks.watchRun.tapAsync(ID, watchRun.bind(this))
      compiler.hooks.done.tap(ID, done.bind(this))
    } else { // webpack 2 / 3
      compiler.plugin('run', run.bind(this))
      compiler.plugin('watch-run', watchRun.bind(this))
      compiler.plugin('done', done.bind(this))
    }

    async function run(compilation, callback) {
      await this.run()
      this.watching = false
      callback()
    }

    async function watchRun(compilation, callback) {
      if (!this.watching) await this.run()
      this.watching = true
      callback()
    }

    function done(stats) {
      if (this.watching && !this.watcher) {
        this.startWatch()
      }
    }
  }

  async run() {
    const files = await glob(this.pagesDir + '/**/*.vue')
    const routes = this.createRoute(files)
    const fileContent = await fs.readFile(path.resolve(__dirname, './template/router.js'), 'utf8')
    const template = _.template(fileContent, {interpolate: /<%=([\s\S]+?)%>/g})
    await fs.outputFile(this.outputDir + '/routes.js', template({routes}), 'utf8')
  }

  /*
  * @desc 监听路由文件
  * */
  startWatch() {
    console.log('开始监听路由')
    this.watcher = chokidar
      .watch(this.pagesDir, {
        ignored: '*.vue',
        persistent: true,
        ignoreInitial: true
      })
      .on('add', path => {
        this.run()
        console.log(`File ${path} has been added`)
      })
      .on('unlink', path => {
        this.run()
        console.log(`File ${path} has been removed`)
      })

    process.once('exit', () => {
      this.watcher && this.watcher.close()
      console.log('监听路由结束')
    })

    process.once('SIGINT', () => {
      process.exit(0)
    })
  }

  /*
  * @desc 处理子路由
  * @param {Object} routes
  * @param {Boolean} isChild
  * @return {Object}
  * */
  cleanChildrenRoutes(routes, isChild = false) {
    let start = -1
    const routesIndex = []
    routes.forEach((route) => {
      if (/_index$/.test(route.name) || route.name === 'index') {
        const res = route.name.split('_')
        const s = res.indexOf('index')
        start = start === -1 || s < start ? s : start
        routesIndex.push(res)
      }
    })
    routes.forEach((route) => {
      route.path = isChild ? route.path.replace('/', '') : route.path
      if (route.path.includes('?')) {
        const names = route.name.split('_')
        const paths = route.path.split('/')
        if (!isChild) {
          paths.shift()
        }
        routesIndex.forEach((r) => {
          const i = r.indexOf('index') - start
          if (i < paths.length) {
            for (let a = 0; a <= i; a++) {
              if (a === i) {
                paths[a] = paths[a].replace('?', '')
              }
              if (a < i && names[a] !== r[a]) {
                break
              }
            }
          }
        })
        route.path = (isChild ? '' : '/') + paths.join('/')
      }
      route.name = route.name.replace(/_index$/, '')
      if (route.children) {
        if (route.children.find(child => child.path === '')) {
          delete route.name
        }
        route.children = this.cleanChildrenRoutes(route.children, true)
      }
    })
    return routes
  }

  /*
  * @desc 处理路由节点
  * @param {string} key
  * @return {string}
  * */
  getRoutePathExtension(key) {
    if (key.startsWith('_')) {
      return `:${key.substr(1)}?`
    }
    return key
  }


  /*
  * @desc 生成路由
  * @param {Array} files
  * @param {string} pagesDir
  * @return {Object}
  * */
  createRoute(files) {
    const routes = []
    files.forEach((file) => {
      // 将文件路径用 / 隔开
      const keys = file
        .replace(RegExp(`^${this.pagesDir}`), '')
        .replace(/\.vue$/, '')
        .replace(/\/{2,}/g, '/')
        .split('/')
        .slice(1)
      // 如果文件已'!'开头，认为路由删除，直接跳过
      if (keys.find(val => val.startsWith('!'))) return
      const route = {name: '', path: '', component: './' + path.relative(this.outputDir, file).replace(/\\+/g, '/')}
      let parent = routes
      keys.forEach((key, i) => {
        // 如果节点有空格' '，则混入配置项
        let temp = key.split(/\s+/)
        if (temp.length > 1) {
          key = temp[0]
          temp.slice(1).forEach(val => _.assign(route, this.mixin[val]))
        }

        // 如果节点以'_'开头，认为是动态路由
        let sanitizedKey = key.startsWith('_') ? key.substr(1) : key

        // 路由命名，规则为文件结构用'_'连接
        route.name = route.name ? route.name + '_' + sanitizedKey : sanitizedKey

        // 如果当前目录有vue组件名字与文件夹名字相同，认为是嵌套路由，该文件夹下的所有组件都是子路由
        let child = parent.find(parentRoute => parentRoute.name === route.name)
        if (child) {
          child.children = child.children || []
          parent = child.children
          route.path = ''
        } else if (key === 'index' && i + 1 === keys.length) {
          route.path += i > 0 ? '' : '/'
        } else {
          route.path += '/' + this.getRoutePathExtension(key)
        }
      })
      parent.push(route)

      // 每次循环处理前将所有路由按照层级深浅排序
      parent.sort((a, b) => {
        if (!a.path.length) {
          return -1
        }
        if (!b.path.length) {
          return 1
        }
        if (a.path === '/') {
          return DYNAMIC_ROUTE_REGEX.test(b.path) ? -1 : 1
        }
        if (b.path === '/') {
          return DYNAMIC_ROUTE_REGEX.test(a.path) ? 1 : -1
        }

        let i, res = 0, y = 0, z = 0
        const _a = a.path.split('/')
        const _b = b.path.split('/')
        for (i = 0; i < _a.length; i++) {
          if (res !== 0) break
          y = _a[i] === '*' ? 2 : _a[i].includes(':') ? 1 : 0
          z = _b[i] === '*' ? 2 : _b[i].includes(':') ? 1 : 0
          res = y - z
          if (i === _b.length - 1 && res === 0) {
            res = _a[i] === '*' ? -1 : 1
          }
        }
        return res === 0 ? (_a[i - 1] === '*' && _b[i] ? 1 : -1) : res
      })
    })
    return this.cleanChildrenRoutes(routes)
  }
}