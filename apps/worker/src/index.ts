const intervalMs = 60_000;

const emailEnabled = process.env.EMAIL_ENABLED === 'true';
const hasPostmarkToken = Boolean(process.env.POSTMARK_API_TOKEN);

if (!emailEnabled) {
  console.warn('EMAIL_ENABLED is false; email sending is disabled.');
} else if (!hasPostmarkToken) {
  console.warn('POSTMARK_API_TOKEN is missing; email sending is disabled.');
}

console.log('worker starting');
console.log('worker alive');

setInterval(() => {
  console.log('worker alive');
}, intervalMs);
