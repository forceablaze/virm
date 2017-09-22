'use strict'

const { compile } = require('nexe');

console.log('compile server.js');
compile({
  input: './server.js',
  build: true,
  loglevel: 'verbose'
  /*
  patches: [
    async (compiler, next) => {
      await compiler.setFileContentsAsync(
        'lib/new-native-module.js',
        'module.exports = 42'
      )
      return next()
    }
  ]
  */
}).then(() => {
  console.log('compile server.js success')
})

console.log('compile client.js');
compile({
  input: './client.js',
  build: true,
  loglevel: 'verbose'
}).then(() => {
  console.log('compile client.js success')
})
