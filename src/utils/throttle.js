export function throttle(fn, wait) {
  let last = 0;
  let timer = null;
  let lastArgs = null;

  return function throttled(...args) {
    const now = Date.now();
    const remaining = wait - (now - last);
    lastArgs = args;

    if (remaining <= 0) {
      last = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        last = Date.now();
        fn.apply(this, lastArgs);
      }, remaining);
    }
  };
}

export function debounce(fn, wait) {
  let timer = null;

  return function debounced(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, wait);
  };
}
