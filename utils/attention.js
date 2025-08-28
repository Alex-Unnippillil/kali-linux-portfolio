export const requestAttention = (appId, badge = 1) => {
  window.dispatchEvent(new CustomEvent('app-attention', { detail: { appId, badge } }))
}

export const clearAttention = (appId) => {
  window.dispatchEvent(new CustomEvent('app-attention', { detail: { appId, badge: 0 } }))
}
