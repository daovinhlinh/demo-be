export const hasMatchingElement = (arr1: any[], arr2: any[]): boolean => {
  const set = new Set(arr1);

  for (let i = 0; i < arr2.length; i++) {
    if (set.has(arr2[i])) {
      return true;
    }
  }

  return false;
}

export const convertArrayDocsToObject = (data: any, prefixString: string): any => {
  const outputData: any = [];
  for (const key in data) {
    const [prefix, index] = key.split('.');
    if (prefix === prefixString) {
      outputData.push(data[key]);
    }
  }

  return outputData;
}