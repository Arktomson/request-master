// 允许TypeScript导入JSON文件
declare module "*.json" {
  const value: any;
  export default value;
}
