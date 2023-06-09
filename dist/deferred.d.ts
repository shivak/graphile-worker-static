export interface Deferred<T = void> extends Promise<T> {
    resolve: (result?: T | PromiseLike<T>) => void;
    reject: (error: Error) => void;
}
export default function defer<T = void>(): Deferred<T>;
