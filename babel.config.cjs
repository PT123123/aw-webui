module.exports = {
  presets: [
    ['@vue/cli-plugin-babel/preset', { 
      useBuiltIns: 'entry',
      modules: 'auto' // 添加此配置
    }]
  ]
};
