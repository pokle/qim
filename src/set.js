import {curry3} from './utils/curry';

const set = (key, value, obj, hasMutation) => {
  if (obj == null || typeof obj !== 'object') {
    return obj;
  }

  if (obj[key] === value) {
    return obj;
  }

  if (hasMutation !== true) {
    if (Array.isArray(obj)) {
      obj = obj.slice(0);
    } else {
      obj = {...obj};
    }
  }

  obj[key] = value;

  return obj;
};

export default curry3(set);
