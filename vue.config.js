import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  chainWebpack: config => {
    config.module.rules.delete('eslint');
  },
  transpileDependencies: true,
  configureWebpack: {
    // 显式指定入口文件为JS格式
    entry: path.resolve(__dirname, 'src/main.js'),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '~': path.resolve(__dirname, 'src')
      },
      // 确保扩展名顺序以.js优先
      extensions: ['.js', '.vue', '.json']
    }
  },
  lintOnSave: process.env.NODE_ENV !== 'production',
  pluginOptions: {
    lintStyleOnBuild: true,
    eslint: {
      configFile: '.eslintrc.cjs' // 显式指定配置文件
    }
  }
}
