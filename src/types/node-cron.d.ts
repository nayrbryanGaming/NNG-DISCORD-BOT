declare module 'node-cron' {
  interface ScheduleOptions {
    scheduled?: boolean;
    timezone?: string;
  }

  interface Task {
    start(): Task;
    stop(): Task;
    destroy(): void;
    status: string;
  }

  function schedule(
    expression: string,
    callback: () => void,
    options?: ScheduleOptions
  ): Task;

  function validate(expression: string): boolean;

  export { schedule, validate, Task, ScheduleOptions };
}
