export const notImpl = (method: string) => {
  throw new Error(`${method}方法必须被实现`);
};
