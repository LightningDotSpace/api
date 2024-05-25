// Cron Patterns
// -------------
// - `*` Asterisks: Any value
// - `1-3,5` Ranges: Ranges and individual values
// - `*/2` Steps: Every two units

// field          allowed values
// -----          --------------
// second         0-59
// minute         0-59
// hour           0-23
// day of month   1-31
// month          1-12 (or names, see below)
// day of week    0-7 (0 or 7 is Sunday, or use names)

export enum CronExpression {
  EVERY_SECOND = '* * * * * *',
  EVERY_5_SECONDS = '*/5 * * * * *',
  EVERY_MINUTE = '*/1 * * * *',
  EVERY_5_MINUTES = '0 */5 * * * *',
}
