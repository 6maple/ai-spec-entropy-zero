/**
 * 在未登录或 token 失效收到 HTTP 401 时跳转登录页。
 * 由 App 内挂载的桥接组件注册 navigate，避免在非 Router 上下文调用 Hooks。
 */

let navigatorFn: (() => void) | null = null;

export function registerUnauthorizedNavigator(fn: (() => void) | null) {
  navigatorFn = fn;
}

export function navigateToLoginForUnauthorized(): void {
  try {
    if (navigatorFn) {
      navigatorFn();
      return;
    }
    if (typeof window !== 'undefined') {
      window.location.assign('/auth/login');
    }
  } catch {
    /* ignore */
  }
}
