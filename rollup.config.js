import babel from 'rollup-plugin-babel';

export default {
  entry: 'src/index.js',
  dest: 'dist/bundle.umd.js',
  format: 'umd',
  sourceMap: true,
  moduleName: 'webWorkerLink',
  exports: 'named',
  plugins: [
    babel({
      exclude: 'node_modules/**',
      plugins: ['external-helpers']
    }),
  ],
  onwarn
};

function onwarn(message) {
  const suppressed = [
    'UNRESOLVED_IMPORT',
    'THIS_IS_UNDEFINED'
  ];

  if (!suppressed.find(code => message.code === code)) {
    return console.warn(message.message);
  }
}