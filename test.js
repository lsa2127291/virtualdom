function A () {};
var a = new A();
console.log(a instanceof A);
var b = [1, 2, 3];
var c = b.forEach(function (b1) {
  return b1++;
});
console.log(c);
// console.log(null.tagName);
function vaoi () {
  return  666;
}
console.log(vaoi());
var a = [1, 2, 3];
var b = a;
var c = a.slice(0);
b[1] = 3;
c[2] = 5;
console.log(a);
console.log(b);
console.log(c);
function dfs (walker, num) {
  if (num === 0) {
    return 0;
  }
  for (var i = 0; i < num; i++) {
    walker.index++;
    console.log(walker.index);
    dfs(walker, num - 1);
  }
}
dfs({index: 0}, 3);
console.log(a.splice(0, 0, 1));
console.log(undefined === undefined);
function isArray (item) {
  return Object.prototype.toString.call(item) === '[object Array]';
}
console.log(Object.prototype.toString.call([0, 1, 2]));
d = [1, 2, 3];
d.splice(1, 1);
console.log(d);
