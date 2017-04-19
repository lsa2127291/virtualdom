/**
 * 简单的virtualdom实现
 */

// 四种节点变化类型
var REPLACE = 0; // 替换节点
var REORDER = 1; // 移动节点
var PROPS = 2;  // 节点属性改变
var TEXT = 3; // 节点文本改变
/**
 * 虚拟dom类
 * @param  {string} tagName  dom标签
 * @param  {object} props    dom属性
 * @param  {array} children dom子节点
 */
function VirtualDom (tagName, props, children) {
  this.tagName = tagName;
  this.props = props || {};
  this.children = children;
  if (!children) {
    if (isArray(props)) {
      this.children = children = props || [];
      this.props = {};
    } else {
      this.children = children = [];
    }
  }
  this.key = props ? props.key : void 0;
  var count = 0;
  if (children) {
    children.forEach(function (child) {
      if (child instanceof VirtualDom) {
        count += child.count;
      }
      count++;
    });
  }
  this.count = count;
}
/**
 * 渲染为真实dom
 * @return {document}  真实节点
 */
VirtualDom.prototype.render = function () {
  var el = document.createElement(this.tagName);
  var props = this.props;
  for (var propName in props) {
    var propValue = props[propName];
    el.setAttribute(propName, propValue);
  }
  var children = this.children;
  if (children) {
    children.forEach(function (child) {
      var childEl = child instanceof VirtualDom ? child.render() : document.createTextNode(child);
      el.appendChild(childEl);
    });
  }

  return el;
};

/**
 * diff算法
 * @param  {object} oldTree [description]
 * @param  {object} newTree [description]
 * @return {object}         两棵树差异
 */
function diff (oldTree, newTree) {
  var patchs = {};
  var index = 0;
  diffWalk(oldTree, newTree, index, patchs);
  return patchs;
}

/**
 * [diffWalk description]
 * @param  {[type]} oldNode [description]
 * @param  {[type]} newNode [description]
 * @param  {[type]} index   [description]
 * @param  {[type]} patchs  [description]
 * @return {[type]}         [description]
 */
function diffWalk (oldNode, newNode, index, patchs) {
  var currentPatch = [];
  if (newNode === null) {
  } else if (isString(oldNode) && isString(newNode)) {
    if (oldNode !== newNode) {
      currentPatch.push({type: TEXT, content: newNode});
    }
  } else if (oldNode.tagName === newNode.tagName && oldNode.key === newNode.key) {
    var propsPatches = diffProps(oldNode, newNode);
    if (propsPatches) {
      currentPatch.push({type: PROPS, props: propsPatches});
    }
    diffChildren(oldNode.children, newNode.children, index, patchs, currentPatch);
  } else {
    currentPatch.push({ type: REPLACE, node: newNode });
  }
  if (currentPatch.length) {
    patchs[index] = currentPatch;
  }
}

/**
 * [diffChildren description]
 * @param  {[type]} oldChildren [description]
 * @param  {[type]} newChiren   [description]
 * @param  {[type]} patchs      [description]
 * @return {[type]}             [description]
 */
function diffChildren (oldChildren, newChildren, index, patchs, currentPatch) {
  var listDiffs = listDiff(oldChildren, newChildren, 'key');
  newChildren = listDiffs.children;
  if (listDiffs.updates.length) {
    var reorderPatch = {type: REORDER, updates: listDiffs.updates};
    currentPatch.push(reorderPatch);
  }
  var leftNode = null;
  var currentIndex = index;
  oldChildren.forEach(function (oldChild, i) {
    var newChild = newChildren[i];
    currentIndex = leftNode && leftNode.count ? currentIndex + leftNode.count + 1 : currentIndex + 1;
    diffWalk(oldChild, newChild, currentIndex, patchs);
    leftNode = oldChild;
  });
}

/**
 * 找出节点间的不同属性
 * @param  {VirtualDom} oldNode 旧节点
 * @param  {VirtualDom} newNode 新节点
 * @return {object}         包含所有不同属性的对象
 */
function diffProps (oldNode, newNode) {
  var propsPatches = {};
  var oldProps = oldNode.props;
  var newPropos = newNode.props;
  var key, hasDiff = false;
  // 找到删除和不同的属性
  for (key in oldProps) {
    if (oldProps[key] !== newPropos[key]) {
      propsPatches[key] = newPropos[key];
      hasDiff = true;
    }
  }
  // 找到新增的属性
  for (key in newPropos) {
    if (!oldProps.hasOwnProperty(key)) {
      propsPatches[key] = newPropos[key];
      hasDiff = true;
    }
  }
  return hasDiff === true ? propsPatches : null;
}

/**
 * [listDiff description]
 * @param  {[type]} oldList [description]
 * @param  {[type]} newList [description]
 * @param  {[type]} key     [description]
 * @return {[type]}         [description]
 */
function listDiff (oldList, newList, key) {
  var oldMap = makeKeyIndexAndFree(oldList, key);
  var newMap = makeKeyIndexAndFree(newList, key);
  var newFree = newMap.free;
  var oldKeyIndex = oldMap.keyIndex;
  var newKeyIndex = newMap.keyIndex;
  var i = 0;
  var updates = [];
  var children = [];
  var item;
  var itemKey;
  var freeIndex = 0;
  while (i < oldList.length) {
    item = oldList[i];
    itemKey = getItemKey(item, key);
    if (itemKey) {
      if (!newKeyIndex.hasOwnProperty(itemKey)) {
        children.push(null);
      } else {
        var newItemIndex = newKeyIndex[itemKey];
        children.push(newList[newItemIndex]);
      }
    } else {
      var freeItem = newFree[freeIndex++];
      children.push(freeItem || null);
    }
    i++;
  }
  var simulateList = children.slice(0);
  i = 0;
  while (i < simulateList.length) {
    if (simulateList[i] === null) {
      remove(i);
      removeSimulate(i);
      removeOldList(i);
    } else {
      i++;
    }
  }
  i = 0;
  var k = 0, lastIndex = 0;
  while (i < newList.length) {
    item = newList[i];
    itemKey = getItemKey(item, key);
    var simulateItem = simulateList[k];
    if (simulateItem) {
      k++;
    } else {
      insert(i, item);
    }
    if (!oldKeyIndex.hasOwnProperty(itemKey)) {
      // if (itemKey) {
      //   insert(i, item);
      // }
    } else {
      var j = oldKeyIndex[itemKey];
      if (i < lastIndex) {
        move(j, i);
      }
      if (lastIndex < j) {
        lastIndex = j;
      }
    }
    i++;
  }
  function remove (index) {
    var update = {index: index, type: 0};
    updates.push(update);
  }
  function insert (index, item) {
    var update = {index: index, item: item, type: 1};
    updates.push(update);
  }
  function move (fromIndex, toIndex) {
    var update = {fromIndex: fromIndex, toIndex: toIndex, type: 2};
    updates.push(update);
  }
  function removeSimulate (index) {
    simulateList.splice(index, 1);
  }
  function removeOldList (index) {
    oldList.splice(index, 1);
  }
  function makeKeyIndexAndFree (list, key) {
    var keyIndex = {};
    var free = [];
    for (var i = 0, len = list.length; i < len; i++) {
      var item = list[i];
      var itemKey = getItemKey(item, key);
      if (itemKey) {
        keyIndex[itemKey] = i;
      } else {
        free.push(item);
      }
    }
    return {
      keyIndex: keyIndex,
      free: free
    };
  }
  function getItemKey (item, key) {
    if (!item || !key) return void 0;
    return typeof key === 'string' ? item[key] : key(item);
  }
  return {
    updates: updates,
    children: children
  };
}

/**
 * [patch description]
 * @param  {[type]} node    [description]
 * @param  {[type]} patches [description]
 * @return {[type]}         [description]
 */
function patch (node, patches) {
  var walker = {index: 0};
  dfsWalk(node, walker, patches);
}

function dfsWalk (node, walker, patches) {
  var currentPatches = patches[walker.index];
  var len = node.childNodes ? node.childNodes.length : 0;
  for (var i = 0; i < len; i++) {
    var child = node.childNodes[i];
    walker.index++;
    dfsWalk(child, walker, patches);
  }
  if (currentPatches) {
    applyPatches(node, currentPatches);
  }
}
/**
 * [applyPatches description]
 * @param  {[type]} node           [description]
 * @param  {[type]} currentPatches [description]
 * @return {[type]}                [description]
 */
function applyPatches (node, currentPatches) {
  console.log(node);
  currentPatches.forEach(function (currentPatch) {
    switch (currentPatch.type) {
      case REPLACE:
        replaceNode(node, currentPatch);
        break;
      case REORDER:
        reorderChildren(node, currentPatch.updates);
        break;
      case PROPS:
        setProps(node, currentPatch.props);
        break;
      case TEXT:
        replaceContent(node, currentPatch.content);
        break;
      default:
        throw new Error('Unkown patch type' + currentPatch.type);
    }
  });
}

function replaceNode (node, currentPatch) {
  var newNode = (typeof currentPatch.node === 'string')
  ? document.createTextNode(currentPatch.node)
  : currentPatch.node.render();
  node.parentNode.replaceChild(newNode, node);
}
function reorderChildren (node, updates) {
  var childList = Array.prototype.slice.call(node.childNodes, 0);
  updates.forEach(function (update) {
    var index = update.index;
    if (update.type === 0) {
      if (childList[index] === node.childNodes[index]) {
        node.removeChild(node.childNodes[index]);
      }
    } else if (update.type === 1) {
      var insertNode = (typeof update.item === 'object')
      ? update.item.render()
      : document.createTextNode(update.item);
      node.insertBefore(insertNode, node.childNodes[index] || null);
    } else if (update.type === 2) {
      var fromIndex = update.fromIndex;
      var toIndex = update.toIndex;
      var fromNode = childList[fromIndex];
      var toNode = childList[toIndex];
      node.insertBefore(toNode, fromNode);
      node.insertBefore(fromNode, node.childNodes[toIndex + 1] || null);
    }
  });
}
function setProps (node, props) {
  for (var key in props) {
    if (props[key] === void 0) {
      node.removeAttribute(key);
    } else {
      node.setAttribute(key, props[key]);
    }
  }
}

function replaceContent (node, content) {
  if (node.textContent) {
    node.textContent = content;
  } else {
    node.value = content;
  }
}

function isString (item) {
  return Object.prototype.toString.call(item) === '[object String]';
}

function isArray (item) {
  return Object.prototype.toString.call(item) === '[object Array]';
}

// var tree = new VirtualDom('div', {
//   'id': 'container'
// }, [
//   new VirtualDom('h1', {
//     style: 'color: blue'
//   }, ['simple virtal dom']),
//   new VirtualDom('p', ['Hello, virtual-dom']),
//   new VirtualDom('ul', [new VirtualDom('li')])
// ]);
// // 3. 生成新的虚拟DOM
// var newTree = new VirtualDom('div', {
//   'id': 'container'
// }, [
//   new VirtualDom('h1', {
//     style: 'color: red'
//   }, ['simple virtal dom']),
//   new VirtualDom('p', ['Hello, virtual-dom2']),
//   new VirtualDom('ul', [new VirtualDom('li'), new VirtualDom('li')])
// ]);
//
// // 4. 比较两棵虚拟DOM树的不同
// var patches = diff(tree, newTree);
// console.log(JSON.stringify(patches));
