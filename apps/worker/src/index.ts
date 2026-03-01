const intervalMs = 60_000;

console.log('worker starting');
console.log('worker alive');

setInterval(() => {
  console.log('worker alive');
}, intervalMs);
