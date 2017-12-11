import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';

const plugins = [
    resolve(),
    babel({
      babelrc: false
    })
];

export default [
  {
    input: 'src/server.js',
    output: {
      file: 'build/server.min.js',
      format: 'cjs',
    },
    plugins: plugins
  },
  {
    input: 'src/client.js',
    output: {
      file: 'build/client.min.js',
      format: 'cjs',
    },
    plugins: plugins
  },
  {
    input: 'src/virm.js',
    output: {
      file: 'build/virm.min.js',
      format: 'cjs',
    },
    plugins: plugins
  },
  {
    input: 'test.js',
    output: {
      file: 'build/test.min.js',
      format: 'cjs',
    },
    plugins: plugins
  }
]
