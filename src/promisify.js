// modify pify@3.0.0 https://github.com/sindresorhus/pify
const processFn = (fn, opts) =>
  function() {
    const P = opts.promiseModule
    const args = new Array(arguments.length)

    for (let i = 0; i < arguments.length; i++) {
      args[i] = arguments[i]
    }

    return new P((resolve, reject) => {
      if (opts.objectParams && typeof args[0] === 'object') {
        const objectParams = args[0]
        objectParams.success = function(result) { resolve(result)}
        objectParams.fail = function(result) { reject(result)}
        objectParams.complete = null
      } else if (opts.errorFirst) {
        args.push(function(err, result) {
          if (opts.multiArgs) {
            const results = new Array(arguments.length - 1)

            for (let i = 1; i < arguments.length; i++) {
              results[i - 1] = arguments[i]
            }

            if (err) {
              results.unshift(err)
              reject(results)
            } else {
              resolve(results)
            }
          } else if (err) {
            reject(err)
          } else {
            resolve(result)
          }
        })
      } else {
        args.push(function(result) {
          if (opts.multiArgs) {
            const results = new Array(arguments.length - 1)

            for (let i = 0; i < arguments.length; i++) {
              results[i] = arguments[i]
            }

            resolve(results)
          } else {
            resolve(result)
          }
        })
      }

      fn.apply(this, args)
    })
  }

export default function promisify(obj, opts) {
  opts = Object.assign(
    {
      exclude: [/.+(Sync|Stream)$/],
      errorFirst: true,
      promiseModule: Promise
    },
    opts
  )

  const filter = key => {
    const match = pattern =>
      typeof pattern === 'string' ? key === pattern : pattern.test(key)
    return opts.include ? opts.include.some(match) : !opts.exclude.some(match)
  }

  let ret
  if (typeof obj === 'function') {
    ret = function() {
      if (opts.excludeMain) {
        return obj.apply(this, arguments)
      }

      return processFn(obj, opts).apply(this, arguments)
    }
  } else {
    ret = Object.create(Object.getPrototypeOf(obj))
  }

  for (const key in obj) {
    // eslint-disable-line guard-for-in
    const x = obj[key]
    ret[key] = typeof x === 'function' && filter(key) ? processFn(x, opts) : x
  }

  return ret
}

export function promisifyReturns(fn, include) {
  return function(...args) {
    const ret = fn(...args)
    for (const key in include) {
      const x = ret[key]
      ret[key] = typeof x === 'function' ? promisify(x, include[key]) : x
    }
    return ret
  }
}
