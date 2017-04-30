import {selectKey} from './createNavigator';
import $none from './$none';
import {curry2} from './utils/curry';
import arrayify from './utils/arrayify';
import {$setKey} from './$set';
import {$defaultKey} from './$default';
import {$applyKey} from './$apply';
import {$navKey} from './$nav';
import {$noneKey} from './$none';

let continueSelectEach;

export const selectEach = (state, resultFn, path, object, pathIndex, returnFn) => {
  if (pathIndex >= path.length) {
    if (returnFn) {
      return returnFn(object);
    }
    return resultFn(state, object);
  }
  const nav = path[pathIndex];

  if (!nav || typeof nav === 'string' || typeof nav === 'number' || typeof nav === 'boolean') {
    if (object && typeof object === 'object') {
      const subObject = object[nav];
      // Special case so `has` can differentiate between missing keys and keys
      // pointing to undefined values. Maybe a better way? Maybe just don't
      // worry about `has(['x'], {x: undefined}) === false`?
      if (typeof subObject === 'undefined' && !(nav in object) && pathIndex === path.length - 1) {
        return $none;
      }
      return selectEach(state, resultFn, path, subObject, pathIndex + 1, returnFn);
    } else {
      return $none;
    }
  }

  if (typeof nav === 'function') {
    if (nav(object)) {
      return selectEach(state, resultFn, path, object, pathIndex + 1, returnFn);
    } else {
      return $none;
    }
  }
  let selectFn;
  switch (nav['@@qim/nav']) {
    case $applyKey: {
      return selectEach(state, resultFn, path, nav.data(object), pathIndex + 1, returnFn);
    }
    case $setKey:
      return selectEach(state, resultFn, path, nav.data, pathIndex + 1, returnFn);
    case $defaultKey: {
      if (typeof object === 'undefined') {
        return selectEach(state, resultFn, path, nav.data, pathIndex + 1, returnFn);
      }
      return selectEach(state, resultFn, path, object, pathIndex + 1, returnFn);
    }
    case $navKey: {
      let navPath;
      if (typeof nav.data === 'function') {
        navPath = nav.hasParams ? nav.data(nav.params, object, nav.self) : nav.data(object, nav);
        if (navPath == null) {
          return selectEach(state, resultFn, path, object, pathIndex + 1, returnFn);
        }
        navPath = arrayify(navPath);
      } else {
        // $nav makes sure this is an array.
        navPath = nav.data;
      }
      if (navPath.length === 0) {
        return selectEach(state, resultFn, path, object, pathIndex + 1, returnFn);
      }
      return selectEach(
        state, resultFn, navPath, object, 0,
        (_object) => selectEach(state, resultFn, path, _object, pathIndex + 1, returnFn)
      );
    }
    case $noneKey:
      return $none;
  }
  if (nav[selectKey]) {
    selectFn = nav[selectKey];
  } else if (nav['@@qim/nav']) {
    selectFn = nav['@@qim/nav'][selectKey];
  } else if (Array.isArray(nav)) {
    const subResult = selectEach(state, resultFn, nav, object, 0);
    if (pathIndex + 1 === path.length) {
      return subResult;
    }
    return selectEach(state, resultFn, path, object, pathIndex + 1, returnFn);
  }
  if (!selectFn) {
    throw new Error(`Invalid navigator ${nav} at path index ${pathIndex}.`);
  }
  return continueSelectEach(state, resultFn, selectFn, nav, object, path, pathIndex, returnFn);
};

continueSelectEach = (state, resultFn, selectFn, nav, object, path, pathIndex, returnFn) => {
  if (nav.hasParams) {
    return selectFn(nav.params, object, (subObject) => selectEach(state, resultFn, path, subObject, pathIndex + 1, returnFn));
  }
  return selectFn(object, (subObject) => selectEach(state, resultFn, path, subObject, pathIndex + 1, returnFn));
};

const selectResultFn = (state, result) => {
  state.push(result);
  return state;
};

const select = (path, object) => {
  path = arrayify(path);
  const result = [];
  selectEach(result, selectResultFn, path, object, 0);
  return result;
};

export default curry2(select);
