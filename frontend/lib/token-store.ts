/**
 * 토큰 저장소 — XSS 방어를 위해 메모리 우선, sessionStorage fallback
 *
 * - access_token: 메모리에 보관 (XSS로 직접 접근 불가)
 * - refresh_token: 메모리에 보관
 * - sessionStorage: 페이지 새로고침 시 복원용 (탭 닫으면 자동 삭제)
 *
 * 프로덕션에서는 httpOnly cookie 방식으로 전환 권장
 */

const SESSION_KEY_ACCESS = '__at';
const SESSION_KEY_REFRESH = '__rt';

let _accessToken: string | null = null;
let _refreshToken: string | null = null;

function _isClient(): boolean {
  return typeof window !== 'undefined';
}

export const tokenStore = {
  setTokens(accessToken: string, refreshToken: string) {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
    if (_isClient()) {
      try {
        sessionStorage.setItem(SESSION_KEY_ACCESS, accessToken);
        sessionStorage.setItem(SESSION_KEY_REFRESH, refreshToken);
      } catch {
        // private browsing 등에서 sessionStorage 차단 시 무시
      }
    }
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

  getRefreshToken(): string | null {
    if (_refreshToken) return _refreshToken;
    if (_isClient()) {
      try {
        _refreshToken = sessionStorage.getItem(SESSION_KEY_REFRESH);
      } catch {
        // ignore
      }
    }
    return _refreshToken;
  },

  clear() {
    _accessToken = null;
    _refreshToken = null;
    if (_isClient()) {
      try {
        sessionStorage.removeItem(SESSION_KEY_ACCESS);
        sessionStorage.removeItem(SESSION_KEY_REFRESH);
      } catch {
        // ignore
      }
    }
  },
};
