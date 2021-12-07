export function* asyncGenerator(arr: any[]) {
  let count = 0;
  while (count < arr.length) {
    yield arr[count++]();
  }
}
