// NOTE: Not Used Yet
export function validateKeyPattern(p: any, k: any) {
  var isValid = false;
  var ret = [];
  var str = "";

  if (p == 0) {
    str = String(p);
    for (var i = 0; i < k; i++) {
      ret.push(i);
    }
    isValid = true;
  } else if (p == 1) {
    str = String(p);
    for (var i = 1; i <= k; i++) {
      ret.push(k - i);
    }
    isValid = true;
  } else {
    var ar = p.split("");
    if (ar.length == k) {
      ar = ar.filter(function (x: any, i: any, self: any) {
        return self.indexOf(x) === i && x >= 1 && x <= k;
      });
      if (ar.length == k) {
        ret = [];
        str = "";
        for (var i = 0; i < k; i++) {
          ret.push(ar[i] - 1);
          str += ar[i];
        }
        isValid = true;
      }
    }
  }
  return [isValid, ret, str];
}
