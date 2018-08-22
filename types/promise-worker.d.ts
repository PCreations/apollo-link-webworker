declare module "promise-worker" {
  type MyPromise<T> = Promise<T>;

  /**
   * A wrapper class to promisify web workers
   */
  class PromiseWorker {
    private _worker: Worker;
    private _callbacks: { [key: number]: (error: any, result: any) => any };

    /**
     * Pass in the worker instance to promisify
     */
    constructor(worker: Worker);

    /**
     * Send a message to the worker
     *
     * The message you send can be any object, array, string, number, etc.
     * Note that the message will be `JSON.stringify`d, so you can't send functions, `Date`s, custom classes, etc.
     */
    public postMessage(userMessage: any): MyPromise<void>;
  }

  export = PromiseWorker;
}

declare module "promise-worker/register" {
  function registerPromiseWorker(callback: (message: any) => any): void;

  export = registerPromiseWorker;
}
