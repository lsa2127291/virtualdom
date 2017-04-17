### VirtualDom技术分析与实现
#### VirtualDom介绍
VirtualDom是由React框架设计者提出的一种全新的管理视图的方式，它利用原生javaScript对象模拟了一份dom树副本，让用户通过操作这颗虚拟dom树对象来更新视图。
#### VirtualDom真的快吗
VirtualDom最常被提及的优势就是它的效率高，原因是对js对象的操作要比对原生dom的操作要快很多，有了虚拟dom，我们更新视图前可以比较两颗虚拟dom树的差异，只更新差异部分，减少了对真正dom节点的操作，所以提高了效率。

然而事实上是不一定的，我们必须知道建立虚拟dom树本身和比较差异都是需要消耗时间的，如果不采用virtualdom，我们更新视图一般用innerHtml方法。这两种方法的更新时间可以粗略表示如下：
**innerHtml**:渲染成htmlstring + 重新创建所有dom

**VirtualDom**:渲染成VirtualDom + 比较新旧Dom树差异 + 必要dom更新

所以两者的快慢实际取决于需要渲染的界面大小和更新部分的多少，可以看出innerHtml这种重新创建所有的dom的方式在只有几行数据改变时可能会造成大量浪费，所以从整体来看VirtualDom更优，但如果只是渲染静态界面，则innerHtml反而更快。
#### VirtualDom实现
一个简单VirtualDom机制，只需分为3个部分，第一步是建立VirtualDom树，第二步是设计比较新旧两个树之间差异的算法，最后一步是将差异更新到真正的视图部分。
##### 创建VirtualDom树
这一步比较直观简单，就是将dom树用js对象来模拟。这里我们使用构造函数来生成一颗虚拟的dom树，它有标签（tagName），属性(props)和子树(children)三个参数，通过前两个参数可以模拟出大部分类型的dom节点，而通过第三个参数则可以把dom节点组合成dom树。具体实现代码如下：
``` javaScript
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
```
在构建好虚拟dom树之后，还需要有一个方法将虚拟dom树渲染成真正的dom树，为了使用方便我们将这个方法并入到VirtualDom类中，其具体代码实现如下：
```javaScript
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
```
##### 比较两颗树的差异
这是整个VirtualDom机制的核心部分，当我们去更新视图时，我们其实是先建立好新的VirtualDom树然后将新的树与旧树进行对比，并记录所有差异部分。
##### 更新差异部分
