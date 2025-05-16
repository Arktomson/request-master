/**
 * hash-sum模块的类型声明
 */
declare module "hash-sum" {
  /**
   * 将任意值转换为哈希字符串
   * @param value 要哈希的值，可以是任何类型
   * @returns 生成的哈希字符串
   */
  function hashSum(value: any): string;

  export default hashSum;
}
