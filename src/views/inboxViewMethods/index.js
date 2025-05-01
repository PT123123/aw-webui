import noteMethods from './noteMethods';
import tagMethods from './tagMethods';
import commentMethods from './commentMethods';
import uiMethods from './uiMethods';

// 只聚合导出，不做任何变量声明和提前引用，避免循环依赖
export default function getInboxViewMethods(vm) {
  return {
    ...noteMethods(vm),
    ...tagMethods(vm),
    ...commentMethods(vm),
    ...uiMethods(vm),
  };
}
