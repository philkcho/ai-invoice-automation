/**
 * 토큰 저장소 — access token만 메모리 관리
 *
 * - access_token: 메모리에 보관 (XSS로 직접 접근 불가)
 * - refresh_token: 서버가 HttpOnly 쿠키로 관리 (JS 접근 불가)
 * - sessionStorage: 페이지 새로고침 시 access_token 복원용 (탭 닫으면 자동 삭제)
 */

const SESSION_KEY_ACCESS = '__at';

let _accessToken: string | null = null;

function _isClient(): boolean {
  return typeof window !== 'undefined';
}

export const tokenStore = {
  /** 로그인 응답에서 access_token 저장 */
  setAccessToken(accessToken: string) {
    _accessToken = accessToken;
    if (_isClient()) {
      try {
        sessionStorage.setItem(SESSION_KEY_ACCESS, accessToken);
      } catch {
        // private browsing 등에서 sessionStorage 차단 시 무시
      }
    }
  },

  /** 하위 호환: setTokens(access, refresh) 호출 시 access만 저장 */
  setTokens(accessToken: string, _refreshToken?: string) {
    this.setAccessToken(accessToken);
  },

  getAccessToken(): string | null {
    if (_accessToken) return _accessToken;
    if (_isClient()) {
      try {
        _accessToken = sessionStorage.getItem(SESSION_KEY_ACCESS);
      } catch {
        // ignore
      }
    }
    return _accessToken;
  },

  /** @deprecated refresh token은 HttpOnly 쿠키로 관리됨 */
  getRefreshToken(): string | null {
    return null;
  },

  clear() {
    _accessToken = null;
    if (_isClient()) {
      try {
        sessionStorage.removeItem(SESSION_KEY_ACCESS);
      } catch {
        // ignore
      }
    }
  },
};
